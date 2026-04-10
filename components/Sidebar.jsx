'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { UpgradeInlineBadge } from './UpgradePrompt';

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
  const [historySearch, setHistorySearch] = useState('');
  const { theme, toggle: toggleTheme } = useTheme();
  const modules = MODULES_BY_LEVEL[user?.level] || MODULES_BY_LEVEL.iniciante;
  const levelInfo = LEVEL_LABELS[user?.level] || LEVEL_LABELS.iniciante;
  const isFree = currentPlan === 'free' || !currentPlan;

  const filteredChats = historySearch.trim()
    ? chatList.filter((c) => c.title?.toLowerCase().includes(historySearch.toLowerCase()))
    : chatList;

  // Componente reutilizável pra seção colapsável
  const Section = ({ icon, title, children, defaultOpen = false }) => (
    <details open={defaultOpen} className="group/section">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-surface-alt transition-colors list-none">
        <span className="text-sm">{icon}</span>
        <span className="text-[11px] font-semibold text-text-light uppercase tracking-wider flex-1">{title}</span>
        <svg className="w-3.5 h-3.5 text-text-light group-open/section:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-2 pb-2">
        {children}
      </div>
    </details>
  );

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
        <div className="px-3 pb-2 pt-2">
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
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ HISTÓRICO ═══ */}
          {chatList && chatList.length > 0 && (
            <Section icon="📋" title="Histórico">
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
          <Section icon="🎨" title="Criar" defaultOpen>
            <div className="space-y-1 px-1">
              <button
                onClick={() => { onTabChange('post'); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'post' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">✍️</span>
                <span className="text-xs font-medium">Criar Post</span>
              </button>
              <button
                onClick={() => { onTabChange('image'); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  activeTab === 'image' ? 'bg-accent-bg text-accent' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <span className="text-sm">✨</span>
                <span className="text-xs font-medium flex-1">Criar Imagem IA</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-accent to-rose text-white">PRO</span>
              </button>
            </div>
          </Section>

          {/* ═══ APRENDER ═══ */}
          <div className="px-3 py-1">
            <button
              onClick={() => {
                const level = user?.level || 'iniciante';
                const levelLabel = LEVEL_LABELS[level]?.label || 'Iniciante';
                onSendPrompt(`Sou nail designer nível ${levelLabel.toLowerCase()}. Quero aprender e evoluir na profissão. Me sugira os próximos passos e o que estudar.`);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-text-muted hover:bg-surface-alt hover:text-text transition-colors"
            >
              <span className="text-sm">📚</span>
              <span className="text-[11px] font-semibold text-text-light uppercase tracking-wider">Aprender</span>
            </button>
          </div>

          {/* ═══ MEU NEGÓCIO ═══ */}
          <Section icon="💼" title="Meu Negócio">
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
                onClick={() => { onSendPrompt('Como montar meu Instagram profissional do zero? Me dá um plano completo'); onClose(); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-text-muted hover:bg-surface-alt hover:text-text transition-colors"
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
          <Section icon="⚙️" title="Configurações">
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

        {/* Footer - User info compacto */}
        <div className="p-3 border-t border-border-light">
          <details className="group">
            <summary className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-surface-alt transition-colors list-none">
              <div className="w-7 h-7 bg-accent-light rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-accent">{user?.name?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">{user?.name}</p>
                <p className="text-[10px] text-text-light">{levelInfo.icon} {levelInfo.label}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-text-light group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-1 ml-2 mr-1 space-y-0.5 text-[11px]">
              <a
                href="/api/account/export"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent-bg transition-colors"
              >
                📦 Exportar meus dados
              </a>
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
          </details>
        </div>
      </aside>
    </>
  );
}
