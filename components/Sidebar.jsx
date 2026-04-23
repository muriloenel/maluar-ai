'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { UpgradeInlineBadge } from './UpgradePrompt';
import { getSupabase } from '../lib/supabase';

const LEVEL_LABELS = {
  iniciante: { label: 'Iniciante', icon: '🌱' },
  intermediario: { label: 'Intermediária', icon: '💅' },
  avancada: { label: 'Avançada', icon: '✨' },
};

const MODULES_BY_LEVEL = {
  iniciante: [
    {
      icon: '🌱',
      label: 'Primeiros Passos',
      prompts: [
        'Como começo do zero em nail design?',
        'Preciso de curso pra começar?',
        'Quanto tempo leva pra atender bem?',
      ],
    },
    {
      icon: '🛒',
      label: 'Kit Iniciante',
      prompts: [
        'Qual kit montar com até R$500?',
        'Qual cabine LED comprar?',
        'Melhor gel custo-benefício?',
      ],
    },
    {
      icon: '📖',
      label: 'Técnicas Básicas',
      prompts: [
        'Como fazer esmaltação gel?',
        'Qual a diferença entre gel e polygel?',
        'Como fazer uma boa cuticulagem?',
      ],
    },
    {
      icon: '📅',
      label: 'Rotina de Treino',
      prompts: [
        'Monta uma rotina de treino pra mim',
        'Quanto treinar por dia?',
        'Treino em tip ou em mão?',
      ],
    },
    {
      icon: '👥',
      label: 'Primeiras Clientes',
      prompts: [
        'Como conseguir as primeiras clientes?',
        'Devo atender de graça no começo?',
        'Quanto cobrar sendo iniciante?',
      ],
    },
    {
      icon: '💰',
      label: 'Começar a Lucrar',
      prompts: [
        'Monta um plano pra eu conseguir minhas 10 primeiras clientes',
        'Quanto preciso investir pra começar a lucrar?',
        'Me ajuda a calcular o preço certo dos meus serviços',
      ],
    },
  ],
  intermediario: [
    {
      icon: '💅',
      label: 'Aperfeiçoamento',
      prompts: [
        'Como melhorar meu acabamento?',
        'Dicas pra baby boomer perfeito',
        'Minha cutícula ainda fica ruim, me ajuda',
      ],
    },
    {
      icon: '🎨',
      label: 'Nail Art',
      prompts: [
        'Nail art fácil que agrega valor',
        'Como fazer francesinha perfeita?',
        'Tendências de nail art 2025-2026',
      ],
    },
    {
      icon: '💰',
      label: 'Precificação',
      prompts: [
        'Quanto cobrar por alongamento?',
        'Como subir meu preço sem perder cliente?',
        'Tabela de preços pra minha região',
      ],
    },
    {
      icon: '📸',
      label: 'Feedback',
      prompts: [
        'Analisa minha unha (manda foto)',
        'O que posso melhorar na técnica?',
        'Meu nivelamento tá bom?',
      ],
    },
    {
      icon: '📱',
      label: 'Marketing',
      prompts: [
        'Dicas de Instagram pra nail designer',
        'Como fazer Reels que engajam?',
        'Melhores horários pra postar',
      ],
    },
    {
      icon: '🚀',
      label: 'Captar Clientes',
      prompts: [
        'Monta um plano de captação de clientes pra 30 dias',
        'Como fazer parcerias locais pra conseguir clientes?',
        'Me dá templates de mensagem pro WhatsApp pra atrair clientes',
      ],
    },
    {
      icon: '📊',
      label: 'Gestão Financeira',
      prompts: [
        'Me ajuda a calcular o custo real do meu serviço',
        'Como separar meu dinheiro pessoal do negócio?',
        'Quero faturar R$5.000/mês, monta um plano pra mim',
      ],
    },
    {
      icon: '⏰',
      label: 'Organizar Rotina',
      prompts: [
        'Sou mãe e nail designer, me ajuda a montar uma rotina',
        'Como organizar minha agenda de atendimentos?',
        'Técnica de batch: como criar conteúdo da semana toda em 2 horas',
      ],
    },
  ],
  avancada: [
    {
      icon: '✨',
      label: 'Técnicas Avançadas',
      prompts: [
        'Como fazer encapsulamento perfeito?',
        'Dicas pra nail art 3D',
        'Técnica russa: melhores práticas',
      ],
    },
    {
      icon: '💰',
      label: 'Escalar Negócio',
      prompts: [
        'Como montar um ateliê de nail?',
        'Devo contratar assistente?',
        'Como fidelizar clientes de alto ticket',
      ],
    },
    {
      icon: '📊',
      label: 'Posicionamento',
      prompts: [
        'Como me posicionar como premium?',
        'Estratégia pra cobrar acima de R$200',
        'Como criar lista de espera',
      ],
    },
    {
      icon: '📱',
      label: 'Conteúdo Pro',
      prompts: [
        'Estratégia de conteúdo pro Instagram',
        'Como atrair clientas pelo TikTok',
        'Portfólio: como montar o ideal',
      ],
    },
    {
      icon: '🎓',
      label: 'Mentoria',
      prompts: [
        'Como criar meu próprio curso?',
        'Vale a pena ser educadora de marca?',
        'Como cobrar por consultoria',
      ],
    },
    {
      icon: '🏢',
      label: 'Formalizar Empresa',
      prompts: [
        'Como abrir MEI pra nail designer?',
        'Quando devo migrar de MEI pra ME?',
        'Me explica sobre conta PJ e máquininha',
      ],
    },
    {
      icon: '📈',
      label: 'Diversificar Renda',
      prompts: [
        'Quais outras formas de ganhar dinheiro além de atender?',
        'Como criar e vender um curso online?',
        'Como ser educadora de marca de produtos?',
      ],
    },
  ],
};

