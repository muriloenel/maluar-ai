'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../components/SupabaseAuthProvider';
import AuthScreen from '../components/AuthScreen';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import PostGenerator from '../components/PostGenerator';
import FavoritesGallery from '../components/FavoritesGallery';
import PricingCalculator from '../components/PricingCalculator';
import {
  dbLoadChatList,
  dbCreateChat,
  dbDeleteChat,
  dbLoadMessages,
  dbLoadFavorites,
  dbDeleteFavorite,
  dbUpdateProfile,
} from '../lib/db';

export default function Home() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [postPrompt, setPostPrompt] = useState(null);
  const [postKey, setPostKey] = useState(0);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [chatMessages, setChatMessages] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState(null);

  // Load data when user is ready — only once per user
  useEffect(() => {
    if (!user) return;
    if (dataLoaded && loadedUserId === user.id) return;
    setDataLoaded(true);
    setLoadedUserId(user.id);
    (async () => {
      try {
        const list = await dbLoadChatList(user.id);
        setChatList(list);
        const favs = await dbLoadFavorites(user.id);
        setFavorites(favs);
        if (list.length > 0) {
          setActiveChatId(list[0].id);
          const msgs = await dbLoadMessages(list[0].id);
          setChatMessages(msgs.length > 0 ? msgs : null);
        } else {
          const chat = await dbCreateChat(user.id);
          if (chat) {
            setActiveChatId(chat.id);
            setChatList([chat]);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        // Still allow app to work even if DB calls fail
      }
    })();
  }, [user, dataLoaded]);

  const refreshChatList = useCallback(async () => {
    if (!user) return;
    const list = await dbLoadChatList(user.id);
    setChatList(list);
  }, [user]);

  const refreshFavorites = useCallback(async () => {
    if (!user) return;
    const favs = await dbLoadFavorites(user.id);
    setFavorites(favs);
  }, [user]);

  const handleNewChat = async () => {
    if (!user) return;
    const chat = await dbCreateChat(user.id);
    if (chat) {
      setActiveChatId(chat.id);
      setChatMessages(null);
      await refreshChatList();
      setActiveTab('chat');
    }
  };

  const handleSelectChat = async (chatId) => {
    const msgs = await dbLoadMessages(chatId);
    setActiveChatId(chatId);
    setChatMessages(msgs.length > 0 ? msgs : null);
    setActiveTab('chat');
  };

  const handleDeleteChat = async (chatId) => {
    if (!confirm('Tem certeza que quer excluir este chat?')) return;
    await dbDeleteChat(chatId);
    await refreshChatList();
    if (chatId === activeChatId) {
      handleNewChat();
    }
  };

  const handleSidebarPrompt = (prompt) => {
    if (prompt === null) {
      handleNewChat();
      return;
    }
    setActiveTab('chat');
    setPendingPrompt(prompt);
    setTimeout(() => setPendingPrompt(null), 100);
  };

  const handleOpenPostGenerator = (prompt) => {
    setActiveTab('post');
    setPostPrompt(prompt || null);
    setPostKey((k) => k + 1);
  };

  const handleChangeLevel = async (newLevel) => {
    if (!user) return;
    const updated = await dbUpdateProfile(user.id, { level: newLevel });
    if (updated) await updateProfile({ level: newLevel });
  };

  const handleDeleteFavorite = async (id) => {
    await dbDeleteFavorite(id);
    await refreshFavorites();
  };

  const handleFavoritePrompt = (prompt) => {
    setActiveTab('chat');
    setPendingPrompt(prompt);
    setTimeout(() => setPendingPrompt(null), 100);
  };

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <img src="/logo-icon.png" alt="Maluar" className="w-14 h-14 rounded-2xl object-contain" />
          <p className="text-sm text-text-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <AuthScreen />;
  }

  const effectiveProfile = profile || {
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Nail Designer',
    level: user.user_metadata?.level || 'iniciante',
    plan: 'free',
  };

  const userForComponents = useMemo(() => ({
    name: effectiveProfile.name,
    level: effectiveProfile.level,
  }), [effectiveProfile.name, effectiveProfile.level]);

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar
        user={userForComponents}
        onSendPrompt={handleSidebarPrompt}
        onOpenPostGenerator={handleOpenPostGenerator}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onChangeLevel={handleChangeLevel}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chatList={chatList}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onSignOut={signOut}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-surface-card md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-text-muted hover:text-text transition-colors"
            aria-label="Abrir menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base">💅</span>
            <span className="font-display text-base font-bold text-text">Maluar AI</span>
          </div>
          <div className="w-5" />
        </header>

        {/* Mobile tab bar */}
        <div className="flex border-b border-border-light md:hidden">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'chat'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'post'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Criar Post
          </button>
          <button
            onClick={() => { refreshFavorites(); setActiveTab('favorites'); }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Favoritos
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'pricing'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Preço
          </button>
        </div>

        {activeTab === 'chat' ? (
          <ChatWindow
            key={activeChatId}
            user={userForComponents}
            userId={user.id}
            pendingPrompt={pendingPrompt}
            chatId={activeChatId}
            initialMessages={chatMessages}
            onChatUpdated={refreshChatList}
            onFavoritesChanged={refreshFavorites}
          />
        ) : activeTab === 'favorites' ? (
          <FavoritesGallery
            favorites={favorites}
            onDelete={handleDeleteFavorite}
            onUsePrompt={handleFavoritePrompt}
          />
        ) : activeTab === 'pricing' ? (
          <PricingCalculator />
        ) : (
          <PostGenerator key={postKey} user={userForComponents} userId={user.id} initialPrompt={postPrompt} />
        )}
      </main>
    </div>
  );
}
