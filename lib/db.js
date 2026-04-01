import { getSupabase } from './supabase';

function supabase() {
  return getSupabase();
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
  const { data } = await supabase()
    .from('messages')
    .insert({
      chat_id: chatId,
      role,
      content,
      image_preview: imagePreview || null,
      is_error: isError || false,
    })
    .select()
    .single();

  // Touch chat updated_at
  await supabase()
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);

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
  const { data } = await supabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
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
const DAILY_LIMITS = { free: 30, pro: 150, premium: 9999 };

export async function dbCheckMessageQuota(userId) {
  const profile = await dbGetProfile(userId);
  if (!profile) return { allowed: false, remaining: 0 };

  const now = new Date();
  const resetAt = new Date(profile.messages_reset_at);

  // Se passou um dia, reseta o contador
  if (now - resetAt > 24 * 60 * 60 * 1000) {
    await supabase()
      .from('profiles')
      .update({ messages_today: 0, messages_reset_at: now.toISOString() })
      .eq('id', userId);
    profile.messages_today = 0;
  }

  const limit = DAILY_LIMITS[profile.plan] || DAILY_LIMITS.free;
  const remaining = Math.max(0, limit - profile.messages_today);
  return { allowed: remaining > 0, remaining, limit };
}

export async function dbIncrementMessageCount(userId) {
  const profile = await dbGetProfile(userId);
  if (!profile) return;
  await supabase()
    .from('profiles')
    .update({ messages_today: (profile.messages_today || 0) + 1 })
    .eq('id', userId);
}