export default function Sidebar({ user, onSendPrompt, onOpenPostGenerator, activeTab, onTabChange, onChangeLevel, isOpen, onClose, chatList, activeChatId, onSelectChat, onDeleteChat, onSignOut, currentPlan, onUpgrade, onManageSubscription }) {
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [openSections, setOpenSections] = useState({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const userMenuRef = useRef(null);
  const { theme, toggle: toggleTheme } = useTheme();

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }
    setPasswordLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) { setPasswordError('Serviço indisponível.'); setPasswordLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('same') || msg.includes('different')) {
          setPasswordError('A nova senha deve ser diferente da atual.');
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setPasswordError('Muitas tentativas. Aguarde alguns minutos.');
        } else {
          setPasswordError('Erro ao alterar senha. Tente novamente.');
        }
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordError('Erro de conexão. Verifique sua internet.');
    }
    setPasswordLoading(false);
  };

  // Fechar menu do usuário ao clicar fora
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);
  const modules = MODULES_BY_LEVEL[user?.level] || MODULES_BY_LEVEL.iniciante;
  const levelInfo = LEVEL_LABELS[user?.level] || LEVEL_LABELS.iniciante;
  const isFree = currentPlan === 'free' || !currentPlan;

  const filteredChats = historySearch.trim()
    ? chatList.filter((c) => c.title?.toLowerCase().includes(historySearch.toLowerCase()))
    : chatList;

  // Componente reutilizável pra seção colapsável
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const Section = ({ id, icon, title, children, defaultOpen = false }) => {
    const isOpen = openSections[id] !== undefined ? openSections[id] : defaultOpen;
    return (
      <div className="group/section">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-surface-alt transition-colors"
        >
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-semibold text-text-light uppercase tracking-wider flex-1 text-left">{title}</span>
          <svg className={`w-3.5 h-3.5 text-text-light transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="px-2 pb-2">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-full w-64 bg-surface-card border-r border-border z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col`}
      >
        {/* Brand Logo */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2.5 px-2">
            <div className="relative">
              <img src="/logo-icon.webp" alt="Maluar" className="w-8 h-8 rounded-lg object-contain" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-rose/20 rounded-lg blur-sm -z-10" />
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold bg-gradient-to-r from-[#534AB7] via-[#7F77DD] to-[#D4537E] dark:from-[#AFA9EC] dark:via-[#7F77DD] dark:to-[#D4537E] bg-clip-text text-transparent leading-tight tracking-tight">Maluar</h1>
              <p className="text-[9px] text-text-light font-semibold tracking-[0.15em] uppercase">Nail Design AI</p>
            </div>
          </div>
        </div>

        {/* Header - New Chat button */}
        <div className="px-3 pb-2 pt-2 space-y-2">
          <button
            onClick={() => {
              onSendPrompt(null);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-accent/30 hover:bg-accent-bg transition-all duration-200 group"
          >
            <svg className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[13px] font-semibold text-text flex-1 text-left">Novo chat</span>
          </button>

          {/* Banner de upgrade — só para plano free */}
          {isFree && (
            <button
              onClick={() => { onUpgrade?.(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-accent/10 to-rose/10 border border-accent/20 hover:border-accent/40 transition-all group"
            >
              <span className="text-base">✨</span>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-accent">Upgrade Pro</p>
                <p className="text-[10px] text-text-muted">Mais mensagens, posts e recursos</p>
              </div>
              <svg className="w-4 h-4 text-accent group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Scrollable sections — min-h-0 obrigatório em flex para overflow funcionar */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ═══ HISTÓRICO ═══ */}
          {chatList && chatList.length > 0 && (
            <Section id="history" icon="📋" title="Histórico" defaultOpen>
              {chatList.length > 3 && (
                <div className="mb-1.5 px-1">
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar conversa..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-border-light focus:border-accent focus:outline-none text-text placeholder-text-light"
                    aria-label="Buscar no histórico de chats"
                  />
                </div>
              )}
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {filteredChats.length === 0 && historySearch && (
                  <p className="text-[11px] text-text-light px-2.5 py-2">Nenhum chat encontrado</p>
                )}
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-1.5 rounded-lg transition-colors ${
                      chat.id === activeChatId ? 'bg-accent-bg' : 'hover:bg-surface-alt'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelectChat(chat.id);
                        onClose();
                      }}
                      className="flex-1 text-left text-xs text-text-muted truncate px-2.5 py-2"
                      title={chat.title}
                    >
                      <span className="mr-1.5">💬</span>
                      {chat.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center text-text-light hover:text-rose transition-all mr-1"
                      title="Excluir chat"
                      aria-label="Excluir chat"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ═══ CRIAR ═══ */}
          <div className="px-3 py-1">
            <button
              onClick={() => { onTabChange('post'); onClose(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === 'post' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
              }`}
            >
              <span className="text-sm">🎨</span>
              <span className="text-[11px] font-semibold text-text-light uppercase tracking-wider">Criar Post</span>
            </button>
          </div>

          {/* ═══ APRENDER ═══ */}
          <div className="px-3 py-1">
            <button
              onClick={() => {
                onTabChange('learn');
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === 'learn' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
              }`}
            >
              <span className="text-sm">📚</span>
              <span className="text-[11px] font-semibold text-text-light uppercase tracking-wider">Aprender</span>
            </button>
          </div>

          {/* ═══ MEU NEGÓCIO ═══ */}
          <Section id="business" icon="💼" title="Meu Negócio">
            <div className="space-y-1 px-1">
              <button
                onClick={() => { onTabChange('business'); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'business' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">🚀</span>
                <span className="text-xs font-medium">Hub de Negócios</span>
              </button>
              <button
                onClick={() => { onTabChange('instagram-zero'); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'instagram-zero' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">📱</span>
                <span className="text-xs font-medium">Instagram do Zero</span>
              </button>
              <button
                onClick={() => { onTabChange('pricing'); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'pricing' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">💰</span>
                <span className="text-xs font-medium">Calculadora de Preço</span>
              </button>
              <button
                onClick={() => { if (isFree) { onUpgrade?.(); } else { onTabChange('digital-menu'); onClose(); } }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'digital-menu' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">📋</span>
                <span className="text-xs font-medium">Catálogo de Serviços{isFree ? ' 🔒' : ''}</span>
              </button>
              <button
                onClick={() => { onTabChange('favorites'); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'favorites' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">⭐</span>
                <span className="text-xs font-medium">Salvos</span>
              </button>
            </div>
          </Section>

          {/* ═══ CONFIGURAÇÕES ═══ */}
          <Section id="settings" icon="⚙️" title="Configurações">
            <div className="space-y-1 px-1">
              {/* Nível */}
              <div>
                <button
                  onClick={() => setShowLevelPicker(!showLevelPicker)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-text-muted hover:bg-surface-alt hover:text-text transition-colors"
                >
                  <span className="text-sm">{levelInfo.icon}</span>
                  <span className="text-xs font-medium flex-1">Nível: {levelInfo.label}</span>
                  <span className="text-[10px] text-accent font-medium">Trocar</span>
                </button>
                {showLevelPicker && (
                  <div className="ml-2 mt-1 bg-surface-card border border-border rounded-xl shadow-elevated overflow-hidden animate-fade-in">
                    {Object.entries(LEVEL_LABELS).map(([key, val]) => {
                      const levelLocked = isFree && key !== 'iniciante';
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            if (levelLocked) { onUpgrade?.(); return; }
                            onChangeLevel(key);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-alt transition-colors ${
                            user?.level === key ? 'bg-accent-bg' : ''
                          } ${levelLocked ? 'opacity-60' : ''}`}
                        >
                          <span className="text-sm">{val.icon}</span>
                          <span className="text-xs font-medium text-text">{val.label}</span>
                          {levelLocked && <span className="ml-auto"><UpgradeInlineBadge label="Pro" onUpgrade={onUpgrade} /></span>}
                          {!levelLocked && user?.level === key && (
                            <svg className="w-3.5 h-3.5 ml-auto text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Planos */}
              <button
                onClick={() => { onTabChange('plans'); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'plans' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">💎</span>
                <span className="text-xs font-medium flex-1">Planos</span>
                <span className="text-[10px] text-text-light">
                  {currentPlan === 'premium' ? '✨ Premium' : currentPlan === 'pro' ? '💅 Pro' : 'Grátis'}
                </span>
              </button>
              {/* Tema */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-text-muted hover:bg-surface-alt hover:text-text transition-colors"
              >
                <span className="text-sm">{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span className="text-xs font-medium">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
              </button>
            </div>
          </Section>

        </div>

        {/* Footer - User info compacto — flex-shrink-0 garante posição fixa */}
        <div ref={userMenuRef} className="flex-shrink-0 p-3 border-t border-border-light relative">
          <button
            onClick={() => setShowUserMenu(prev => !prev)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg w-full cursor-pointer hover:bg-surface-alt transition-colors"
          >
            <div className="w-7 h-7 bg-accent-light rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-accent">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-text truncate">{user?.name}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  currentPlan === 'premium' ? 'bg-gradient-to-r from-accent to-rose text-white' :
                  currentPlan === 'pro' ? 'bg-accent-bg text-accent' :
                  'bg-surface-alt text-text-light'
                }`}>
                  {currentPlan === 'premium' ? 'Premium' : currentPlan === 'pro' ? 'Pro' : 'Free'}
                </span>
              </div>
              <p className="text-[10px] text-text-light">{levelInfo.icon} {levelInfo.label}</p>
            </div>
            <svg className={`w-3.5 h-3.5 text-text-light transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {/* Popover que abre para CIMA — nunca cobre nav items */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-surface-card border border-border rounded-xl shadow-elevated z-50 animate-fade-in">
              <div className="p-2 space-y-0.5 text-[11px]">
                <a
                  href="/api/account/export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-bg transition-colors"
                >
                  📦 Exportar meus dados
                </a>
                <button
                  onClick={() => { setShowChangePassword(true); setShowUserMenu(false); setPasswordError(''); setPasswordSuccess(false); setNewPassword(''); setConfirmPassword(''); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-bg transition-colors w-full text-left"
                >
                  🔑 Trocar senha
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Tem certeza? TODOS os seus dados serão excluídos permanentemente. Essa ação não pode ser desfeita.')) return;
                    if (!confirm('Última chance: realmente deseja excluir sua conta?')) return;
                    try {
                      const res = await fetch('/api/account/delete', { method: 'DELETE', headers: { 'Authorization': `Bearer ${window.__maluarToken || ''}` } });
                      if (res.ok) {
                        alert('Conta excluída com sucesso.');
                        onSignOut?.();
                      } else {
                        alert('Erro ao excluir conta. Tente novamente.');
                      }
                    } catch { alert('Erro de conexão.'); }
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-muted hover:text-rose hover:bg-rose-light transition-colors w-full text-left"
                >
                  🗑️ Excluir minha conta
                </button>
                {currentPlan !== 'free' && currentPlan && onManageSubscription && (
                  <button
                    onClick={onManageSubscription}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors w-full text-left"
                  >
                    💳 Cancelar assinatura
                  </button>
                )}
                <div className="flex gap-3 px-2.5 py-1 text-text-light">
                  <a href="/termos" className="hover:text-accent transition-colors">Termos</a>
                  <a href="/privacidade" className="hover:text-accent transition-colors">Privacidade</a>
                </div>
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-muted hover:text-rose hover:bg-rose-light transition-colors w-full text-left"
                >
                  🚪 Sair
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Trocar Senha */}
        {showChangePassword && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowChangePassword(false); }}>
            <div className="bg-surface-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-elevated animate-scale-in">
              {passwordSuccess ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <h3 className="text-center font-bold text-text mb-1">Senha alterada!</h3>
                  <p className="text-center text-sm text-text-muted mb-4">Sua senha foi atualizada com sucesso.</p>
                  <button onClick={() => setShowChangePassword(false)} className="w-full py-2.5 rounded-xl font-semibold text-sm btn-gradient">
                    Fechar
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-center font-bold text-text mb-1">Trocar Senha</h3>
                  <p className="text-center text-sm text-text-muted mb-5">Digite sua nova senha (mínimo 6 caracteres).</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-text-muted font-semibold mb-1 block">Nova senha</label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                          autoFocus
                        />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text transition-colors">
                          {showNewPw ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          )}
                        </button>
                      </div>
                      {newPassword.length > 0 && newPassword.length < 6 && (
                        <p className="text-[10px] text-rose mt-1">A senha precisa ter pelo menos 6 caracteres ({6 - newPassword.length} faltando)</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-text-muted font-semibold mb-1 block">Confirmar nova senha</label>
                      <div className="relative">
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                          placeholder="Repita a nova senha"
                          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                        />
                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text transition-colors">
                          {showConfirmPw ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          )}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                        <p className="text-[10px] text-rose mt-1">As senhas não coincidem</p>
                      )}
                    </div>
                  </div>
                  {passwordError && <p className="text-rose text-xs font-medium mt-3">{passwordError}</p>}
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setShowChangePassword(false)}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold bg-surface-alt text-text-muted rounded-xl hover:bg-border-light transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={passwordLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold btn-gradient rounded-xl disabled:opacity-50 transition-colors"
                    >
                      {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
