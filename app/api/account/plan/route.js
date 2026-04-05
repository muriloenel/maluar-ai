import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
