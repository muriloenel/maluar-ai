import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://maluarai.com.br').trim();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

async function getAuthUser(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token || !supabaseUrl) return null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function POST(req) {
  try {
    if (!STRIPE_SECRET || !supabaseServiceKey) {
      return Response.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar stripe_customer_id do perfil
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'Nenhuma assinatura encontrada' }, { status: 404 });
    }

    // Criar sessão do Billing Portal
    const res = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: profile.stripe_customer_id,
        return_url: APP_URL,
      }).toString(),
    });

    const session = await res.json();
    if (session.error) {
      console.error('[STRIPE PORTAL]', session.error);
      return Response.json({ error: 'Erro ao abrir portal de pagamento' }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[STRIPE PORTAL] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
