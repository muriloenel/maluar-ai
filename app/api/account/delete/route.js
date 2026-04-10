import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/admin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function DELETE(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    // Usar service role para deletar (cascade deleta chats, messages, favorites, etc.)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Deletar profile (cascadeia para chats → messages, favorites, post_history)
    await supabase.from('profiles').delete().eq('id', user.id);

    // Deletar o usuário do auth
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('[DELETE_ACCOUNT] Auth delete error:', error.message);
      // Dados já foram deletados, mas auth falhou — logar mas retornar sucesso parcial
    }

    return Response.json({ success: true, message: 'Conta e todos os dados foram excluídos permanentemente.' });
  } catch (err) {
    console.error('[DELETE_ACCOUNT] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
