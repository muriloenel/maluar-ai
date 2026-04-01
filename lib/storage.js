const KEYS = {
  USER: 'maluar-user',
  CHATS: 'maluar-chats',
  CHAT_PREFIX: 'maluar-chat-',
  FAVORITES: 'maluar-favorites',
  POST_HISTORY: 'maluar-post-history',
  THEME: 'maluar-theme',
};

function handleStorageError(e) {
  if (e?.name === 'QuotaExceededError') {
    console.warn('[Maluar] localStorage cheio, limpando chats antigos...');
    try {
      const list = JSON.parse(localStorage.getItem(KEYS.CHATS) || '[]');
      // Remove metade mais antiga
      const half = Math.ceil(list.length / 2);
      const toRemove = list.slice(half);
      toRemove.forEach((c) => localStorage.removeItem(KEYS.CHAT_PREFIX + c.id));
      localStorage.setItem(KEYS.CHATS, JSON.stringify(list.slice(0, half)));
    } catch {}
  }
}

// ---- User ----
export function saveUser(user) {
  try {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  } catch (e) {
    handleStorageError(e);
  }
}

export function loadUser() {
  try {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(KEYS.USER);
  } catch {}
}

// ---- Chat list ----
export function loadChatList() {
  try {
    const data = localStorage.getItem(KEYS.CHATS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveChatList(list) {
  try {
    localStorage.setItem(KEYS.CHATS, JSON.stringify(list));
  } catch {}
}

// ---- Single chat ----
export function createChat(title = 'Novo chat') {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const chat = { id, title, createdAt: Date.now(), updatedAt: Date.now() };
  const list = loadChatList();
  list.unshift(chat);
  saveChatList(list);
  return chat;
}

export function updateChatTitle(chatId, title) {
  const list = loadChatList();
  const chat = list.find((c) => c.id === chatId);
  if (chat) {
    chat.title = title.slice(0, 60);
    chat.updatedAt = Date.now();
    saveChatList(list);
  }
}

export function saveChatMessages(chatId, messages) {
  try {
    localStorage.setItem(KEYS.CHAT_PREFIX + chatId, JSON.stringify(messages));
    const list = loadChatList();
    const chat = list.find((c) => c.id === chatId);
    if (chat) {
      chat.updatedAt = Date.now();
      saveChatList(list);
    }
  } catch (e) {
    handleStorageError(e);
  }
}

export function loadChatMessages(chatId) {
  try {
    const data = localStorage.getItem(KEYS.CHAT_PREFIX + chatId);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteChat(chatId) {
  try {
    localStorage.removeItem(KEYS.CHAT_PREFIX + chatId);
    const list = loadChatList().filter((c) => c.id !== chatId);
    saveChatList(list);
  } catch {}
}

export function clearAllChats() {
  try {
    const list = loadChatList();
    list.forEach((c) => localStorage.removeItem(KEYS.CHAT_PREFIX + c.id));
    saveChatList([]);
  } catch {}
}

// ---- Favorites (design inspirations) ----
export function loadFavorites() {
  try {
    const data = localStorage.getItem(KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveFavorite(item) {
  try {
    const list = loadFavorites();
    list.unshift({ ...item, id: Date.now().toString(36), savedAt: Date.now() });
    if (list.length > 50) list.length = 50; // limit
    localStorage.setItem(KEYS.FAVORITES, JSON.stringify(list));
  } catch (e) {
    handleStorageError(e);
  }
}

export function deleteFavorite(id) {
  try {
    const list = loadFavorites().filter((f) => f.id !== id);
    localStorage.setItem(KEYS.FAVORITES, JSON.stringify(list));
  } catch {}
}

// ---- Post History ----
export function loadPostHistory() {
  try {
    const data = localStorage.getItem(KEYS.POST_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePostToHistory(item) {
  try {
    const list = loadPostHistory();
    list.unshift({ ...item, id: Date.now().toString(36), createdAt: Date.now() });
    if (list.length > 20) list.length = 20;
    localStorage.setItem(KEYS.POST_HISTORY, JSON.stringify(list));
  } catch (e) {
    handleStorageError(e);
  }
}

export function deletePostFromHistory(id) {
  try {
    const list = loadPostHistory().filter((p) => p.id !== id);
    localStorage.setItem(KEYS.POST_HISTORY, JSON.stringify(list));
  } catch {}
}
