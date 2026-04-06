import { getSupabase } from './supabase';

function supabase() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
  return client;
}

// Timeout wrapper para evitar queries Supabase travando infinitamente
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase query timeout')), ms)),
  ]);
}

// ---- Chats ----
export async function dbLoadChatList(userId) {
  const { data } = await supabase()
    .from('chats')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  return data || [];
}

export async function dbCreateChat(userId, title = 'Novo chat') {
  const { data } = await supabase()
    .from('chats')
    .insert({ user_id: userId, title })
    .select()
    .single();
  return data;
}

export async function dbUpdateChatTitle(chatId, title) {
  await supabase()
    .from('chats')
    .update({ title: title.slice(0, 60), updated_at: new Date().toISOString() })
    .eq('id', chatId);
}

export async function dbDeleteChat(chatId) {
  await supabase().from('chats').delete().eq('id', chatId);
}

// ---- Messages ----
export async function dbLoadMessages(chatId) {
  const { data } = await supabase()
    .from('messages')
    .select('id, role, content, image_preview, is_error, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  return (data || []).map((m) => ({
    _id: m.id,
    role: m.role,
    content: m.content,
    imagePreview: m.image_preview,
    isError: m.is_error,
    timestamp: new Date(m.created_at).getTime(),
  }));
}

export async function dbSaveMessage(chatId, { role, content, imagePreview, isError }) {
  const { data } = await withTimeout(
    supabase().from('messages').insert({
      chat_id: chatId,
      role,
      content,
      image_preview: imagePreview || null,
      is_error: isError || false,
    }).select().single()
  );

  // Touch chat updated_at
  withTimeout(
    supabase().from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId)
  ).catch(() => {});

  return data;
}

export async function dbDeleteErrorMessages(chatId) {
  await supabase().from('messages').delete().eq('chat_id', chatId).eq('is_error', true);
}

// ---- Favorites ----
export async function dbLoadFavorites(userId) {
  const { data } = await supabase()
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function dbSaveFavorite(userId, { type, content, imageUrl }) {
  const { data } = await supabase()
    .from('favorites')
    .insert({ user_id: userId, type: type || 'chat', content, image_url: imageUrl || null })
    .select()
    .single();
  return data;
}

export async function dbDeleteFavorite(favId) {
  await supabase().from('favorites').delete().eq('id', favId);
}

// ---- Post History ----
export async function dbLoadPostHistory(userId) {
  const { data } = await supabase()
    .from('post_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

export async function dbSavePost(userId, { platform, postType, content }) {
  const { data } = await supabase()
    .from('post_history')
    .insert({ user_id: userId, platform, post_type: postType, content })
    .select()
    .single();
  return data;
}

export async function dbDeletePost(postId) {
  await supabase().from('post_history').delete().eq('id', postId);
}

// ---- Profile ----
export async function dbGetProfile(userId) {
  const { data } = await withTimeout(
    supabase().from('profiles').select('*').eq('id', userId).single()
  );
  return data;
}

export async function dbUpdateProfile(userId, updates) {
  const { data } = await supabase()
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  return data;
}

// ---- Quota de mensagens diárias ----
const DAILY_LIMITS = { free: 15, pro: 150, premium: 9999 };

// Emails sem limite de mensagens (admin/dev) — definidos via env var
const UNLIMITED_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Cache local da quota pra evitar queries a cada mensagem
let quotaCache = { userId: null, data: null, ts: 0 };
const QUOTA_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function dbCheckMessageQuota(userId, userEmail) {
  // Usuários sem limite
  if (userEmail && UNLIMITED_EMAILS.includes(userEmail.toLowerCase())) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  // Retornar cache se válido
  if (quotaCache.userId === userId && Date.now() - quotaCache.ts < QUOTA_CACHE_TTL && quotaCache.data) {
    return quotaCache.data;
  }

  const profile = await dbGetProfile(userId);
  if (!profile) {
    const result = { allowed: true, remaining: 50, limit: 50 };
    quotaCache = { userId, data: result, ts: Date.now() };
    return result;
  }

  const limit = DAILY_LIMITS[profile.plan] || DAILY_LIMITS.free;
  const messagesToday = profile.messages_today || 0;

  const now = new Date();
  const resetAt = profile.messages_reset_at ? new Date(profile.messages_reset_at) : new Date(0);

  // Reseta se mudou o dia (meia-noite)
  const isNewDay = now.toDateString() !== resetAt.toDateString();
  if (isNewDay) {
    await withTimeout(
      supabase().from('profiles').update({ messages_today: 0, messages_reset_at: now.toISOString() }).eq('id', userId)
    );
    const result = { allowed: true, remaining: limit, limit };
    quotaCache = { userId, data: result, ts: Date.now() };
    return result;
  }

  const remaining = Math.max(0, limit - messagesToday);
  const result = { allowed: remaining > 0, remaining, limit };
  quotaCache = { userId, data: result, ts: Date.now() };
  return result;
}

// Invalidar cache quando incrementa
export async function dbIncrementMessageCount(userId) {
  quotaCache = { userId: null, data: null, ts: 0 }; // invalidar cache
  // Usar RPC ou update atômico para evitar race condition
  await withTimeout(
    supabase().rpc('increment_message_count', { user_id_param: userId })
  ).catch(async () => {
    // Fallback se a RPC não existir: read-then-write (menos seguro)
    try {
      const profile = await dbGetProfile(userId);
      if (!profile) return;
      await withTimeout(
        supabase().from('profiles').update({ messages_today: (profile.messages_today || 0) + 1 }).eq('id', userId)
      );
    } catch {}
  });
}
