import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/admin';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return Response.json({ error: 'session_id inválido' }, { status: 400 });
    }

    if (!STRIPE_SECRET || !supabaseServiceKey) {
      return Response.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    // Buscar sessão diretamente no Stripe
    const res = await fetch(`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
    });
    const session = await res.json();

    if (session.error || session.payment_status !== 'paid') {
      return Response.json({ plan: 'free', status: session.payment_status || 'unknown' });
    }

    // Validar que essa sessão pertence ao usuário logado
    const sessionUserId = session.metadata?.user_id || session.client_reference_id;
    if (sessionUserId !== user.id) {
      return Response.json({ error: 'Sessão não pertence a este usuário' }, { status: 403 });
    }

    const plan = session.metadata?.plan;
    if (!plan) {
      return Response.json({ plan: 'free', status: 'no_plan_metadata' });
    }

    // Ativar plano proativamente (não depender do webhook)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile && profile.plan !== plan) {
      await supabase
        .from('profiles')
        .update({
          plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return Response.json({ plan, status: 'paid' });
  } catch (err) {
    console.error('[VERIFY-SESSION] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
