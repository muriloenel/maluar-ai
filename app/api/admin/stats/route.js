import { requireAdmin, getServiceClient } from '../../../../lib/admin';

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

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
      .map(p => ({ name: p.name, plan: p.plan, level: p.level, status: p.status || 'active', createdAt: p.created_at }));

    // Contagem de status
    const statusCounts = { active: 0, inactive: 0 };
    for (const p of profiles) {
      const s = p.status || 'active';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // Cálculo de receita (MRR)
    const PRICES = { free: 0, pro: 29.90, premium: 59.90 };
    const mrr = profiles.reduce((sum, p) => sum + (PRICES[p.plan] || 0), 0);
    const conversionRate = totalUsers > 0 ? ((planCounts.pro + planCounts.premium) / totalUsers * 100).toFixed(1) : 0;

    // Novos usuários últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersWeek = profiles.filter(p => new Date(p.created_at) >= sevenDaysAgo).length;

    // Custo IA do último mês (se usage_logs existir)
    let monthlyCost = null;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: usageLogs } = await supabase
        .from('usage_logs')
        .select('cost_usd')
        .gte('created_at', thirtyDaysAgo.toISOString());
      if (usageLogs) {
        monthlyCost = usageLogs.reduce((sum, l) => sum + parseFloat(l.cost_usd || 0), 0);
        monthlyCost = Math.round(monthlyCost * 100) / 100;
      }
    } catch {}

    return Response.json({
      totalUsers,
      totalChats: chatsRes.count || 0,
      totalMessages: messagesRes.count || 0,
      totalMessagesToday,
      planCounts,
      levelCounts,
      statusCounts,
      recentUsers,
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        conversionRate: parseFloat(conversionRate),
        monthlyCost,
        margin: monthlyCost !== null ? Math.round((mrr - monthlyCost) * 100) / 100 : null,
      },
      newUsersWeek,
    });
  } catch (err) {
    console.error('[ADMIN] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
