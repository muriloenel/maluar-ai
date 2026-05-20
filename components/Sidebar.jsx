'use client';

/*
  components/Sidebar.jsx — Redesign "Soft Feminino"
  Toda a lógica de menu, histórico, troca de senha, exportar dados, gerenciar
  assinatura e LGPD foi preservada do arquivo original.
  Visual: dock vertical refinado, ícones lineares, glass cards, sem emojis.
*/

import { useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { UpgradeInlineBadge } from './UpgradePrompt';
import { getSupabase } from '../lib/supabase';
import Icon from './Icon';
import MaluarMark from './MaluarMark';

const LEVEL_INFO = {
  iniciante:     { label: 'Iniciante',    icon: 'sparkle' },
  intermediario: { label: 'Intermediária', icon: 'feather' },
  avancada:      { label: 'Avançada',     icon: 'diamond' },
};

const MODULES_BY_LEVEL = {
  iniciante: [
    { icon: 'sparkle',    label: 'Primeiros Passos',  prompts: ['Como começo do zero em nail design?','Preciso de curso pra começar?','Quanto tempo leva pra atender bem?'] },
    { icon: 'briefcase',  label: 'Kit Iniciante',     prompts: ['Qual kit montar com até R$500?','Qual cabine LED comprar?','Melhor gel custo-benefício?'] },
    { icon: 'book',       label: 'Técnicas Básicas',  prompts: ['Como fazer esmaltação gel?','Qual a diferença entre gel e polygel?','Como fazer uma boa cuticulagem?'] },
    { icon: 'star',       label: 'Rotina de Treino',  prompts: ['Monta uma rotina de treino pra mim','Quanto treinar por dia?','Treino em tip ou em mão?'] },
    { icon: 'user',       label: 'Primeiras Clientes', prompts: ['Como conseguir as primeiras clientes?','Devo atender de graça no começo?','Quanto cobrar sendo iniciante?'] },
    { icon: 'calculator', label: 'Começar a Lucrar',  prompts: ['Monta um plano pra eu conseguir minhas 10 primeiras clientes','Quanto preciso investir pra começar a lucrar?','Me ajuda a calcular o preço certo dos meus serviços'] },
  ],
  intermediario: [
    { icon: 'feather',    label: 'Aperfeiçoamento', prompts: ['Como melhorar meu acabamento?','Dicas pra baby boomer perfeito','Minha cutícula ainda fica ruim, me ajuda'] },
    { icon: 'sparkle',    label: 'Nail Art',        prompts: ['Nail art fácil que agrega valor','Como fazer francesinha perfeita?','Tendências de nail art 2025-2026'] },
    { icon: 'calculator', label: 'Precificação',    prompts: ['Quanto cobrar por alongamento?','Como subir meu preço sem perder cliente?','Tabela de preços pra minha região'] },
    { icon: 'image',      label: 'Feedback',        prompts: ['Analisa minha unha (manda foto)','O que posso melhorar na técnica?','Meu nivelamento tá bom?'] },
    { icon: 'instagram',  label: 'Marketing',       prompts: ['Dicas de Instagram pra nail designer','Como fazer Reels que engajam?','Melhores horários pra postar'] },
    { icon: 'trend',      label: 'Captar Clientes', prompts: ['Monta um plano de captação de clientes pra 30 dias','Como fazer parcerias locais pra conseguir clientes?','Me dá templates de mensagem pro WhatsApp pra atrair clientes'] },
    { icon: 'briefcase',  label: 'Gestão Financeira', prompts: ['Me ajuda a calcular o custo real do meu serviço','Como separar meu dinheiro pessoal do negócio?','Quero faturar R$5.000/mês, monta um plano pra mim'] },
    { icon: 'book',       label: 'Organizar Rotina', prompts: ['Sou mãe e nail designer, me ajuda a montar uma rotina','Como organizar minha agenda de atendimentos?','Técnica de batch: como criar conteúdo da semana toda em 2 horas'] },
  ],
  avancada: [
    { icon: 'diamond',    label: 'Técnicas Avançadas', prompts: ['Como fazer encapsulamento perfeito?','Dicas pra nail art 3D','Técnica russa: melhores práticas'] },
    { icon: 'trend',      label: 'Escalar Negócio',    prompts: ['Como montar um ateliê de nail?','Devo contratar assistente?','Como fidelizar clientes de alto ticket'] },
    { icon: 'star',       label: 'Posicionamento',     prompts: ['Como me posicionar como premium?','Estratégia pra cobrar acima de R$200','Como criar lista de espera'] },
    { icon: 'instagram',  label: 'Conteúdo Pro',       prompts: ['Estratégia de conteúdo pro Instagram','Como atrair clientas pelo TikTok','Portfólio: como montar o ideal'] },
    { icon: 'book',       label: 'Mentoria',           prompts: ['Como criar meu próprio curso?','Vale a pena ser educadora de marca?','Como cobrar por consultoria'] },
    { icon: 'briefcase',  label: 'Formalizar Empresa', prompts: ['Como abrir MEI pra nail designer?','Quando devo migrar de MEI pra ME?','Me explica sobre conta PJ e máquininha'] },
    { icon: 'globe',      label: 'Diversificar Renda', prompts: ['Quais outras formas de ganhar dinheiro além de atender?','Como criar e vender um curso online?','Como ser educadora de marca de produtos?'] },
  ],
};

export default function Sidebar({
  user, onSendPrompt, onOpenPostGenerator, activeTab, onTabChange,
  onChangeLevel, isOpen, onClose, chatList, activeChatId,
  onSelectChat, onDeleteChat, onSignOut, currentPlan, onUpgrade, onManageSubscription, onCancelSubscription,
}) {
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [openSections, setOpenSections] = useState({ history: true });
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
    if (newPassword.length < 6) { setPasswordError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('As senhas não coincidem.'); return; }
    setPasswordLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) { setPasswordError('Serviço indisponível.'); setPasswordLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('same') || msg.includes('different')) setPasswordError('A nova senha deve ser diferente da atual.');
        else if (msg.includes('rate limit') || msg.includes('too many')) setPasswordError('Muitas tentativas. Aguarde alguns minutos.');
        else setPasswordError('Erro ao alterar senha. Tente novamente.');
      } else {
        setPasswordSuccess(true);
        setNewPassword(''); setConfirmPassword('');
      }
    } catch { setPasswordError('Erro de conexão. Verifique sua internet.'); }
    setPasswordLoading(false);
  };

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  const levelInfo = LEVEL_INFO[user?.level] || LEVEL_INFO.iniciante;
  const isFree = currentPlan === 'free' || !currentPlan;
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const filteredChats = historySearch.trim()
    ? (chatList || []).filter((c) => c.title?.toLowerCase().includes(historySearch.toLowerCase()))
    : (chatList || []);

  // ─── UI helpers ────────────────────────────────────────────────────
  const Section = ({ id, icon, title, children, defaultOpen = false }) => {
    const isOpenS = openSections[id] !== undefined ? openSections[id] : defaultOpen;
    return (
      <div className="px-2">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer select-none hover:bg-surface-alt transition-colors"
        >
          <Icon name={icon} size={14} className="text-accent" />
          <span className="text-[10px] font-bold text-text-light uppercase tracking-[0.22em] flex-1 text-left">{title}</span>
          <Icon name="chevronDown" size={12} className={`text-text-light transition-transform ${isOpenS ? '' : '-rotate-90'}`} />
        </button>
        {isOpenS && <div className="mt-1 mb-2">{children}</div>}
      </div>
    );
  };

  const NavItem = ({ tab, icon, label, badge, locked, onClick }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={onClick}
        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
          isActive
            ? 'bg-accent-bg text-accent ring-1 ring-accent/20'
            : 'text-text-muted hover:bg-surface-alt hover:text-text'
        }`}
      >
        <span className={`flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
          <Icon name={icon} size={17} />
        </span>
        <span className="text-[13px] font-medium flex-1">{label}</span>
        {badge}
        {locked && <Icon name="lock" size={12} className="text-text-light" />}
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed md:static top-0 left-0 h-full w-[280px] bg-surface-card border-r border-border-light z-40 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* ─── Brand ─── */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <MaluarMark size={32} />
          <div className="leading-tight">
            <div className="font-display text-lg">Maluar</div>
            <div className="text-[9px] text-text-light tracking-[0.28em] uppercase font-semibold">Nail Design AI</div>
          </div>
        </div>

        {/* ─── New chat + upgrade ─── */}
        <div className="px-3 pb-3 space-y-2">
          <button
            onClick={() => { onSendPrompt(null); onClose(); }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border border-border-light hover:border-accent/40 hover:bg-accent-bg transition-all group"
          >
            <span className="w-7 h-7 rounded-lg bg-accent-bg text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon name="plus" size={14} />
            </span>
            <span className="text-[13px] font-semibold text-text flex-1 text-left">Nova mentoria</span>
          </button>

          {isFree && (
            <button
              onClick={() => { onUpgrade?.(); onClose(); }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all group relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, var(--color-accent-hover), var(--color-accent), var(--color-mauve))' }}
            >
              <span className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Icon name="diamond" size={14} className="text-white" />
              </span>
              <div className="flex-1 leading-tight">
                <p className="text-[11px] text-white/85 font-italic-display italic">eleve para o</p>
                <p className="text-[13px] font-bold text-white">Maluar Studio</p>
              </div>
              <Icon name="arrowRight" size={14} className="text-white/90 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {/* ─── Scrollable nav ─── */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-3">
          {/* HISTÓRICO */}
          {chatList && chatList.length > 0 && (
            <Section id="history" icon="chat" title="Histórico" defaultOpen>
              {chatList.length > 3 && (
                <div className="px-3 mb-2 relative">
                  <Icon name="search" size={13} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light pointer-events-none" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar conversa…"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg bg-surface-alt border border-transparent focus:border-accent focus:bg-surface-card focus:outline-none text-text placeholder-text-light"
                  />
                </div>
              )}
              <div className="px-2 space-y-0.5 max-h-56 overflow-y-auto">
                {filteredChats.length === 0 && historySearch && (
                  <p className="text-[11px] text-text-light px-3 py-2">Nenhum chat encontrado</p>
                )}
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-1 rounded-lg transition-colors ${
                      chat.id === activeChatId ? 'bg-accent-bg ring-1 ring-accent/20' : 'hover:bg-surface-alt'
                    }`}
                  >
                    <button
                      onClick={() => { onSelectChat(chat.id); onClose(); }}
                      className="flex-1 text-left text-xs text-text-muted truncate px-3 py-2"
                      title={chat.title}
                    >
                      <span className={chat.id === activeChatId ? 'text-accent font-medium' : ''}>{chat.title}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                      className="opacity-0 group-hover:opacity-100 shrink-0 w-7 h-7 flex items-center justify-center text-text-light hover:text-accent transition-all mr-1"
                      aria-label="Excluir chat"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* CRIAR / APRENDER (single tab links) */}
          <div className="px-3 mt-1">
            <NavItem
              tab="post"
              icon="sparkle"
              label="Criar Post"
              onClick={() => { onTabChange('post'); onClose(); }}
            />
            <NavItem
              tab="learn"
              icon="book"
              label="Aprender"
              onClick={() => { onTabChange('learn'); onClose(); }}
            />
          </div>

          {/* MEU NEGÓCIO */}
          <Section id="business" icon="briefcase" title="Meu Negócio" defaultOpen>
            <div className="px-1 space-y-0.5">
              <NavItem tab="business"        icon="trend"      label="Hub de Negócios"    onClick={() => { onTabChange('business'); onClose(); }} />
              <NavItem tab="instagram-zero"  icon="instagram"  label="Instagram do Zero"  onClick={() => { onTabChange('instagram-zero'); onClose(); }} />
              <NavItem tab="pricing"         icon="calculator" label="Calculadora de Preço" onClick={() => { onTabChange('pricing'); onClose(); }} />
              <NavItem
                tab="digital-menu"
                icon="globe"
                label="Catálogo de Serviços"
                locked={isFree}
                onClick={() => { if (isFree) onUpgrade?.(); else { onTabChange('digital-menu'); onClose(); } }}
              />
              <NavItem tab="favorites"       icon="bookmark"   label="Salvos"             onClick={() => { onTabChange('favorites'); onClose(); }} />
            </div>
          </Section>

          {/* CONFIGURAÇÕES */}
          <Section id="settings" icon="user" title="Configurações">
            <div className="px-1 space-y-0.5">
              {/* Nível */}
              <div className="relative">
                <button
                  onClick={() => setShowLevelPicker(!showLevelPicker)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-surface-alt hover:text-text transition-all"
                >
                  <Icon name={levelInfo.icon} size={17} className="text-accent" />
                  <span className="text-[13px] font-medium flex-1 text-left">Nível: {levelInfo.label}</span>
                  <Icon name="chevronDown" size={12} className={`text-text-light transition-transform ${showLevelPicker ? 'rotate-180' : ''}`} />
                </button>
                {showLevelPicker && (
                  <div className="ml-2 mt-1 glass-card rounded-xl overflow-hidden animate-fade-in">
                    {Object.entries(LEVEL_INFO).map(([key, val]) => {
                      const locked = isFree && key !== 'iniciante';
                      const isCurrent = user?.level === key;
                      return (
                        <button
                          key={key}
                          onClick={() => { if (locked) { onUpgrade?.(); return; } onChangeLevel(key); setShowLevelPicker(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent-bg transition-colors ${
                            isCurrent ? 'bg-accent-bg' : ''
                          } ${locked ? 'opacity-60' : ''}`}
                        >
                          <Icon name={val.icon} size={15} className={isCurrent ? 'text-accent' : 'text-text-muted'} />
                          <span className="text-xs font-medium text-text flex-1">{val.label}</span>
                          {locked && <UpgradeInlineBadge label="Pro" onUpgrade={onUpgrade} />}
                          {!locked && isCurrent && <Icon name="check" size={13} className="text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Planos */}
              <button
                onClick={() => { onTabChange('plans'); onClose(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeTab === 'plans' ? 'bg-accent-bg text-accent ring-1 ring-accent/20' : 'text-text-muted hover:bg-surface-alt hover:text-text'
                }`}
              >
                <Icon name="diamond" size={17} />
                <span className="text-[13px] font-medium flex-1 text-left">Planos</span>
                <span className={`text-[10px] font-bold tracking-wide ${
                  currentPlan === 'premium' ? 'text-rosegold' : currentPlan === 'pro' ? 'text-accent' : 'text-text-light'
                }`}>
                  {currentPlan === 'premium' ? 'Premium' : currentPlan === 'pro' ? 'Pro' : 'Grátis'}
                </span>
              </button>

              {/* Tema */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-muted hover:bg-surface-alt hover:text-text transition-all"
              >
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
                <span className="text-[13px] font-medium">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
              </button>
            </div>
          </Section>
        </div>

        {/* ─── Footer: user ─── */}
        <div ref={userMenuRef} className="flex-shrink-0 p-3 border-t border-border-light relative">
          <button
            onClick={() => setShowUserMenu(prev => !prev)}
            className="flex items-center gap-3 px-2 py-2 rounded-xl w-full cursor-pointer hover:bg-surface-alt transition-colors"
          >
            <div className="w-9 h-9 rounded-full ai-avatar flex items-center justify-center text-white font-display text-base flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-text truncate">{user?.name}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                  currentPlan === 'premium' ? 'bg-gradient-brand text-white' :
                  currentPlan === 'pro'     ? 'bg-accent-bg text-accent' :
                                              'bg-surface-alt text-text-light'
                }`}>
                  {currentPlan === 'premium' ? 'Premium' : currentPlan === 'pro' ? 'Pro' : 'Free'}
                </span>
              </div>
              <p className="text-[10px] text-text-light uppercase tracking-wider font-medium">{levelInfo.label}</p>
            </div>
            <Icon name="chevronDown" size={13} className={`text-text-light transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 glass-card rounded-xl overflow-hidden z-50 animate-fade-in">
              <div className="p-2 space-y-0.5 text-[12px]">
                <a href="/api/account/export" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-bg transition-colors">
                  <Icon name="download" size={14} /> Exportar meus dados
                </a>
                <button
                  onClick={() => { setShowChangePassword(true); setShowUserMenu(false); setPasswordError(''); setPasswordSuccess(false); setNewPassword(''); setConfirmPassword(''); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-bg transition-colors"
                >
                  <Icon name="key" size={14} /> Trocar senha
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('Tem certeza? TODOS os seus dados serão excluídos permanentemente. Essa ação não pode ser desfeita.')) return;
                    if (!confirm('Última chance: realmente deseja excluir sua conta?')) return;
                    try {
                      const res = await fetch('/api/account/delete', { method: 'DELETE', headers: { 'Authorization': `Bearer ${window.__maluarToken || ''}` } });
                      if (res.ok) { alert('Conta excluída com sucesso.'); onSignOut?.(); }
                      else alert('Erro ao excluir conta. Tente novamente.');
                    } catch { alert('Erro de conexão.'); }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-bg transition-colors"
                >
                  <Icon name="trash" size={14} /> Excluir minha conta
                </button>
                {currentPlan !== 'free' && currentPlan && onManageSubscription && (
                  <button onClick={onManageSubscription} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-bg transition-colors">
                    <Icon name="diamond" size={14} /> Gerenciar assinatura
                  </button>
                )}
                {currentPlan !== 'free' && currentPlan && onCancelSubscription && (
                  <button onClick={() => { setShowCancelModal(true); setShowUserMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    <Icon name="close" size={14} /> Cancelar assinatura
                  </button>
                )}
                <div className="border-t border-border-light my-1" />
                <div className="flex gap-3 px-3 py-1.5 text-[11px] text-text-light">
                  <a href="/termos" className="hover:text-accent transition-colors">Termos</a>
                  <a href="/privacidade" className="hover:text-accent transition-colors">Privacidade</a>
                </div>
                <button onClick={onSignOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-muted hover:text-accent hover:bg-accent-bg transition-colors">
                  <Icon name="logout" size={14} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Trocar Senha */}
        {showChangePassword && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md px-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowChangePassword(false); }}
          >
            <div className="glass-card rounded-3xl p-7 max-w-sm w-full animate-scale-in">
              {passwordSuccess ? (
                <>
                  <div className="w-14 h-14 rounded-full ai-avatar flex items-center justify-center mx-auto mb-4 text-white">
                    <Icon name="check" size={24} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-center font-display text-2xl mb-1">Senha alterada</h3>
                  <p className="text-center text-sm text-text-muted mb-5">Sua senha foi atualizada com sucesso.</p>
                  <button onClick={() => setShowChangePassword(false)} className="w-full py-3 rounded-xl text-sm btn-gradient">
                    Fechar
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-center font-display text-2xl mb-1">Trocar senha</h3>
                  <p className="text-center text-sm text-text-muted mb-6">Digite sua nova senha (mínimo 6 caracteres).</p>

                  <div className="space-y-4">
                    {[
                      { label: 'Nova senha',   value: newPassword,     show: showNewPw,     setShow: setShowNewPw,     onChange: setNewPassword,     placeholder: 'Mínimo 6 caracteres' },
                      { label: 'Confirmar senha', value: confirmPassword, show: showConfirmPw, setShow: setShowConfirmPw, onChange: setConfirmPassword, placeholder: 'Repita a nova senha' },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="text-xs font-semibold text-text mb-1.5 block">{f.label}</label>
                        <div className="relative">
                          <input
                            type={f.show ? 'text' : 'password'}
                            value={f.value}
                            onChange={(e) => { f.onChange(e.target.value); setPasswordError(''); }}
                            placeholder={f.placeholder}
                            className="w-full bg-surface-card border border-border-light rounded-xl px-4 py-3 pr-11 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-all"
                            autoFocus={f.label === 'Nova senha'}
                          />
                          <button type="button" onClick={() => f.setShow(!f.show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-accent transition-colors p-1">
                            <Icon name={f.show ? 'eyeOff' : 'eye'} size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {newPassword.length > 0 && newPassword.length < 6 && (
                      <p className="text-[11px] text-accent">A senha precisa ter pelo menos 6 caracteres ({6 - newPassword.length} faltando)</p>
                    )}
                    {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-accent">As senhas não coincidem</p>
                    )}
                  </div>

                  {passwordError && <p className="text-accent text-xs font-medium mt-3">{passwordError}</p>}

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowChangePassword(false)} className="flex-1 px-4 py-3 text-sm font-semibold bg-surface-alt text-text rounded-xl hover:bg-border-light transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={passwordLoading || newPassword.length < 6 || newPassword !== confirmPassword}
                      className="flex-1 px-4 py-3 text-sm btn-gradient rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {passwordLoading ? 'Alterando…' : 'Alterar senha'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal Cancelar Assinatura */}
        {showCancelModal && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md px-4"
            onClick={() => !cancelLoading && setShowCancelModal(false)}
          >
            <div
              className="glass-card rounded-2xl p-6 w-full max-w-md animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 mx-auto rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                  <Icon name="close" size={24} className="text-red-500" />
                </div>
                <h3 className="font-display text-2xl text-text mb-2">Cancelar assinatura</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Ao cancelar, você mantém acesso ao plano <strong className="text-text">{currentPlan === 'premium' ? 'Premium' : 'Pro'}</strong> até o final do período já pago. Depois disso, volta para o plano gratuito.
                </p>
              </div>

              <div className="bg-surface-alt rounded-xl p-4 mb-5">
                <p className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wider">O que você perde:</p>
                <ul className="space-y-1.5 text-sm text-text-muted">
                  <li className="flex items-center gap-2"><Icon name="chat" size={13} className="text-accent" /> Mensagens ilimitadas de mentoria</li>
                  <li className="flex items-center gap-2"><Icon name="image" size={13} className="text-accent" /> Geração de imagens com IA</li>
                  <li className="flex items-center gap-2"><Icon name="briefcase" size={13} className="text-accent" /> Ferramentas de marketing e negócio</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-3 text-sm font-semibold btn-gradient rounded-xl"
                >
                  Manter plano
                </button>
                <button
                  onClick={async () => {
                    setCancelLoading(true);
                    try {
                      const result = await onCancelSubscription?.();
                      if (result?.success) {
                        setShowCancelModal(false);
                        alert(result.message || 'Assinatura cancelada com sucesso.');
                      } else {
                        alert(result?.error || 'Erro ao cancelar. Tente novamente.');
                      }
                    } catch {
                      alert('Erro de conexão. Tente novamente.');
                    }
                    setCancelLoading(false);
                  }}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-3 text-sm font-semibold bg-surface-alt text-text-muted rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelando…' : 'Confirmar cancelamento'}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
