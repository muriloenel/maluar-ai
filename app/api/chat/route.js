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
const DAILY_LIMITS = { free: 15, pro: 150, premium: 9999 };
const UNLIMITED_EMAILS = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Verificação server-side de quota (bloqueante)
async function checkQuotaServer(userId, userEmail) {
  if (!userId || !supabaseUrl || !supabaseServiceKey) return { allowed: true };
  if (userEmail && UNLIMITED_EMAILS.includes(userEmail.toLowerCase())) return { allowed: true };

  try {
    const sb = createClient(supabaseUrl, supabaseServiceKey);
    // Tenta com status; se coluna não existir, tenta sem
    let profile = null;
    const { data, error } = await sb.from('profiles').select('plan, status, messages_today, messages_reset_at').eq('id', userId).single();
    if (error && error.message?.includes('status')) {
      const { data: data2 } = await sb.from('profiles').select('plan, messages_today, messages_reset_at').eq('id', userId).single();
      profile = data2 ? { ...data2, status: 'active' } : null;
    } else {
      profile = data;
    }
    if (!profile) return { allowed: true };

    // Usuário desativado
    if (profile.status === 'inactive') return { allowed: false, status: 'inactive' };

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

// Registrar uso de IA para monitoramento de custos (async, não bloqueia)
async function logUsage(userId, model, inputTokens, outputTokens, feature = 'chat') {
  if (!supabaseServiceKey || !supabaseUrl) return;
  try {
    // Custos por 1M tokens (abril 2026 - estimativas)
    const COSTS = {
      'claude-haiku-4-20250514': { input: 0.25, output: 1.25 },
      'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
      'claude-3-5-haiku-latest': { input: 0.25, output: 1.25 },
      'claude-3-5-sonnet-latest': { input: 3.0, output: 15.0 },
    };
    const rates = COSTS[model] || COSTS['claude-haiku-4-20250514'];
    const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;

    const modelShort = model.includes('haiku') ? 'haiku' : 'sonnet';
    const sb = createClient(supabaseUrl, supabaseServiceKey);
    await sb.from('usage_logs').insert({
      user_id: userId || null,
      model: modelShort,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
      feature,
    });
  } catch {}
}

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
    // Verificar se a API key está configurada
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[CHAT] ANTHROPIC_API_KEY não configurada!');
      return Response.json({ error: 'Erro de configuração do servidor. Contate o suporte.' }, { status: 500 });
    }

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

      // Checar se usuário está desativado
      if (quota.status === 'inactive') {
        return Response.json(
          { error: 'Sua conta está desativada. Entre em contato com o suporte.' },
          { status: 403 }
        );
      }

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

    // Modelo dinâmico: Haiku para msgs simples (70% mais barato), Sonnet para imagens/complexo
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastText = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
        : '';
    const isComplex = imageRequest || lastText.length > 500 || /plano de ação|diagnóstico|análise|estratégia|financeiro|business|marketing|calendário|passo a passo/i.test(lastText);
    // Lista de modelos em ordem de prioridade (fallback automático)
    const MODEL_PRIORITY = [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-latest',
    ];
    // Usar Sonnet para tudo (único modelo disponível na conta)
    const model = MODEL_PRIORITY[0];
    console.log(`[CHAT] Modelo: ${model}, Stream: ${!!stream}, User: ${authUser?.email || 'anon'}, Plan: ${userPlan}`);

    // Streaming mode
    if (stream) {
      let response;
      try {
        response = await client.messages.create({
          model,
          max_tokens: imageRequest ? 2500 : 800,
          temperature: imageRequest ? 0.1 : 0.5,
          system: safeSystem,
          messages,
          stream: true,
        });
      } catch (createErr) {
        console.error('[CHAT] Erro ao criar stream:', createErr?.status, createErr?.error?.type, createErr?.error?.message || createErr?.message || JSON.stringify(createErr));
        // Se modelo não existe (404), tentar fallbacks
        if (createErr?.status === 404 || createErr?.error?.type === 'not_found_error') {
          let fallbackWorked = false;
          for (let i = 1; i < MODEL_PRIORITY.length; i++) {
            const fallbackModel = MODEL_PRIORITY[i];
            console.log(`[CHAT] Tentando fallback modelo ${i}: ${fallbackModel}`);
            try {
              response = await client.messages.create({
                model: fallbackModel,
                max_tokens: imageRequest ? 3000 : 1200,
                temperature: imageRequest ? 0.1 : 0.5,
                system: safeSystem,
                messages,
                stream: true,
              });
              fallbackWorked = true;
              console.log(`[CHAT] Fallback ${fallbackModel} funcionou!`);
              break;
            } catch (fallbackErr) {
              console.error(`[CHAT] Fallback ${fallbackModel} falhou:`, fallbackErr?.status, fallbackErr?.error?.message || fallbackErr?.message);
              if (fallbackErr?.status !== 404) break; // Se não for 404, parar de tentar
            }
          }
          if (!fallbackWorked) {
            const errMsg = createErr?.error?.message || createErr?.message || 'modelo indisponível';
            return Response.json({ error: `Erro ao conectar com a IA: ${errMsg}` }, { status: 502 });
          }
        } else if (createErr?.status === 401) {
          console.error('[CHAT] API Key inválida ou expirada!');
          return Response.json({ error: 'Erro de configuração do servidor (API Key). Contate o suporte.' }, { status: 502 });
        } else if (createErr?.message?.includes('credit') || createErr?.error?.message?.includes('credit')) {
          console.error('[CHAT] Sem créditos na API Anthropic!');
          return Response.json({ error: 'Serviço temporariamente indisponível. Tente novamente mais tarde.' }, { status: 502 });
        } else {
          const errMsg = createErr?.error?.message || createErr?.message || 'erro desconhecido';
          console.error(`[CHAT] Erro não tratado: status=${createErr?.status}, msg=${errMsg}`);
          return Response.json({ error: `Erro ao conectar com a IA: ${errMsg}` }, { status: 502 });
        }
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            for await (const event of response) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
              }
              if (event.type === 'message_delta' && event.usage) {
                totalOutputTokens = event.usage.output_tokens || 0;
              }
              if (event.type === 'message_start' && event.message?.usage) {
                totalInputTokens = event.message.usage.input_tokens || 0;
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            // Log usage async
            logUsage(authUser?.id, model, totalInputTokens, totalOutputTokens, 'chat');
          } catch (streamErr) {
            console.error('[STREAM] Erro durante streaming:', streamErr?.message || streamErr);
            try {
              const errMsg = streamErr?.message?.includes('credit')
                ? 'Serviço temporariamente indisponível.'
                : 'Erro ao gerar resposta. Tente novamente.';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: errMsg })}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch {}
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
    let response = null;
    let usedModel = MODEL_PRIORITY[0];
    for (const tryModel of MODEL_PRIORITY) {
      try {
        response = await client.messages.create({
          model: tryModel,
          max_tokens: imageRequest ? 2048 : 1200,
          system: safeSystem,
          messages,
        });
        usedModel = tryModel;
        break;
      } catch (err) {
        console.error(`[CHAT-SYNC] Modelo ${tryModel} falhou:`, err?.status, err?.error?.message || err?.message);
        if (err?.status !== 404) throw err; // Se não for modelo inexistente, propagar erro
      }
    }
    if (!response) {
      return Response.json({ error: 'Nenhum modelo disponível. Contate o suporte.' }, { status: 502 });
    }

    // Log usage async
    logUsage(
      authUser?.id,
      usedModel,
      response.usage?.input_tokens || 0,
      response.usage?.output_tokens || 0,
      'post'
    );

    return Response.json({
      content: response.content,
    });
  } catch (error) {
    console.error('[CHAT] Erro geral:', {
      status: error?.status,
      type: error?.error?.type,
      message: error?.error?.message || error?.message,
      name: error?.name,
      stack: error?.stack?.slice(0, 300),
    });

    const errorMessage = error?.error?.error?.message || error?.error?.message || error?.message || '';
    const isCredits = errorMessage.includes('credit');
    const isAuth = error?.status === 401;

    return Response.json(
      {
        error: isCredits
          ? 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
          : isAuth
          ? 'Erro de configuração do servidor (API Key). Contate o suporte.'
          : `Erro ao processar mensagem: ${errorMessage.slice(0, 100) || 'erro interno'}`,
      },
      { status: error?.status || 500 }
    );
  }
}
