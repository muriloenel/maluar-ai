import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = { webhook_events: 0, usage_logs: 0, old_chats: 0 };

    // 1. Limpar webhook_events > 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: webhookCount } = await supabase
      .from('webhook_events')
      .delete({ count: 'exact' })
      .lt('created_at', thirtyDaysAgo)
      .catch(() => ({ count: 0 }));
    results.webhook_events = webhookCount || 0;

    // 2. Limpar usage_logs > 90 dias
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: usageCount } = await supabase
      .from('usage_logs')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo)
      .catch(() => ({ count: 0 }));
    results.usage_logs = usageCount || 0;

    // 3. Limpar conversas > 12 meses (mensagens + chats sem atividade)
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    // Primeiro buscar IDs de chats antigos
    const { data: oldChats } = await supabase
      .from('chats')
      .select('id')
      .lt('updated_at', twelveMonthsAgo);

    if (oldChats?.length > 0) {
      const oldChatIds = oldChats.map(c => c.id);
      // Deletar mensagens dos chats antigos
      await supabase
        .from('messages')
        .delete()
        .in('chat_id', oldChatIds);
      // Deletar os chats
      const { count: chatCount } = await supabase
        .from('chats')
        .delete({ count: 'exact' })
        .in('id', oldChatIds);
      results.old_chats = chatCount || 0;
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      cleaned: results,
    });
  } catch (err) {
    console.error('[CLEANUP] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
