import { requireAdmin, getServiceClient } from '../../../../lib/admin';

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Buscar logs do período
    const { data: logs, error } = await supabase
      .from('usage_logs')
      .select('model, input_tokens, output_tokens, cost_usd, feature, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    // Agregar por dia
    const dailyMap = {};
    const modelCounts = {};
    const featureCounts = {};
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const log of (logs || [])) {
      const day = log.created_at.slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, cost: 0, requests: 0, inputTokens: 0, outputTokens: 0 };
      dailyMap[day].cost += parseFloat(log.cost_usd || 0);
      dailyMap[day].requests += 1;
      dailyMap[day].inputTokens += log.input_tokens || 0;
      dailyMap[day].outputTokens += log.output_tokens || 0;

      modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
      featureCounts[log.feature] = (featureCounts[log.feature] || 0) + 1;

      totalCost += parseFloat(log.cost_usd || 0);
      totalInputTokens += log.input_tokens || 0;
      totalOutputTokens += log.output_tokens || 0;
    }

    const dailyUsage = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Custo médio por dia
    const activeDays = dailyUsage.length || 1;
    const avgDailyCost = totalCost / activeDays;

    return Response.json({
      period: { days, since: since.toISOString() },
      totals: {
        requests: (logs || []).length,
        cost: Math.round(totalCost * 100) / 100,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        avgDailyCost: Math.round(avgDailyCost * 100) / 100,
        projectedMonthlyCost: Math.round(avgDailyCost * 30 * 100) / 100,
      },
      modelBreakdown: modelCounts,
      featureBreakdown: featureCounts,
      dailyUsage,
    });
  } catch (err) {
    console.error('[ADMIN/USAGE] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
