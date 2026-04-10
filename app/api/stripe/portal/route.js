import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/admin';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://maluarai.com.br').trim();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!STRIPE_SECRET || !supabaseServiceKey) {
      return Response.json({ error: 'Stripe não configurado' }, { status: 500 });
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
