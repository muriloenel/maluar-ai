import { requireAdmin, getServiceClient } from '../../../../lib/admin';
import { sendPixExpiringEmail, sendPixExpiredEmail } from '../../../../lib/email';

const PLAN_PRICES = { pro: 29.90, premium: 59.90 };

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    // Auto-expirar pagamentos vencidos e rebaixar plano
    const now = new Date().toISOString();
    const { data: expired, error: expireError } = await supabase
      .from('pix_payments')
      .select('id, user_id, plan')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (expireError) {
      console.error('[PIX] Error checking expired:', expireError.message);
      if (expireError.message?.includes('does not exist') || expireError.code === '42P01') {
        return Response.json({ error: 'Tabela pix_payments não existe. Execute a migration SQL no Supabase.' }, { status: 500 });
      }
    }

    const expiredUsers = [];
    if (expired && expired.length > 0) {
      for (const p of expired) {
        // Marcar como expirado
        await supabase
          .from('pix_payments')
          .update({ status: 'expired', updated_at: now })
          .eq('id', p.id);

        // Verificar se o usuário tem outro pagamento Pix ativo
        const { data: otherActive } = await supabase
          .from('pix_payments')
          .select('id')
          .eq('user_id', p.user_id)
          .eq('status', 'active')
          .neq('id', p.id)
          .limit(1);

        // Se não tem outro ativo, rebaixar para free
        if (!otherActive || otherActive.length === 0) {
          await supabase
            .from('profiles')
            .update({ plan: 'free', updated_at: now })
            .eq('id', p.user_id);

          // Buscar dados do usuário para email
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', p.user_id)
            .single();

          // Email para o admin sobre downgrade
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
            if (authUser?.user?.email) {
              sendPixExpiredEmail(authUser.user.email, userProfile?.name).catch(() => {});
            }
          } catch {}

          expiredUsers.push({ userId: p.user_id, plan: p.plan });
        }
      }
    }

    // Buscar todos os pagamentos com info do usuário
    const { data: payments, error } = await supabase
      .from('pix_payments')
      .select('*')
      .order('expires_at', { ascending: true });

    if (error) {
      console.error('[PIX] Error loading payments:', error.message);
      // Se a tabela não existe, retornar mensagem clara
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return Response.json({ error: 'Tabela pix_payments não existe. Execute a migration SQL no Supabase.' }, { status: 500 });
      }
      return Response.json({ error: 'Erro ao carregar dados' }, { status: 500 });
    }

    // Enriquecer com dados do usuário
    const userIds = [...new Set((payments || []).map(p => p.user_id))];
    let userMap = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      if (profiles) {
        for (const p of profiles) userMap[p.id] = p;
      }
      // Buscar emails via auth admin
      for (const uid of userIds) {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(uid);
          if (authData?.user?.email) {
            userMap[uid] = { ...userMap[uid], email: authData.user.email };
          }
        } catch {}
      }
    }

    const enriched = (payments || []).map(p => ({
      ...p,
      user_name: userMap[p.user_id]?.name || 'Desconhecido',
      user_email: userMap[p.user_id]?.email || '',
    }));

    // Contar alertas
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    const expiringSoon = enriched.filter(p =>
      p.status === 'active' && new Date(p.expires_at) <= fiveDaysFromNow
    ).length;

    return Response.json({
      payments: enriched,
      expiredNow: expiredUsers,
      alerts: {
        expiringSoon,
        justExpired: expiredUsers.length,
      },
    });
  } catch (err) {
    console.error('[PIX] GET Error:', err.message);
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
    const { userId, plan, paidAt, notes } = body;

    if (!userId || !plan || !['pro', 'premium'].includes(plan)) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Verificar se o usuário já tem pagamento ativo
    const { data: existingActive } = await supabase
      .from('pix_payments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);

    if (existingActive && existingActive.length > 0) {
      return Response.json({ error: 'Este usuário já possui um pagamento Pix ativo' }, { status: 409 });
    }

    const amount = PLAN_PRICES[plan];
    const paidDate = paidAt ? new Date(paidAt) : new Date();
    const expiresDate = new Date(paidDate);
    expiresDate.setDate(expiresDate.getDate() + 30);

    // Criar pagamento
    const { data: payment, error } = await supabase
      .from('pix_payments')
      .insert({
        user_id: userId,
        plan,
        amount,
        paid_at: paidDate.toISOString(),
        expires_at: expiresDate.toISOString(),
        status: 'active',
        notes: notes?.slice(0, 500) || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[PIX] Insert error:', error.message);
      return Response.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
    }

    // Ativar plano do usuário
    await supabase
      .from('profiles')
      .update({ plan, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return Response.json({ payment });
  } catch (err) {
    console.error('[PIX] POST Error:', err.message);
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
    const { paymentId, action } = body;

    if (!paymentId || !action) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Buscar pagamento atual
    const { data: current } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!current) {
      return Response.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    if (action === 'renew') {
      // Renovar: +30 dias a partir de hoje
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      await supabase
        .from('pix_payments')
        .update({
          status: 'active',
          paid_at: new Date().toISOString(),
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Garantir plano ativo
      await supabase
        .from('profiles')
        .update({ plan: current.plan, updated_at: new Date().toISOString() })
        .eq('id', current.user_id);

      return Response.json({ success: true, action: 'renewed' });
    }

    if (action === 'cancel') {
      await supabase
        .from('pix_payments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', paymentId);

      // Verificar se tem outro ativo, senão rebaixar
      const { data: otherActive } = await supabase
        .from('pix_payments')
        .select('id')
        .eq('user_id', current.user_id)
        .eq('status', 'active')
        .neq('id', paymentId)
        .limit(1);

      if (!otherActive || otherActive.length === 0) {
        await supabase
          .from('profiles')
          .update({ plan: 'free', updated_at: new Date().toISOString() })
          .eq('id', current.user_id);
      }

      return Response.json({ success: true, action: 'cancelled' });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    console.error('[PIX] PATCH Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
