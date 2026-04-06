import { requireAdmin, getServiceClient } from '../../../../lib/admin';

// API temporária para testes de quota — SOMENTE ADMIN
// Permite setar messages_today e plan de um usuário para simular limites
export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const { userId, plan, messagesToday } = await req.json();
    if (!userId) return Response.json({ error: 'userId obrigatório' }, { status: 400 });

    const updates = {};
    if (plan) updates.plan = plan;
    if (messagesToday !== undefined) updates.messages_today = messagesToday;
    updates.messages_reset_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, name, plan, messages_today, messages_reset_at')
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const LIMITS = { free: 15, pro: 150, premium: 9999 };
    const limit = LIMITS[data.plan] || 15;
    const remaining = Math.max(0, limit - data.messages_today);

    return Response.json({
      ok: true,
      profile: data,
      quota: { limit, remaining, willBlockNextMessage: remaining <= 0 }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// GET: ver estado atual da quota
export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return Response.json({ error: 'userId obrigatório' }, { status: 400 });

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, plan, messages_today, messages_reset_at')
      .eq('id', userId)
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    const LIMITS = { free: 15, pro: 150, premium: 9999 };
    const limit = LIMITS[data.plan] || 15;
    const remaining = Math.max(0, limit - (data.messages_today || 0));

    return Response.json({
      profile: data,
      quota: { limit, remaining, willBlockNextMessage: remaining <= 0 }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
