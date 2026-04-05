'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../components/SupabaseAuthProvider';
import AuthScreen from '../components/AuthScreen';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import {
  dbLoadChatList,
  dbCreateChat,
  dbDeleteChat,
  dbLoadMessages,
  dbLoadFavorites,
  dbDeleteFavorite,
  dbUpdateProfile,
} from '../lib/db';

// Lazy load componentes que não são necessários no primeiro render
const PostGenerator = dynamic(() => import('../components/PostGenerator'), { ssr: false, loading: () => <TabSpinner /> });
const FavoritesGallery = dynamic(() => import('../components/FavoritesGallery'), { ssr: false, loading: () => <TabSpinner /> });
const PricingCalculator = dynamic(() => import('../components/PricingCalculator'), { ssr: false, loading: () => <TabSpinner /> });
const BusinessHub = dynamic(() => import('../components/BusinessHub'), { ssr: false, loading: () => <TabSpinner /> });
const PricingPlans = dynamic(() => import('../components/PricingPlans'), { ssr: false, loading: () => <TabSpinner /> });

// Spinner para transição entre abas
function TabSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
}

export default function Home() {
  const { user, profile, signOut, updateProfile, refreshProfile, getAccessToken } = useAuth();
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

  // Callback para o ChatWindow avisar que consumiu o prompt
  const clearPendingPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  // Safety net: se sessionStorage tiver plano confirmado pelo checkout, usar como override
  const confirmedPlan = typeof window !== 'undefined' ? (() => {
    try { return sessionStorage.getItem('maluar-confirmed-plan'); } catch { return null; }
  })() : null;

  const effectiveProfile = profile
    ? { ...profile, plan: confirmedPlan || profile.plan || 'free' }
    : {
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Nail Designer',
        level: user?.user_metadata?.level || 'iniciante',
        plan: confirmedPlan || 'free',
      };

  // Limpar sessionStorage quando profile tiver plano != free (banco já retornou correto)
  useEffect(() => {
    if (profile?.plan && profile.plan !== 'free' && confirmedPlan) {
      try { sessionStorage.removeItem('maluar-confirmed-plan'); } catch {}
    }
  }, [profile?.plan, confirmedPlan]);
  const userForComponents = useMemo(() => ({
    name: effectiveProfile.name,
    level: effectiveProfile.level,
  }), [effectiveProfile.name, effectiveProfile.level]);

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
        // Modo convidado: criar chatId local pra app funcionar sem DB
        if (!activeChatId) {
          setActiveChatId('local-' + Date.now());
        }
      }
    })();
  }, [user, dataLoaded, loadedUserId]);

  const refreshChatList = useCallback(async () => {
    if (!user) return;
    try {
      const list = await dbLoadChatList(user.id);
      setChatList(list);
    } catch {}
  }, [user]);

  const refreshFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const favs = await dbLoadFavorites(user.id);
      setFavorites(favs);
    } catch {}
  }, [user]);

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const chat = await dbCreateChat(user.id);
      if (chat) {
        setActiveChatId(chat.id);
        setChatMessages(null);
        await refreshChatList();
        setActiveTab('chat');
        return;
      }
    } catch (err) {
      console.warn('Erro ao criar chat (modo convidado?):', err);
    }
    // Fallback: modo convidado sem DB — reseta mensagens in-memory
    setActiveChatId('local-' + Date.now());
    setChatMessages(null);
    setActiveTab('chat');
  };

  const handleSelectChat = async (chatId) => {
    try {
      const msgs = await dbLoadMessages(chatId);
      setChatMessages(msgs.length > 0 ? msgs : null);
    } catch {
      setChatMessages(null);
    }
    setActiveChatId(chatId);
    setActiveTab('chat');
  };

  const handleDeleteChat = async (chatId) => {
    if (!confirm('Tem certeza que quer excluir este chat?')) return;
    try { await dbDeleteChat(chatId); } catch {}
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
    // Sidebar prompt vai pro chat ATUAL (usuário está vendo o chat)
    setActiveTab('chat');
    setPendingPrompt({ text: prompt, _ts: Date.now() });
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
    try { await dbDeleteFavorite(id); } catch {}
    await refreshFavorites();
  };

  const handleFavoritePrompt = (prompt) => {
    setActiveTab('chat');
    setPendingPrompt({ text: prompt, _ts: Date.now() });
  };

  // Handler para BusinessHub — CRIA chat novo, troca de aba imediato
  const handleBusinessPrompt = useCallback(async (prompt) => {
    if (!user) return;
    // Troca de aba IMEDIATAMENTE
    setActiveTab('chat');
    try {
      const chat = await dbCreateChat(user.id);
      if (chat) {
        setChatMessages(null);
        setActiveChatId(chat.id);
        refreshChatList();
        // Delay mínimo pra garantir que ChatWindow remontou com novo key
        setTimeout(() => {
          setPendingPrompt({ text: prompt, _ts: Date.now() });
        }, 50);
        return;
      }
    } catch (err) {
      console.warn('Erro ao criar chat:', err);
    }
    // Fallback: usa chat atual
    setPendingPrompt({ text: prompt, _ts: Date.now() });
  }, [user, refreshChatList]);

  // Handler para sessão expirada — redireciona pro login
  const handleAuthExpired = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Handler para abrir a aba de planos (upgrade)
  const handleUpgrade = useCallback(() => {
    setActiveTab('plans');
  }, []);

  // Handler para abrir o Stripe Billing Portal (gerenciar assinatura)
  const handleManageSubscription = useCallback(async () => {
    try {
      const token = getAccessToken ? await getAccessToken() : null;
      if (!token) return;
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Erro ao abrir portal:', err);
    }
  }, [getAccessToken]);

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <img src="/logo-icon.png" alt="Maluar" className="w-16 h-16 rounded-2xl object-contain" />
          <p className="text-sm text-text-muted">Carregando...</p>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <AuthScreen />;
  }

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
        currentPlan={effectiveProfile.plan || 'free'}
        onUpgrade={handleUpgrade}
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
        <div className="flex border-b border-border-light md:hidden overflow-x-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'chat'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'business'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Negócio
          </button>
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'post'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Post
          </button>
          <button
            onClick={() => { refreshFavorites(); setActiveTab('favorites'); }}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Salvos
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Preço
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'plans'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            Planos
          </button>
        </div>

        {activeTab === 'chat' ? (
          <ChatWindow
            key={activeChatId}
            user={userForComponents}
            userId={user.id}
            userEmail={user.email}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={clearPendingPrompt}
            chatId={activeChatId}
            initialMessages={chatMessages}
            onChatUpdated={refreshChatList}
            onFavoritesChanged={refreshFavorites}
            onOpenSidebar={() => setSidebarOpen(true)}
            getAccessToken={getAccessToken}
            onAuthExpired={handleAuthExpired}
            onUpgrade={handleUpgrade}
          />
        ) : (
          <div className="tab-content flex-1 flex flex-col min-h-0">
            {activeTab === 'business' ? (
              <BusinessHub onSendPrompt={handleBusinessPrompt} plan={effectiveProfile.plan || 'free'} onUpgrade={handleUpgrade} />
            ) : activeTab === 'favorites' ? (
              <FavoritesGallery
                favorites={favorites}
                onDelete={handleDeleteFavorite}
                onUsePrompt={handleFavoritePrompt}
              />
            ) : activeTab === 'pricing' ? (
              <PricingCalculator />
            ) : activeTab === 'plans' ? (
              <PricingPlans
                currentPlan={effectiveProfile.plan || 'free'}
                getAccessToken={getAccessToken}
                onManageSubscription={handleManageSubscription}
              />
            ) : (
              <PostGenerator key={postKey} user={userForComponents} userId={user.id} initialPrompt={postPrompt} plan={effectiveProfile.plan || 'free'} onUpgrade={handleUpgrade} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
