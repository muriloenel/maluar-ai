import { requireAdmin, getServiceClient } from '../../../../lib/admin';
import crypto from 'crypto';

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
    const levelFilter = url.searchParams.get('level') || '';
    const dateFrom = url.searchParams.get('dateFrom') || '';
    const dateTo = url.searchParams.get('dateTo') || '';
    const sortField = url.searchParams.get('sort') || 'created_at';
    const sortDir = url.searchParams.get('dir') || 'desc';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('profiles')
      .select('id, name, level, plan, status, phone, messages_today, stripe_customer_id, stripe_subscription_id, created_at, updated_at', { count: 'exact' });

    if (planFilter) query = query.eq('plan', planFilter);
    if (statusFilter) query = query.eq('status', statusFilter);
    if (levelFilter) query = query.eq('level', levelFilter);
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

    // Buscar emails dos auth.users via admin API (antes do filtro por nome/email)
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    let emailMap = {};
    if (authData?.users) {
      for (const au of authData.users) {
        emailMap[au.id] = au.email;
      }
    }

    if (search) {
      const safeSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      // Buscar IDs que batem pelo email ou telefone
      const emailMatchIds = Object.entries(emailMap)
        .filter(([, email]) => email?.toLowerCase().includes(search))
        .map(([id]) => id);

      // Incluir busca por telefone
      const phoneSearch = search.replace(/\D/g, '');
      let orFilters = [`name.ilike.%${safeSearch}%`];
      if (phoneSearch.length >= 3) {
        orFilters.push(`phone.ilike.%${phoneSearch}%`);
      }
      if (emailMatchIds.length > 0) {
        orFilters.push(`id.in.(${emailMatchIds.join(',')})`);
      }
      query = query.or(orFilters.join(','));
    }

    // Ordenação segura
    const allowedSorts = ['created_at', 'name', 'messages_today', 'plan', 'level'];
    const safeSortField = allowedSorts.includes(sortField) ? sortField : 'created_at';
    const ascending = sortDir === 'asc';
    query = query.order(safeSortField, { ascending }).range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;
    if (error) throw error;

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
      case 'resetPassword': {
        // Buscar email do usuário
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId);
        if (authErr || !authUser?.user?.email) {
          return Response.json({ error: 'Usuário não encontrado no auth' }, { status: 404 });
        }
        const { error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: authUser.user.email,
        });
        if (linkErr) throw linkErr;
        return Response.json({ success: true, action, userId, message: `Email de recuperação enviado para ${authUser.user.email}` });
      }
      case 'deleteUser': {
        // Deletar perfil do banco
        const { error: profileErr } = await supabase.from('profiles').delete().eq('id', userId);
        if (profileErr) throw profileErr;
        // Deletar do auth
        const { error: authDelErr } = await supabase.auth.admin.deleteUser(userId);
        if (authDelErr) throw authDelErr;
        return Response.json({ success: true, action, userId });
      }
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

export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const body = await req.json();
    const { name, email, phone } = body;

    if (!name?.trim() || !email?.trim()) {
      return Response.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }

    // Gerar senha aleatória segura (8 chars: letras + números)
    const password = crypto.randomBytes(6).toString('base64url').slice(0, 8);

    // Criar usuário no Supabase Auth com email já confirmado
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        phone: phone?.replace(/\D/g, '') || '',
        level: 'iniciante',
      },
    });

    if (authError) {
      console.error('[ADMIN/USERS] Create auth error:', authError.message);
      if (authError.message?.includes('already been registered') || authError.message?.includes('already registered')) {
        return Response.json({ error: 'Este email já está cadastrado' }, { status: 409 });
      }
      return Response.json({ error: authError.message }, { status: 400 });
    }

    if (!authData?.user?.id) {
      return Response.json({ error: 'Erro ao criar usuário no auth' }, { status: 500 });
    }

    // Criar perfil na tabela profiles
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      name: name.trim(),
      phone: phone?.replace(/\D/g, '') || null,
      level: 'iniciante',
      plan: 'free',
      status: 'active',
      messages_today: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileError) {
      console.error('[ADMIN/USERS] Create profile error:', profileError.message);
      // Ainda retorna sucesso pois o auth user foi criado
    }

    return Response.json({
      success: true,
      userId: authData.user.id,
      password,
    });
  } catch (err) {
    console.error('[ADMIN/USERS] POST Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
