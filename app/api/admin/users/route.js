import { requireAdmin, getServiceClient } from '../../../../lib/admin';

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const planFilter = url.searchParams.get('plan') || '';
    const statusFilter = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('profiles')
      .select('id, name, level, plan, status, phone, messages_today, stripe_customer_id, stripe_subscription_id, created_at, updated_at', { count: 'exact' });

    if (planFilter) query = query.eq('plan', planFilter);
    if (statusFilter) query = query.eq('status', statusFilter);
    if (search) {
      const safeSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`name.ilike.%${safeSearch}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;
    if (error) throw error;

    // Buscar emails dos auth.users via admin API
    const userIds = (users || []).map(u => u.id);
    let emailMap = {};
    if (userIds.length > 0) {
      // Buscar todos os auth users (service role)
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (authData?.users) {
        for (const au of authData.users) {
          emailMap[au.id] = au.email;
        }
      }
    }

    const enrichedUsers = (users || []).map(u => ({
      ...u,
      email: emailMap[u.id] || null,
    }));

    return Response.json({
      users: enrichedUsers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('[ADMIN/USERS] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const body = await req.json();
    const { userId, action, value } = body;

    if (!userId || !action) {
      return Response.json({ error: 'userId e action são obrigatórios' }, { status: 400 });
    }

    const updates = {};
    switch (action) {
      case 'activate':
        updates.status = 'active';
        break;
      case 'deactivate':
        updates.status = 'inactive';
        break;
      case 'changePlan':
        if (!['free', 'pro', 'premium'].includes(value)) {
          return Response.json({ error: 'Plano inválido' }, { status: 400 });
        }
        updates.plan = value;
        break;
      case 'resetMessages':
        updates.messages_today = 0;
        updates.messages_reset_at = new Date().toISOString();
        break;
      default:
        return Response.json({ error: 'Ação inválida' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;

    return Response.json({ success: true, action, userId });
  } catch (err) {
    console.error('[ADMIN/USERS] PATCH Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
