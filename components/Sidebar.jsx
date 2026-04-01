'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';

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
  ],
};

export default function Sidebar({ user, onSendPrompt, onOpenPostGenerator, activeTab, onTabChange, onChangeLevel, isOpen, onClose, chatList, activeChatId, onSelectChat, onDeleteChat, onSignOut }) {
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const { theme, toggle: toggleTheme } = useTheme();
  const modules = MODULES_BY_LEVEL[user?.level] || MODULES_BY_LEVEL.iniciante;
  const levelInfo = LEVEL_LABELS[user?.level] || LEVEL_LABELS.iniciante;

  const filteredChats = historySearch.trim()
    ? chatList.filter((c) => c.title?.toLowerCase().includes(historySearch.toLowerCase()))
    : chatList;

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
            <img src="/logo-icon.png" alt="Maluar" className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-[15px] font-bold bg-gradient-to-r from-[#534AB7] via-[#7F77DD] to-[#D4537E] dark:from-[#AFA9EC] dark:via-[#7F77DD] dark:to-[#D4537E] bg-clip-text text-transparent leading-tight">Maluar</h1>
              <p className="text-[9px] text-text-light font-medium tracking-wider uppercase">Nail Design AI</p>
            </div>
          </div>
        </div>

        {/* Header - New Chat button */}
        <div className="px-3 pb-1 pt-2">
          <button
            onClick={() => {
              onSendPrompt(null);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:bg-surface-alt transition-colors"
          >
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[13px] font-medium text-text flex-1 text-left">Novo chat</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-3 pb-2">
          <div className="flex bg-surface-alt rounded-lg p-0.5">
            <button
              onClick={() => onTabChange('chat')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === 'chat'
                  ? 'bg-surface-card text-text shadow-soft'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onTabChange('post')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === 'post'
                  ? 'bg-surface-card text-text shadow-soft'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Post
            </button>
            <button
              onClick={() => onTabChange('favorites')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                activeTab === 'favorites'
                  ? 'bg-surface-card text-text shadow-soft'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              ⭐ Salvos
            </button>
          </div>
        </div>

        {/* Level badge */}
        <div className="px-3 pb-2">
          <div className="text-[10px] font-medium text-text-light uppercase tracking-wider px-1 mb-1.5">
            Seu nível
          </div>
          <button
            onClick={() => setShowLevelPicker(!showLevelPicker)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-bg border border-accent/10 hover:border-accent/30 transition-colors"
          >
            <span className="text-sm">{levelInfo.icon}</span>
            <span className="text-xs font-medium text-text flex-1 text-left">{levelInfo.label}</span>
            <span className="text-[10px] text-accent font-medium">Trocar</span>
          </button>

          {/* Level picker dropdown */}
          {showLevelPicker && (
            <div className="mt-1.5 bg-surface-card border border-border rounded-xl shadow-elevated overflow-hidden animate-fade-in">
              {Object.entries(LEVEL_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => {
                    onChangeLevel(key);
                    setShowLevelPicker(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-alt transition-colors ${
                    user?.level === key ? 'bg-accent-bg' : ''
                  }`}
                >
                  <span className="text-sm">{val.icon}</span>
                  <span className="text-xs font-medium text-text">{val.label}</span>
                  {user?.level === key && (
                    <svg className="w-3.5 h-3.5 ml-auto text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="px-3">
          <div className="border-t border-border-light" />
        </div>

        {/* Fixed shortcuts — visible in all tabs/levels */}
        <div className="px-3 py-2 space-y-1.5">
          <button
            onClick={() => {
              onTabChange('pricing');
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl border transition-colors ${
              activeTab === 'pricing'
                ? 'border-accent/30 bg-accent-light text-accent'
                : 'border-border-light bg-surface-card hover:bg-surface-alt text-text-muted hover:text-text'
            }`}
          >
            <span className="text-base">💰</span>
            <div className="flex-1 text-left">
              <span className="text-[13px] font-semibold block leading-tight">Calculadora de Preço</span>
              <span className="text-[10px] text-text-muted">Materiais + tempo = preço ideal</span>
            </div>
            <svg className="w-4 h-4 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Chat History */}
        {chatList && chatList.length > 0 && activeTab === 'chat' && (
          <div className="px-3 py-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 w-full px-1 mb-1"
            >
              <div className="text-[10px] font-medium text-text-light uppercase tracking-wider flex-1 text-left">
                Histórico
              </div>
              <svg
                className={`w-3.5 h-3.5 text-text-light transition-transform ${showHistory ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showHistory && (
              <>
                {chatList.length > 3 && (
                  <div className="mb-1.5">
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
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
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
              </>
            )}
            <div className="border-t border-border-light mt-2" />
          </div>
        )}

        {/* Modules */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {activeTab === 'chat' && (
            <>
              {/* Recria Design — atalho fixo */}
              <button
                onClick={() => {
                  onSendPrompt('Quero recriar um design — vou te mandar a foto de referência. Me dê: passo a passo detalhado, materiais, tempo estimado e valor sugerido para cobrar.');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2.5 mb-2 rounded-xl border border-accent/20 bg-accent-bg hover:bg-accent-light transition-colors"
              >
                <span className="text-base">📸</span>
                <div className="flex-1 text-left">
                  <span className="text-[13px] font-semibold text-accent block leading-tight">Recria esse Design</span>
                  <span className="text-[10px] text-text-muted">Manda a foto e receba o passo a passo</span>
                </div>
                <svg className="w-4 h-4 text-accent/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="text-[10px] font-medium text-text-light uppercase tracking-wider px-1 mb-1.5 mt-1">
                Sugestões pra você
              </div>
              {modules.map((mod, idx) => (
                <details key={idx} className="group">
                  <summary className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-surface-alt transition-colors list-none">
                    <span className="text-sm">{mod.icon}</span>
                    <span className="text-[13px] font-medium text-text-muted group-open:text-text">
                      {mod.label}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 ml-auto text-text-light group-open:rotate-180 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="pl-8 pr-1 pb-1 space-y-0.5">
                    {mod.prompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onSendPrompt(prompt);
                          onClose();
                        }}
                        className="w-full text-left text-xs text-text-muted hover:text-accent px-2 py-1.5 rounded-md hover:bg-accent-bg transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </>
          )}

          {activeTab === 'post' && (
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-medium text-text-light uppercase tracking-wider px-1 mb-1.5">
                Criar conteúdo
              </div>
              {[
                'Cria uma legenda pro Instagram',
                'Post antes/depois de alongamento',
                'Copy pra stories com promoção',
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onOpenPostGenerator?.(prompt);
                    onClose();
                  }}
                  className="w-full text-left text-xs text-text-muted hover:text-accent px-2.5 py-2 rounded-lg hover:bg-accent-bg transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 text-text-light shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {prompt}
                </button>
              ))}
              <button
                onClick={() => {
                  onOpenPostGenerator?.();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-soft mt-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Post
              </button>
            </div>
          )}
        </div>

        {/* Footer - User info + theme toggle */}
        <div className="p-3 border-t border-border-light">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 bg-accent-light rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-accent">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text truncate">{user?.name}</p>
              <p className="text-[10px] text-text-light">Maluar AI</p>
            </div>
            <button
              onClick={toggleTheme}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-light hover:text-accent hover:bg-accent-bg transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-light hover:text-rose hover:bg-rose-light transition-colors"
                title="Sair"
                aria-label="Sair da conta"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
