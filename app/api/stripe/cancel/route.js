import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/admin';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';

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
      .select('stripe_customer_id, plan')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'Nenhuma assinatura encontrada' }, { status: 404 });
    }

    if (profile.plan === 'free') {
      return Response.json({ error: 'Você já está no plano gratuito' }, { status: 400 });
    }

    // Buscar assinaturas ativas do customer
    const subsRes = await fetch(
      `${STRIPE_API}/subscriptions?customer=${profile.stripe_customer_id}&status=active&limit=1`,
      {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
      }
    );
    const subsData = await subsRes.json();

    if (!subsData.data || subsData.data.length === 0) {
      return Response.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 404 });
    }

    const subscription = subsData.data[0];

    // Cancelar ao final do período (usuário mantém acesso até o fim do ciclo pago)
    const cancelRes = await fetch(`${STRIPE_API}/subscriptions/${subscription.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        cancel_at_period_end: 'true',
      }).toString(),
    });

    const cancelData = await cancelRes.json();

    if (cancelData.error) {
      console.error('[STRIPE CANCEL]', cancelData.error);
      return Response.json({ error: 'Erro ao cancelar assinatura' }, { status: 500 });
    }

    // Retornar data de fim do acesso
    const periodEnd = new Date(cancelData.current_period_end * 1000);

    return Response.json({
      success: true,
      accessUntil: periodEnd.toISOString(),
      message: `Assinatura cancelada. Você mantém acesso até ${periodEnd.toLocaleDateString('pt-BR')}.`,
    });

  } catch (err) {
    console.error('[STRIPE CANCEL] Erro:', err?.message || err);
    return Response.json({ error: 'Erro interno ao cancelar assinatura' }, { status: 500 });
  }
}
