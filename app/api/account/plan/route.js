import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!supabaseServiceKey) {
      return Response.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    // Usar service role para bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return Response.json({ plan: 'free' });
    }

    return Response.json({ plan: profile.plan || 'free' });
  } catch (err) {
    console.error('[PLAN] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
