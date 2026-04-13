'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../components/SupabaseAuthProvider';
import AuthScreen from '../components/AuthScreen';
import CompleteProfile from '../components/CompleteProfile';
import Sidebar from '../components/Sidebar';
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
const ChatWindow = dynamic(() => import('../components/ChatWindow'), { ssr: false, loading: () => <TabSpinner /> });
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

const LEVEL_LABELS = {
  iniciante: { label: 'Iniciante', icon: '🌱' },
  intermediario: { label: 'Intermediária', icon: '💅' },
  avancada: { label: 'Avançada', icon: '✨' },
};

// Landing screen — Aprender
function LearnLanding({ user, onStart }) {
  const level = user?.level || 'iniciante';
  const info = LEVEL_LABELS[level] || LEVEL_LABELS.iniciante;

  const topics = {
    iniciante: [
      { icon: '🌱', title: 'Primeiros passos na profissão' },
      { icon: '🛒', title: 'Montar seu kit inicial' },
      { icon: '📖', title: 'Técnicas básicas de nail design' },
      { icon: '📅', title: 'Rotina de treino personalizada' },
      { icon: '👥', title: 'Conquistar suas primeiras clientes' },
    ],
    intermediario: [
      { icon: '💅', title: 'Aperfeiçoamento de técnicas' },
      { icon: '🎨', title: 'Nail art que agrega valor' },
      { icon: '💰', title: 'Precificação estratégica' },
      { icon: '📱', title: 'Marketing no Instagram' },
      { icon: '🚀', title: 'Captação de clientes' },
    ],
    avancada: [
      { icon: '✨', title: 'Técnicas avançadas (encapsulamento, 3D)' },
      { icon: '💰', title: 'Escalar seu negócio' },
      { icon: '📊', title: 'Posicionamento premium' },
      { icon: '🎓', title: 'Criar seus próprios cursos' },
      { icon: '🏢', title: 'Formalizar sua empresa' },
    ],
  };

  const levelTopics = topics[level] || topics.iniciante;

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-bg mb-4">
            <span className="text-3xl">📚</span>
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Aprender Nail Design</h2>
          <p className="text-sm text-text-muted">
            Plano de aprendizado personalizado para seu nível{' '}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-bg text-accent text-xs font-semibold">
              {info.icon} {info.label}
            </span>
          </p>
        </div>

        <div className="space-y-2 mb-8">
          <p className="text-xs font-semibold text-text-light uppercase tracking-wider px-1">O que vamos abordar:</p>
          {levelTopics.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-alt">
              <span className="text-base">{t.icon}</span>
              <span className="text-sm text-text">{t.title}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onStart(`Sou nail designer nível ${info.label.toLowerCase()}. Quero aprender e evoluir na profissão. Me sugira os próximos passos e o que estudar.`)}
          className="w-full btn-gradient py-3 rounded-xl text-sm font-semibold"
        >
          Começar meu plano de aprendizado
        </button>
      </div>
    </div>
  );
}

