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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Health: testar apenas Haiku (mais rápido e barato, <500ms)
  // Para teste completo de todos os modelos, usar /api/admin/stats
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ok' }],
    });
    results.anthropic = {
      status: 'OK',
      model: 'claude-haiku-4-5',
      response: response.content?.[0]?.text || 'sem texto',
    };
  } catch (err) {
    results.anthropic = {
      status: 'ERRO',
      model: 'claude-haiku-4-5',
      errorStatus: err?.status,
      errorMessage: err?.error?.message?.slice(0, 100) || err?.message?.slice(0, 100),
    };
  }

  const ok = results.anthropic?.status === 'OK';
  return Response.json(results, { status: ok ? 200 : 500 });
}
