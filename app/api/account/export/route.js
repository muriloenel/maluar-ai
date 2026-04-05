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

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os dados do usuário
    const [profileRes, chatsRes, favoritesRes, postHistoryRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('chats').select('id, title, created_at, updated_at').eq('user_id', user.id),
      supabase.from('favorites').select('*').eq('user_id', user.id),
      supabase.from('post_history').select('*').eq('user_id', user.id),
    ]);

    // Buscar mensagens de todos os chats
    const chatIds = (chatsRes.data || []).map(c => c.id);
    let messages = [];
    if (chatIds.length > 0) {
      const { data } = await supabase
        .from('messages')
        .select('id, chat_id, role, content, created_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: true });
      messages = data || [];
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile: profileRes.data || null,
      chats: (chatsRes.data || []).map(chat => ({
        ...chat,
        messages: messages.filter(m => m.chat_id === chat.id),
      })),
      favorites: favoritesRes.data || [],
      postHistory: postHistoryRes.data || [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="maluar-ai-dados-${user.id.slice(0, 8)}.json"`,
      },
    });
  } catch (err) {
    console.error('[EXPORT] Error:', err.message);
    return Response.json({ error: 'Erro interno' }, { status: 500 });
  }
}