// Landing screen — Instagram do Zero
function InstagramZeroLanding({ onStart }) {
  const steps = [
    { icon: '📸', title: 'Configurar perfil profissional', desc: 'Bio, foto, destaques e identidade visual' },
    { icon: '📝', title: 'Estratégia de conteúdo', desc: 'O que postar, quando e com que frequência' },
    { icon: '🎨', title: 'Feed que atrai clientes', desc: 'Fotos, Reels e Stories que convertem' },
    { icon: '#️⃣', title: 'Hashtags e alcance', desc: 'Como ser encontrada pelas clientes certas' },
    { icon: '💬', title: 'Engajamento e vendas', desc: 'Transformar seguidoras em clientes' },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-bg mb-4">
            <span className="text-3xl">📱</span>
          </div>
          <h2 className="text-xl font-bold text-text mb-2">Instagram do Zero</h2>
          <p className="text-sm text-text-muted">
            Plano completo para montar seu Instagram profissional de nail design e atrair clientes.
          </p>
        </div>

        <div className="space-y-2 mb-8">
          <p className="text-xs font-semibold text-text-light uppercase tracking-wider px-1">Etapas do plano:</p>
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-alt">
              <span className="text-base">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{s.title}</p>
                <p className="text-xs text-text-muted">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onStart('Como montar meu Instagram profissional do zero? Me dá um plano completo')}
          className="w-full btn-gradient py-3 rounded-xl text-sm font-semibold"
        >
          Iniciar plano do Instagram
        </button>
      </div>
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
  const selectingChatRef = useRef(null); // proteção contra race condition

  // Callback para o ChatWindow avisar que consumiu o prompt
  const clearPendingPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  // Safety net: se sessionStorage tiver plano confirmado pelo checkout, usar como override
  const [confirmedPlan, setConfirmedPlan] = useState(null);
  useEffect(() => {
    try {
      const plan = sessionStorage.getItem('maluar-confirmed-plan');
      if (plan) setConfirmedPlan(plan);
    } catch {}
  }, []);

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
        // Sempre iniciar com chat novo (não carregar histórico antigo)
        const chat = await dbCreateChat(user.id);
        if (chat) {
          setActiveChatId(chat.id);
          setChatList(prev => [chat, ...prev.filter(c => c.id !== chat.id)]);
        } else if (list.length > 0) {
          setActiveChatId(list[0].id);
        }
      } catch (err) {
        console.error('Error loading data:', err);
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
    // Resetar estado imediatamente pra UI responder rápido
    const tempId = 'new-' + Date.now();
    setChatMessages(null);
    setActiveChatId(tempId);
    setActiveTab('chat');
    try {
      const chat = await dbCreateChat(user.id);
      if (chat) {
        setActiveChatId(chat.id);
        refreshChatList(); // não bloqueia
        return;
      }
    } catch (err) {
      console.warn('[NEW-CHAT] Erro ao criar:', err?.message);
    }
  };

  const handleSelectChat = async (chatId) => {
    // Trocar imediatamente para o chat selecionado (sem esperar DB)
    selectingChatRef.current = chatId;
    setActiveChatId(chatId);
    setActiveTab('chat');
    setChatMessages(null);
    try {
      const msgs = await dbLoadMessages(chatId);
      // Ignorar se o usuário já clicou em outro chat
      if (selectingChatRef.current !== chatId) return;
      if (msgs && msgs.length > 0) {
        setChatMessages(msgs);
      }
    } catch (err) {
      console.error('[SELECT-CHAT] Erro ao carregar mensagens:', err);
    }
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
          <img src="/logo-icon.webp" alt="Maluar" className="w-16 h-16 rounded-2xl object-contain" />
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

  // Profile incomplete (social login without phone) — must complete before using app
  if (profile && !profile.phone) {
    return (
      <CompleteProfile
        onComplete={async () => {
          await refreshProfile?.();
        }}
      />
    );
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
        onManageSubscription={handleManageSubscription}
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

        {/* Mobile tab bar — simplificada: Chat, Criar, Aprender, Menu */}
        <nav className="flex border-b border-border-light md:hidden">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'chat'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('post')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'post'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            🎨 Criar
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === 'business' || activeTab === 'pricing'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted'
            }`}
          >
            💼 Negócio
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-1 py-2.5 text-xs font-medium text-text-muted transition-colors whitespace-nowrap"
          >
            ☰ Menu
          </button>
        </nav>

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
            ) : activeTab === 'learn' ? (
              <LearnLanding user={userForComponents} onStart={(prompt) => { handleSidebarPrompt(prompt); }} />
            ) : activeTab === 'instagram-zero' ? (
              <InstagramZeroLanding onStart={(prompt) => { handleBusinessPrompt(prompt); }} />
            ) : (
              <PostGenerator key={postKey} user={userForComponents} userId={user.id} initialPrompt={postPrompt} plan={effectiveProfile.plan || 'free'} onUpgrade={handleUpgrade} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
