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
    'claude-haiku-4-5',
    'claude-haiku-4-5-20251001',
    'claude-3-5-haiku-latest',
  ];

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const modelResults = [];

  for (const model of modelsToTry) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 20,
        messages: [{ role: 'user', content: 'Diga apenas "ok"' }],
      });
      modelResults.push({
        model,
        status: 'OK',
        response: response.content?.[0]?.text || 'sem texto',
      });
    } catch (err) {
      modelResults.push({
        model,
        status: 'ERRO',
        errorStatus: err?.status,
        errorType: err?.error?.type,
        errorMessage: err?.error?.message?.slice(0, 100) || err?.message?.slice(0, 100),
      });
    }
  }

  results.anthropic = {
    status: modelResults.some(m => m.status === 'OK') ? 'OK' : 'ERRO',
    models: modelResults,
  };

  return Response.json(results);
}
