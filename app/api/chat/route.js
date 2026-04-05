import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Workaround para proxy corporativo — APENAS em desenvolvimento
if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_SELF_SIGNED_CERTS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Supabase admin client para validar tokens
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Limites por plano
const DAILY_LIMITS = { free: 50, pro: 150, premium: 9999 };
const UNLIMITED_EMAILS = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Verificação server-side de quota (bloqueante)
async function checkQuotaServer(userId, userEmail) {
  if (!userId || !supabaseUrl || !supabaseServiceKey) return { allowed: true };
  if (userEmail && UNLIMITED_EMAILS.includes(userEmail.toLowerCase())) return { allowed: true };

  try {
    const sb = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await sb.from('profiles').select('plan, messages_today, messages_reset_at').eq('id', userId).single();
    if (!profile) return { allowed: true };

    const limit = DAILY_LIMITS[profile.plan] || DAILY_LIMITS.free;
    const now = new Date();
    const resetAt = profile.messages_reset_at ? new Date(profile.messages_reset_at) : new Date(0);
    const isNewDay = now.toDateString() !== resetAt.toDateString();

    if (isNewDay) {
      await sb.from('profiles').update({ messages_today: 0, messages_reset_at: now.toISOString() }).eq('id', userId);
      return { allowed: true, remaining: limit, limit, plan: profile.plan };
    }

    const remaining = Math.max(0, limit - (profile.messages_today || 0));
    return { allowed: remaining > 0, remaining, limit, plan: profile.plan };
  } catch (err) {
    console.error('[QUOTA] Erro ao verificar:', err.message);
    return { allowed: true }; // fail-open se DB falhar
  }
}

async function validateAuth(req) {
  if (!supabaseUrl || !supabaseKey) {
    console.error('[AUTH] Supabase URL ou Key não configuradas');
    return null;
  }
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[AUTH] Header Authorization ausente ou inválido');
    return null;
  }
  const token = authHeader.slice(7);
  if (!token) {
    console.error('[AUTH] Token vazio');
    return null;
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('[AUTH] getUser error:', error.message);
      return null;
    }
    if (!data?.user) {
      console.error('[AUTH] getUser retornou sem user');
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('[AUTH] Exception:', err.message);
    return null;
  }
}

const hasImage = (messages) =>
  messages.some(
    (m) => Array.isArray(m.content) && m.content.some((c) => c.type === 'image')
  );

// Rate limiter em memória — diferenciado por plano
const rateLimitMap = new Map();
const RATE_LIMITS_BY_PLAN = { free: 15, pro: 30, premium: 60 };
const RATE_WINDOW = 60_000;

function checkRateLimit(ip, plan = 'free') {
  const limit = RATE_LIMITS_BY_PLAN[plan] || RATE_LIMITS_BY_PLAN.free;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    if (rateLimitMap.size > 100) {
      for (const [key, val] of rateLimitMap) {
        if (now > val.reset) rateLimitMap.delete(key);
      }
    }
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function POST(req) {
  try {
    // Autenticação — opcional (modo convidado permitido)
    const authUser = await validateAuth(req).catch(() => null);
    if (!authUser) {
      console.warn('[AUTH] Sem autenticação — modo convidado');
    }

    // Verificar quota server-side (BLOQUEANTE)
    let userPlan = 'free';
    if (authUser) {
      const quota = await checkQuotaServer(authUser.id, authUser.email);
      userPlan = quota.plan || 'free';
      if (!quota.allowed) {
        return Response.json(
          { error: 'Limite diário atingido', quota: { remaining: 0, limit: quota.limit } },
          { status: 429 }
        );
      }
    }

    // Rate limiting — diferenciado por plano
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || authUser?.id || 'anonymous';
    if (!checkRateLimit(ip, userPlan)) {
      return Response.json(
        { error: 'Muitas requisições. Aguarde um momento antes de tentar novamente.' },
        { status: 429 }
      );
    }

    const { messages, system, stream } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Mensagens inválidas' }, { status: 400 });
    }

    // Limitar tamanho do payload para evitar abuso
    if (messages.length > 20) {
      return Response.json({ error: 'Limite de mensagens por requisição excedido' }, { status: 400 });
    }

    // Limitar tamanho do system prompt
    const safeSystem = typeof system === 'string' ? system.slice(0, 15000) : '';

    // Validar estrutura das mensagens
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return Response.json({ error: 'Mensagem com role inválido' }, { status: 400 });
      }
      if (!msg.content) {
        return Response.json({ error: 'Mensagem sem conteúdo' }, { status: 400 });
      }
      // Limitar tamanho do texto individual (ignorar blocos de imagem)
      let textLength = 0;
      if (typeof msg.content === 'string') {
        textLength = msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') textLength += (block.text || '').length;
        }
      }
      if (textLength > 50000) {
        return Response.json({ error: 'Mensagem muito longa' }, { status: 400 });
      }
    }

    const imageRequest = hasImage(messages);

    // Streaming mode
    if (stream) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: imageRequest ? 3000 : 1500,
        temperature: imageRequest ? 0.1 : 0.5,
        system: safeSystem,
        messages,
        stream: true,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of response) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming mode (used by PostGenerator)
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: hasImage(messages) ? 2048 : 1500,
      system: safeSystem,
      messages,
    });

    return Response.json({
      content: response.content,
    });
  } catch (error) {
    console.error('Erro na API:', error);

    const errorMessage = error?.error?.error?.message || error?.message || '';
    const isCredits = errorMessage.includes('credit balance');
    const isAuth = error?.status === 401;

    return Response.json(
      {
        error: isCredits
          ? 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
          : isAuth
          ? 'Erro de configuração do servidor. Contate o suporte.'
          : 'Erro ao processar mensagem',
      },
      { status: error?.status || 500 }
    );
  }
}
