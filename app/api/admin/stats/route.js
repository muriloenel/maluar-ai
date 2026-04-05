import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

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

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (!supabaseServiceKey) {
      return Response.json({ error: 'Service key não configurada' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Métricas agregadas
    const [
      profilesRes,
      chatsRes,
      messagesRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id, name, plan, level, messages_today, created_at', { count: 'exact' }),
      supabase.from('chats').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
    ]);

    const profiles = profilesRes.data || [];
    const totalUsers = profiles.length;
    const planCounts = { free: 0, pro: 0, premium: 0 };
    const levelCounts = { iniciante: 0, intermediario: 0, avancada: 0 };
    let totalMessagesToday = 0;

    for (const p of profiles) {
      planCounts[p.plan] = (planCounts[p.plan] || 0) + 1;
      levelCounts[p.level] = (levelCounts[p.level] || 0) + 1;
      totalMessagesToday += p.messages_today || 0;
    }

    // Últimos 10 usuários cadastrados
    const recentUsers = profiles
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(p => ({ name: p.name, plan: p.plan, level: p.level, createdAt: p.created_at }));

    return Response.json({
      totalUsers,
      totalChats: chatsRes.count || 0,
      totalMessages: messagesRes.count || 0,
      totalMessagesToday,
      planCounts,
      levelCounts,
      recentUsers,
    });
  } catch (err) {
    console.error('[ADMIN] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
