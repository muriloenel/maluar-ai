import { requireAdmin, getServiceClient } from '../../../../../lib/admin';

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'day'; // day | week | month | year

    // Buscar todos os profiles com created_at
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('created_at, plan, level')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ADMIN] registrations error:', error.message);
      return Response.json({ error: 'Erro ao buscar dados' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return Response.json({ data: [], period, total: 0 });
    }

    // Agrupar por período
    const grouped = {};
    const planGrouped = {}; // breakdown por plano
    const levelGrouped = {}; // breakdown por nível

    for (const p of profiles) {
      const date = new Date(p.created_at);
      const key = getGroupKey(date, period);

      grouped[key] = (grouped[key] || 0) + 1;

      // Por plano
      if (!planGrouped[key]) planGrouped[key] = { free: 0, pro: 0, premium: 0 };
      planGrouped[key][p.plan || 'free'] = (planGrouped[key][p.plan || 'free'] || 0) + 1;

      // Por nível
      if (!levelGrouped[key]) levelGrouped[key] = { iniciante: 0, intermediario: 0, avancada: 0 };
      levelGrouped[key][p.level || 'iniciante'] = (levelGrouped[key][p.level || 'iniciante'] || 0) + 1;
    }

    // Converter para array ordenado
    const sortedKeys = Object.keys(grouped).sort();

    // Limitar conforme período para não poluir o gráfico
    const maxItems = period === 'day' ? 30 : period === 'week' ? 24 : period === 'month' ? 12 : 10;
    const recentKeys = sortedKeys.slice(-maxItems);

    const data = recentKeys.map(key => ({
      label: formatLabel(key, period),
      date: key,
      count: grouped[key],
      plans: planGrouped[key] || { free: 0, pro: 0, premium: 0 },
      levels: levelGrouped[key] || { iniciante: 0, intermediario: 0, avancada: 0 },
    }));

    // Calcular acumulado
    let cumulative = 0;
    const firstKeyDate = recentKeys.length > 0 ? recentKeys[0] : null;
    // Somar todos antes do período visível
    for (const key of sortedKeys) {
      if (key < firstKeyDate) cumulative += grouped[key];
    }

    const cumulativeData = data.map(d => {
      cumulative += d.count;
      return { ...d, cumulative };
    });

    // Calcular métricas resumo
    const totalInPeriod = data.reduce((sum, d) => sum + d.count, 0);
    const avgPerPeriod = data.length > 0 ? Math.round((totalInPeriod / data.length) * 10) / 10 : 0;
    const maxDay = data.reduce((max, d) => d.count > max.count ? d : max, { count: 0 });
    const minDay = data.reduce((min, d) => d.count < min.count ? d : min, { count: Infinity });
    if (minDay.count === Infinity) minDay.count = 0;

    // Tendência (comparar última metade vs primeira metade)
    const half = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, half).reduce((s, d) => s + d.count, 0);
    const secondHalf = data.slice(half).reduce((s, d) => s + d.count, 0);
    const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    return Response.json({
      data: cumulativeData,
      period,
      total: profiles.length,
      totalInPeriod,
      avgPerPeriod,
      maxDay: maxDay.count > 0 ? { label: maxDay.label, count: maxDay.count } : null,
      minDay: minDay.count < Infinity ? { label: minDay.label, count: minDay.count } : null,
      trend,
    });
  } catch (err) {
    console.error('[ADMIN] registrations error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function getGroupKey(date, period) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case 'day':
      return `${y}-${m}-${d}`;
    case 'week': {
      // ISO week: segunda-feira da semana
      const day = date.getDay() || 7; // 1=Mon...7=Sun
      const monday = new Date(date);
      monday.setDate(date.getDate() - day + 1);
      const wy = monday.getFullYear();
      const wm = String(monday.getMonth() + 1).padStart(2, '0');
      const wd = String(monday.getDate()).padStart(2, '0');
      return `${wy}-${wm}-${wd}`;
    }
    case 'month':
      return `${y}-${m}`;
    case 'year':
      return `${y}`;
    default:
      return `${y}-${m}-${d}`;
  }
}

function formatLabel(key, period) {
  switch (period) {
    case 'day': {
      const [, m, d] = key.split('-');
      return `${d}/${m}`;
    }
    case 'week': {
      const [, m, d] = key.split('-');
      return `Sem ${d}/${m}`;
    }
    case 'month': {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const [y, m] = key.split('-');
      return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
    }
    case 'year':
      return key;
    default:
      return key;
  }
}
