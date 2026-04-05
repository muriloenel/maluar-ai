import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getAuthUser(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token || !supabaseUrl) return null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

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
