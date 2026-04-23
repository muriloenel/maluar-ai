import { getAuthUser } from '../../../../lib/admin';
import { checkoutSchema, parseBody } from '../../../../lib/validation';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';

function getAppUrl(req) {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (envUrl && envUrl.startsWith('http')) return envUrl.replace(/\/$/, '');
  const host = req.headers.get('host');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  return 'https://maluarai.com.br';
}

// Preços dos planos (criar no Stripe Dashboard)
const PLAN_PRICES = {
  pro: (process.env.STRIPE_PRICE_PRO || '').trim(),
  premium: (process.env.STRIPE_PRICE_PREMIUM || '').trim(),
};

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
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!STRIPE_SECRET) {
      console.error('[STRIPE] STRIPE_SECRET_KEY não configurada');
      return Response.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    // Debug: verificar que a chave não tem caracteres invisíveis
    if (!STRIPE_SECRET.startsWith('sk_live_') && !STRIPE_SECRET.startsWith('sk_test_') && !STRIPE_SECRET.startsWith('rk_live_')) {
      console.error('[STRIPE] Chave inválida — prefix:', JSON.stringify(STRIPE_SECRET.substring(0, 20)));
      return Response.json({ error: 'Chave Stripe inválida' }, { status: 500 });
    }

    const body = await req.json();
    const { error: validationError, data: validated } = parseBody(checkoutSchema, body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }
    const { plan } = validated;
    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      console.error(`[STRIPE] Price ID não configurado para plano "${plan}"`);
      return Response.json({ error: 'Preço não configurado para este plano' }, { status: 400 });
    }

    const appUrl = getAppUrl(req);
    const successUrl = `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}?checkout=cancel`;

    // Criar Checkout Session no Stripe
    // Boleto precisa ser listado explicitamente em payment_method_types
    const session = await stripeRequest('/checkout/sessions', {
      'mode': 'subscription',
      'currency': 'brl',
      'payment_method_types[0]': 'card',
      'payment_method_types[1]': 'boleto',
      'payment_method_options[boleto][expires_after_days]': '3',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl,
      'cancel_url': cancelUrl,
      'client_reference_id': user.id,
      'customer_email': user.email,
      'metadata[user_id]': user.id,
      'metadata[plan]': plan,
      'subscription_data[metadata][plan]': plan,
      'subscription_data[metadata][user_id]': user.id,
    });

    if (session.error) {
      console.error('[STRIPE] Checkout error:', JSON.stringify(session.error));
      return Response.json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[STRIPE] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
