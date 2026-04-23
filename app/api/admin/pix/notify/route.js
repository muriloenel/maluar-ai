import { requireAdmin, getServiceClient } from '../../../../../lib/admin';
import { sendPixExpiringAdminSummary } from '../../../../../lib/email';

// Endpoint para enviar email-resumo de Pix vencendo nos próximos 5 dias
// Pode ser chamado manualmente pelo admin ou via cron
export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });

    const supabase = getServiceClient();
    if (!supabase) return Response.json({ error: 'Service key não configurada' }, { status: 500 });

    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const { data: expiring } = await supabase
      .from('pix_payments')
      .select('*, user_id')
      .eq('status', 'active')
      .lte('expires_at', fiveDaysFromNow.toISOString())
      .gt('expires_at', new Date().toISOString());

    if (!expiring || expiring.length === 0) {
      return Response.json({ sent: false, message: 'Nenhum Pix vencendo nos próximos 5 dias' });
    }

    // Enriquecer com dados do usuário
    const enriched = [];
    for (const p of expiring) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', p.user_id)
        .single();
      let email = null;
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(p.user_id);
        email = authData?.user?.email;
      } catch {}
      enriched.push({
        name: profile?.name || 'Desconhecido',
        email,
        plan: p.plan,
        expires_at: p.expires_at,
      });
    }

    // Enviar para o admin
    await sendPixExpiringAdminSummary(admin.email, enriched);

    return Response.json({ sent: true, count: enriched.length });
  } catch (err) {
    console.error('[PIX-NOTIFY] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
