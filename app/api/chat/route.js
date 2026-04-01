import Anthropic from '@anthropic-ai/sdk';

// Workaround para proxy corporativo — APENAS em desenvolvimento
if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_SELF_SIGNED_CERTS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const hasImage = (messages) =>
  messages.some(
    (m) => Array.isArray(m.content) && m.content.some((c) => c.type === 'image')
  );

// Rate limiter simples em memória (IP-based, 15 req/min)
const rateLimitMap = new Map();
const RATE_LIMIT = 15;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
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

    // Validar estrutura das mensagens
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return Response.json({ error: 'Mensagem com role inválido' }, { status: 400 });
      }
      if (!msg.content) {
        return Response.json({ error: 'Mensagem sem conteúdo' }, { status: 400 });
      }
      // Limitar tamanho do texto individual
      const textContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      if (textContent.length > 50000) {
        return Response.json({ error: 'Mensagem muito longa' }, { status: 400 });
      }
    }

    const imageRequest = hasImage(messages);

    // Streaming mode
    if (stream) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: imageRequest ? 3000 : 600,
        temperature: imageRequest ? 0.1 : 0.7,
        system: system || '',
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
      max_tokens: hasImage(messages) ? 2048 : 600,
      system: system || '',
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
          ? 'Sem créditos na conta Anthropic. Acesse console.anthropic.com pra adicionar.'
          : isAuth
          ? 'API key inválida. Verifique o .env.local.'
          : 'Erro ao processar mensagem',
      },
      { status: error?.status || 500 }
    );
  }
}
