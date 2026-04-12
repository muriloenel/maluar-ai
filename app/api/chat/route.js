import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/admin';
import { chatBodySchema, parseBody } from '../../../lib/validation';

// Workaround para proxy corporativo — APENAS em desenvolvimento
if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_SELF_SIGNED_CERTS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Supabase admin client para validar tokens
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Limites por plano
const DAILY_LIMITS = { free: 15, pro: 150, premium: 9999 };
const UNLIMITED_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Supabase admin client reutilizável (connection pool)
const _adminSb = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Circuit breaker para quota check — se DB falhar N vezes seguidas, bloqueia
let _quotaFailCount = 0;
const QUOTA_FAIL_THRESHOLD = 3; // após 3 falhas consecutivas, bloqueia
const QUOTA_FAIL_RESET_MS = 60_000; // reseta contador após 1 min sem falhas
let _quotaFailResetTimer = null;

// Verificação server-side de quota (bloqueante)
async function checkQuotaServer(userId, userEmail) {
  if (!userId || !_adminSb) return { allowed: true };
  if (userEmail && UNLIMITED_EMAILS.includes(userEmail.toLowerCase())) return { allowed: true };

  // Circuit breaker aberto — bloqueia para proteger custo
  if (_quotaFailCount >= QUOTA_FAIL_THRESHOLD) {
    console.error(`[QUOTA] Circuit breaker ABERTO (${_quotaFailCount} falhas). Bloqueando requests.`);
    return { allowed: false, error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' };
  }

  try {
    // Tenta com status; se coluna não existir, tenta sem
    let profile = null;
    const { data, error } = await _adminSb.from('profiles').select('plan, status, messages_today, messages_reset_at').eq('id', userId).single();
    if (error && error.message?.includes('status')) {
      const { data: data2 } = await _adminSb.from('profiles').select('plan, messages_today, messages_reset_at').eq('id', userId).single();
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
      await _adminSb.from('profiles').update({ messages_today: 0, messages_reset_at: now.toISOString() }).eq('id', userId);
      return { allowed: true, remaining: limit, limit, plan: profile.plan };
    }

    const remaining = Math.max(0, limit - (profile.messages_today || 0));
    // Sucesso — resetar circuit breaker
    if (_quotaFailCount > 0) {
      _quotaFailCount = 0;
      clearTimeout(_quotaFailResetTimer);
    }
    return { allowed: remaining > 0, remaining, limit, plan: profile.plan };
  } catch (err) {
    console.error('[QUOTA] Erro ao verificar:', err.message);
    _quotaFailCount++;
    // Auto-reset após 1 min para re-tentar
    clearTimeout(_quotaFailResetTimer);
    _quotaFailResetTimer = setTimeout(() => { _quotaFailCount = 0; }, QUOTA_FAIL_RESET_MS);
    // Fail-closed: bloqueia para proteger custo
    if (_quotaFailCount >= QUOTA_FAIL_THRESHOLD) {
      return { allowed: false, error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.' };
    }
    return { allowed: true }; // primeiras falhas: fail-open (tolerância)
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
    // Custos por 1M tokens (Haiku 4.5: $1/$5, Sonnet 4: $3/$15)
    const COSTS = {
      'claude-haiku-4-5': { input: 1.0, output: 5.0 },
      'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
      'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
      'claude-3-5-sonnet-latest': { input: 3.0, output: 15.0 },
    };
    const rates = COSTS[model] || COSTS['claude-haiku-4-5'];
    const cost = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;

    const modelShort = model.includes('haiku') ? 'haiku' : 'sonnet';
    if (!_adminSb) return;
    await _adminSb.from('usage_logs').insert({
      user_id: userId || null,
      model: modelShort,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
      feature,
    });
  } catch (err) {
    console.error('[USAGE] Erro ao gravar usage_log:', err?.message || err);
  }
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

    // Parse body em paralelo com auth para ganhar tempo
    const bodyPromise = req.json().catch(() => null);

    // Autenticação — OBRIGATÓRIA
    const authUser = await getAuthUser(req).catch(() => null);
    if (!authUser) {
      return Response.json({ error: 'Faça login para usar o chat.' }, { status: 401 });
    }

    // Verificar quota server-side — em paralelo com parse do body
    const [quota, body] = await Promise.all([
      checkQuotaServer(authUser.id, authUser.email),
      bodyPromise,
    ]);

    let userPlan = quota.plan || 'free';

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

    // Rate limiting — prioriza userId (não spoofável) sobre IP
    const rateLimitKey = authUser?.id || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    if (!checkRateLimit(rateLimitKey, userPlan)) {
      return Response.json(
        { error: 'Muitas requisições. Aguarde um momento antes de tentar novamente.' },
        { status: 429 }
      );
    }

    // Validar body com Zod
    const { error: validationError, data: validatedBody } = parseBody(chatBodySchema, body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const messages = validatedBody.messages;
    const stream = validatedBody.stream;
    const safeSystem = (validatedBody.system || '').slice(0, 15000);

    // Garantir que primeira mensagem seja 'user' (exigência da API Claude)
    while (messages.length > 0 && messages[0].role !== 'user') {
      messages.shift();
    }
    if (messages.length === 0) {
      return Response.json({ error: 'Mensagens inválidas' }, { status: 400 });
    }

    const imageRequest = hasImage(messages);

    // Modelo dinâmico: Haiku para msgs simples (70% mais barato), Sonnet para imagens/complexo
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastText = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
        : '';
    const isComplex = imageRequest || lastText.length > 500 || /plano de ação|diagnóstico|análise|estratégia|financeiro|business|marketing|calendário|passo a passo|propaganda|post|legenda|story|stories|reels|campanha/i.test(lastText);
    // Modelos: Sonnet para complexo/imagens, Haiku para msgs simples (3x mais barato)
    const SONNET = 'claude-sonnet-4-20250514';
    const HAIKU = 'claude-haiku-4-5';
    const FALLBACKS = [SONNET, HAIKU, 'claude-3-5-sonnet-latest'];
    let model = isComplex ? SONNET : HAIKU;
    // max_tokens: curto para conversa casual, médio para complexo, alto para imagens
    const maxTokens = imageRequest ? 2000 : isComplex ? 600 : 300;
    console.log(`[CHAT] Modelo: ${model}, maxTokens: ${maxTokens}, Stream: ${!!stream}, User: ${authUser?.email || 'anon'}`);

    // Prompt caching: enviar system como bloco com cache_control
    // O system prompt é estável entre requests — alta taxa de cache hit (~90%)
    const systemBlocks = safeSystem ? [
      { type: 'text', text: safeSystem, cache_control: { type: 'ephemeral' } },
    ] : undefined;

    // Streaming mode
    if (stream) {
      let response;
      try {
        response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature: imageRequest ? 0.1 : 0.5,
          system: systemBlocks || safeSystem,
          messages,
          stream: true,
        });
      } catch (createErr) {
        console.error('[CHAT] Erro ao criar stream:', createErr?.status, createErr?.error?.type, createErr?.error?.message || createErr?.message);

        // 401 = API key inválida — não adianta tentar fallback
        if (createErr?.status === 401) {
          console.error('[CHAT] API Key inválida ou expirada!');
          return Response.json({ error: 'Erro de configuração do servidor (API Key). Contate o suporte.' }, { status: 502 });
        }
        // Créditos esgotados — não adianta tentar fallback
        if (createErr?.message?.includes('credit') || createErr?.error?.message?.includes('credit')) {
          console.error('[CHAT] Sem créditos na API Anthropic!');
          return Response.json({ error: 'Serviço temporariamente indisponível. Tente novamente mais tarde.' }, { status: 502 });
        }

        // Para QUALQUER outro erro (404, 400, 500, overloaded, etc), tentar fallbacks
        let fallbackWorked = false;
        const fallbackList = FALLBACKS.filter(m => m !== model);
        for (const fallbackModel of fallbackList) {
          console.log(`[CHAT] Tentando fallback: ${fallbackModel}`);
          try {
            response = await client.messages.create({
              model: fallbackModel,
              max_tokens: maxTokens,
              temperature: imageRequest ? 0.1 : 0.5,
              system: systemBlocks || safeSystem,
              messages,
              stream: true,
            });
            fallbackWorked = true;
            model = fallbackModel;
            console.log(`[CHAT] Fallback ${fallbackModel} funcionou!`);
            break;
          } catch (fallbackErr) {
            console.error(`[CHAT] Fallback ${fallbackModel} falhou:`, fallbackErr?.status, fallbackErr?.error?.message || fallbackErr?.message);
          }
        }
        if (!fallbackWorked) {
          const errMsg = createErr?.error?.message || createErr?.message || 'modelo indisponível';
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
    let usedModel = model;
    // Tentar modelo primário primeiro, depois fallbacks
    const tryModels = [model, ...FALLBACKS.filter(m => m !== model)];
    for (const tryModel of tryModels) {
      try {
        response = await client.messages.create({
          model: tryModel,
          max_tokens: maxTokens,
          system: systemBlocks || safeSystem,
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
