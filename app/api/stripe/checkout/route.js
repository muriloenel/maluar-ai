import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_API = 'https://api.stripe.com/v1';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getAppUrl(req) {
  // Tentar variável de ambiente primeiro (trim para remover \n ou espaços extras)
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (envUrl && envUrl.startsWith('http')) return envUrl.replace(/\/$/, '');
  // Fallback: construir a partir do header Host
  const host = req.headers.get('host');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return 'https://maluar-ai.vercel.app';
}

// Preços dos planos (criar no Stripe Dashboard)
const PLAN_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

async function getAuthUser(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token || !supabaseUrl) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function stripeRequest(endpoint, body) {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
}

export async function POST(req) {
  try {
    if (!STRIPE_SECRET) {
      console.error('[STRIPE] STRIPE_SECRET_KEY não configurada');
      return Response.json({ error: 'Stripe não configurado. Verifique STRIPE_SECRET_KEY.' }, { status: 500 });
    }

    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { plan } = await req.json();
    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      console.error(`[STRIPE] Price ID vazio para plano "${plan}". STRIPE_PRICE_PRO="${process.env.STRIPE_PRICE_PRO ? 'SET' : 'EMPTY'}", STRIPE_PRICE_PREMIUM="${process.env.STRIPE_PRICE_PREMIUM ? 'SET' : 'EMPTY'}"`);
      return Response.json({ error: `Plano inválido ou preço não configurado (${plan})` }, { status: 400 });
    }

    console.log(`[STRIPE] Criando checkout: plan=${plan}, priceId=${priceId}, user=${user.id}`);

    const appUrl = getAppUrl(req);
    const successUrl = `${appUrl}?checkout=success`;
    const cancelUrl = `${appUrl}?checkout=cancel`;
    console.log(`[STRIPE] appUrl="${appUrl}", success_url="${successUrl}"`);

    // Criar Checkout Session no Stripe
    const session = await stripeRequest('/checkout/sessions', {
      'payment_method_types[]': 'card',
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'client_reference_id': user.id,
      'customer_email': user.email,
      'metadata[user_id]': user.id,
      'metadata[plan]': plan,
    });

    console.log(`[STRIPE] Response:`, JSON.stringify(session).slice(0, 500));

    if (session.error) {
      console.error('[STRIPE] Checkout error:', JSON.stringify(session.error));
      return Response.json({ error: `Stripe: ${session.error.message || 'Erro ao criar sessão'}` }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[STRIPE] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
