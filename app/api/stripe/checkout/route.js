import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_API = 'https://api.stripe.com/v1';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maluar-ai.vercel.app';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      return Response.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { plan } = await req.json();
    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      return Response.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Criar Checkout Session no Stripe
    const session = await stripeRequest('/checkout/sessions', {
      'payment_method_types[]': 'card',
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${APP_URL}?checkout=success`,
      'cancel_url': `${APP_URL}?checkout=cancel`,
      'client_reference_id': user.id,
      'customer_email': user.email,
      'metadata[user_id]': user.id,
      'metadata[plan]': plan,
    });

    if (session.error) {
      console.error('[STRIPE] Checkout error:', session.error);
      return Response.json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[STRIPE] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
