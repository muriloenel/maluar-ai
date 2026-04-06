import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const results = {
    timestamp: new Date().toISOString(),
    env: {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    },
    anthropic: null,
    sdkVersion: null,
  };

  // Testar SDK version
  try {
    results.sdkVersion = Anthropic.VERSION || Anthropic.prototype?.constructor?.name || 'unknown';
  } catch { results.sdkVersion = 'erro ao detectar'; }

  // Testar chamada real à API Anthropic
  if (!process.env.ANTHROPIC_API_KEY) {
    results.anthropic = { status: 'ERRO', error: 'ANTHROPIC_API_KEY não configurada' };
    return Response.json(results, { status: 500 });
  }

  // Testar modelos em ordem de prioridade
  const modelsToTry = [
    'claude-sonnet-4-20250514',
    'claude-3-5-sonnet-latest',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-latest',
  ];

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  for (const model of modelsToTry) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Diga apenas "ok"' }],
      });
      results.anthropic = {
        status: 'OK',
        model,
        response: response.content?.[0]?.text || 'sem texto',
        usage: response.usage,
        allModelsTried: modelsToTry.slice(0, modelsToTry.indexOf(model) + 1),
      };
      return Response.json(results);
    } catch (err) {
      results.anthropic = {
        status: 'ERRO',
        model,
        errorType: err?.error?.type || 'unknown',
        errorStatus: err?.status,
      };
      // Se for 401 (auth), não adianta tentar outros modelos
      if (err?.status === 401) break;
      // Se for crédito, não adianta tentar outros modelos
      if (err?.message?.includes('credit') || err?.error?.message?.includes('credit')) break;
      // Se for 404 (modelo não existe), tenta o próximo
      if (err?.status === 404) continue;
      // Qualquer outro erro, para
      break;
    }
  }

  return Response.json(results, { status: 500 });
}
