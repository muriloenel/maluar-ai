import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/admin';

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY || '').trim();
const STRIPE_API = 'https://api.stripe.com/v1';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

async function stripeGet(endpoint) {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` },
  });
  return res.json();
}

export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!STRIPE_SECRET || !supabaseServiceKey) {
      return Response.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os profiles com plano pago
    const { data: paidProfiles, error } = await supabase
      .from('profiles')
      .select('id, plan, stripe_customer_id, stripe_subscription_id')
      .neq('plan', 'free');

    if (error) {
      return Response.json({ error: 'Erro ao buscar profiles' }, { status: 500 });
    }

    const results = { checked: 0, mismatches: [], fixed: 0, errors: [] };

    for (const profile of (paidProfiles || [])) {
      results.checked++;

      if (!profile.stripe_subscription_id) {
        results.mismatches.push({
          userId: profile.id,
          issue: 'Plano pago sem subscription_id',
          supabasePlan: profile.plan,
          action: 'rebaixado para free',
        });
        await supabase.from('profiles').update({ plan: 'free', updated_at: new Date().toISOString() }).eq('id', profile.id);
        results.fixed++;
        continue;
      }

      try {
        const sub = await stripeGet(`/subscriptions/${profile.stripe_subscription_id}`);

        if (sub.error) {
          results.mismatches.push({
            userId: profile.id,
            issue: `Subscription não encontrada no Stripe: ${sub.error.message}`,
            supabasePlan: profile.plan,
            action: 'rebaixado para free',
          });
          await supabase.from('profiles').update({ plan: 'free', stripe_subscription_id: null, updated_at: new Date().toISOString() }).eq('id', profile.id);
          results.fixed++;
          continue;
        }

        const activeStatuses = ['active', 'trialing', 'past_due'];
        if (!activeStatuses.includes(sub.status)) {
          results.mismatches.push({
            userId: profile.id,
            issue: `Stripe status="${sub.status}" mas Supabase plan="${profile.plan}"`,
            supabasePlan: profile.plan,
            stripeStatus: sub.status,
            action: 'rebaixado para free',
          });
          await supabase.from('profiles').update({ plan: 'free', updated_at: new Date().toISOString() }).eq('id', profile.id);
          results.fixed++;
        }
      } catch (err) {
        results.errors.push({ userId: profile.id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (err) {
    console.error('[RECONCILE] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
