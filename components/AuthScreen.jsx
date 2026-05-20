'use client';

/*
  components/AuthScreen.jsx — Redesign "Soft Feminino"
  Lógica de auth (Supabase, rate limiting, validação, OAuth) 100% preservada
  do arquivo original. Mudou apenas o visual.

  Substitui completamente o arquivo antigo.
*/

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './SupabaseAuthProvider';
import { useToast } from './Toast';
import Icon from './Icon';
import MaluarMark from './MaluarMark';

const INPUT_CLASS = "w-full bg-white/85 dark:bg-white/[0.04] border border-border-light rounded-2xl px-4 py-3.5 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-all shadow-soft";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-text mb-2 pl-1">{label}</label>
      {children}
    </div>
  );
}

function RateLimitNotice({ seconds }) {
  if (seconds <= 0) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-accent-bg border border-accent-light rounded-xl">
      <Icon name="lock" size={14} className="text-accent" />
      <span className="text-xs text-accent font-medium">
        Tente novamente em <strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong>
      </span>
    </div>
  );
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptEmails, setAcceptEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const lastSubmitRef = useRef(0);
  const toast = useToast();
  const { supabase } = useAuth();

  // ─── Logic (preservada do original) ────────────────────────────────
  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = setInterval(() => {
      setRateLimitSeconds(s => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitSeconds]);

  const canSubmit = useCallback(() => {
    const now = Date.now();
    if (now - lastSubmitRef.current < 2000) return false;
    lastSubmitRef.current = now;
    return true;
  }, []);

  const triggerRateLimit = useCallback(() => setRateLimitSeconds(120), []);

  const levels = [
    { id: 'iniciante',    label: 'Iniciante',    desc: 'Tô começando do zero',  icon: 'sparkle' },
    { id: 'intermediario', label: 'Intermediária', desc: 'Já faço algumas unhas', icon: 'feather' },
    { id: 'avancada',     label: 'Avançada',     desc: 'Já atendo clientes',    icon: 'diamond' },
  ];

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e) => setPhone(formatPhone(e.target.value));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!canSubmit()) return;
    if (rateLimitSeconds > 0) { setError(`Aguarde ${rateLimitSeconds}s antes de tentar novamente.`); return; }
    if (!supabase) { setError('Serviço indisponível. Tente novamente.'); return; }
    setLoading(true); setError(''); setShowResendConfirm(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid_credentials')) {
        setError('Email ou senha incorretos. Verifique e tente novamente.');
      } else if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
        setError('Você precisa confirmar seu email antes de entrar.');
        setShowResendConfirm(true);
      } else if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('request this after')) {
        triggerRateLimit();
        setError('Muitas tentativas. Aguarde o tempo abaixo antes de tentar novamente.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError('Erro ao entrar. Verifique seus dados e tente novamente.');
      }
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email || !supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup', email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError('Erro ao reenviar. Aguarde alguns minutos e tente novamente.');
      else { toast?.('Email de confirmação reenviado! Verifique sua caixa.'); setShowResendConfirm(false); }
    } catch { setError('Erro de conexão ao reenviar.'); }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (!supabase) { setError('Serviço indisponível.'); return; }
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) { setError('Erro ao conectar com Google. Tente novamente.'); setLoading(false); }
    } catch { setError('Erro de conexão. Verifique sua internet.'); setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!canSubmit()) return;
    if (rateLimitSeconds > 0) { setError(`Aguarde ${rateLimitSeconds}s antes de tentar novamente.`); return; }
    if (!name.trim() || !level) { setError('Preencha seu nome e nível'); return; }
    if (!acceptTerms) { setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.'); return; }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) { setError('Telefone inválido. Use DDD + número (ex: 11 99999-9999)'); return; }
    if (password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return; }
    setLoading(true); setError('');
    if (!supabase) { setError('Serviço indisponível. Tente novamente.'); setLoading(false); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { name: name.trim(), level, phone: phoneDigits, email_opt_in: acceptEmails },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered')) setError('Este email já está cadastrado. Tente fazer login.');
        else if (msg.includes('rate limit') || msg.includes('request this after') || msg.includes('too many')) { triggerRateLimit(); setError('Muitas tentativas de cadastro. Aguarde o tempo abaixo antes de tentar novamente.'); }
        else if (msg.includes('not authorized') || msg.includes('signup is disabled')) setError('Cadastro temporariamente indisponível. Tente mais tarde.');
        else if (msg.includes('invalid') && msg.includes('email')) setError('Email inválido. Verifique o endereço digitado.');
        else if (msg.includes('password')) setError('Senha deve ter no mínimo 6 caracteres.');
        else setError(`Erro ao criar conta: ${error.message}`);
      } else if (data?.user?.identities?.length === 0) {
        setError('Este email já está cadastrado. Tente fazer login.');
      } else {
        toast?.('Conta criada! Verifique seu email para confirmar.');
        setMode('login');
      }
    } catch { setError('Erro inesperado. Verifique sua conexão e tente novamente.'); }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!canSubmit()) return;
    if (rateLimitSeconds > 0) { setError(`Aguarde ${rateLimitSeconds}s antes de tentar novamente.`); return; }
    if (!email) { setError('Digite seu email'); return; }
    setLoading(true); setError('');
    if (!supabase) { setError('Serviço indisponível.'); setLoading(false); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('request this after')) { triggerRateLimit(); setError('Muitas tentativas. Aguarde o tempo abaixo antes de tentar novamente.'); }
      else setError('Erro ao enviar email de recuperação');
    } else {
      toast?.('Email de recuperação enviado! Verifique sua caixa.');
      setMode('login');
    }
    setLoading(false);
  };

  const inputClass = INPUT_CLASS;

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-surface">
      {/* Atmospheric backdrop */}
      <div className="absolute inset-0 bg-mesh-rose pointer-events-none" />
      {/* Floating orb */}
      <div
        className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full opacity-40 pointer-events-none"
        style={{
          background: 'conic-gradient(from 120deg, var(--color-accent), var(--color-mauve), var(--color-rosegold), var(--color-accent))',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--color-rosegold), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Left invitation panel — desktop only */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 xl:p-16 relative">
        <div className="flex items-center gap-3 animate-fade-in">
          <MaluarMark size={36} />
          <div className="leading-tight">
            <div className="font-display text-2xl tracking-wide">Maluar</div>
            <div className="text-[10px] text-text-light tracking-[0.28em] uppercase font-semibold">Nail Design AI</div>
          </div>
        </div>

        <div className="max-w-xl animate-slide-up delay-200">
          <div className="tag-pill mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            sua mentora de nail design
          </div>
          <h1 className="text-[64px] xl:text-[80px] leading-[0.95] tracking-tight mb-6 font-display">
            A arte está<br />nas mãos.<br />
            <span className="font-italic-display text-gradient">A estratégia, aqui.</span>
          </h1>
          <p className="text-base text-text-muted leading-relaxed max-w-md">
            Mentoria contínua, atelier de imagens para Instagram e cuidado completo do seu negócio.
            Tudo no seu ritmo, com uma IA treinada por nail designers reais.
          </p>

          <div className="flex gap-8 mt-10">
            {[
              ['Mentoria 1:1', 'em qualquer hora'],
              ['Atelier visual', 'imagens prontas'],
              ['Negócio', 'preço, agenda, captação'],
            ].map(([t1, t2]) => (
              <div key={t1} className="flex flex-col gap-1">
                <div className="w-6 h-px bg-accent mb-2" />
                <div className="text-[13px] font-semibold text-text">{t1}</div>
                <div className="text-xs text-text-muted">{t2}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="font-italic-display text-base text-text-muted max-w-sm leading-relaxed">
          "Sofisticação não está no excesso. Está no que você escolhe deixar de fora."
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 lg:p-12 relative">
        <div className="w-full max-w-[440px] flex-1 flex flex-col justify-center">
          {/* Mobile brand */}
          <div className="lg:hidden flex flex-col items-center mb-8 animate-scale-in">
            <MaluarMark size={56} />
            <h1 className="font-display text-3xl mt-3">Maluar <span className="font-italic-display text-accent">AI</span></h1>
            <p className="text-text-muted text-xs mt-1 tracking-[0.18em] uppercase font-semibold">Nail Design</p>
          </div>

          <div className="glass-card rounded-3xl p-7 sm:p-9 animate-slide-up delay-200 relative">
            {/* Glow rim (dec) */}
            <div
              className="absolute -inset-px rounded-3xl pointer-events-none opacity-40 -z-10"
              style={{
                background: 'linear-gradient(135deg, var(--color-accent) 0%, transparent 40%, var(--color-mauve) 100%)',
                filter: 'blur(2px)',
              }}
            />

            <div className="text-center mb-7">
              <h2 className="font-display text-3xl sm:text-4xl tracking-tight">
                {mode === 'login' && <>Bem-vinda <span className="font-italic-display text-accent">de volta</span></>}
                {mode === 'register' && <>Criar <span className="font-italic-display text-accent">acesso</span></>}
                {mode === 'forgot' && <>Recuperar <span className="font-italic-display text-accent">senha</span></>}
              </h2>
              <p className="text-sm text-text-muted mt-2">
                {mode === 'login' && 'continue de onde parou'}
                {mode === 'register' && 'sua jornada começa aqui'}
                {mode === 'forgot' && 'enviaremos um link para seu email'}
              </p>
            </div>

            {/* ───── LOGIN ───── */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="E-mail">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className={inputClass} />
                </Field>

                <Field label="Senha">
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required className={`${inputClass} pr-11`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-accent transition-colors p-1.5" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                      <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                    </button>
                  </div>
                </Field>

                {error && <p className="text-accent text-xs font-medium">{error}</p>}
                <RateLimitNotice seconds={rateLimitSeconds} />

                {showResendConfirm && (
                  <button type="button" onClick={handleResendConfirmation} disabled={loading} className="w-full text-center text-xs text-accent font-semibold hover:underline py-1">
                    Reenviar email de confirmação
                  </button>
                )}

                <div className="text-right -mt-1">
                  <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-xs font-italic-display text-accent">esqueci a senha</button>
                </div>

                <button type="submit" disabled={loading || rateLimitSeconds > 0} className="w-full py-3.5 rounded-2xl text-sm btn-gradient flex items-center justify-center gap-2.5 disabled:opacity-50">
                  {loading ? 'Entrando…' : rateLimitSeconds > 0 ? `Aguarde ${rateLimitSeconds}s` : (<>Entrar <Icon name="arrowRight" size={16} /></>)}
                </button>

                <div className="flex items-center gap-3 my-1 text-[10px] tracking-[0.32em] uppercase text-text-light">
                  <div className="flex-1 h-px bg-border-light" />ou<div className="flex-1 h-px bg-border-light" />
                </div>

                <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl btn-ghost text-sm font-medium">
                  <Icon name="google" size={18} />
                  Continuar com Google
                </button>

                <p className="text-center text-sm text-text-muted pt-1">
                  Sem conta?{' '}
                  <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-accent font-semibold hover:underline">Criar acesso</button>
                </p>
              </form>
            )}

            {/* ───── REGISTER ───── */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <Field label="Seu nome">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como posso te chamar?" maxLength={50} required className={inputClass} />
                </Field>
                <Field label="WhatsApp / Telefone">
                  <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="(11) 99999-9999" required className={inputClass} />
                </Field>
                <Field label="E-mail">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className={inputClass} />
                </Field>
                <Field label="Senha">
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required className={`${inputClass} pr-11`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-accent transition-colors p-1.5">
                      <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                    </button>
                  </div>
                </Field>

                <Field label="Qual seu nível?">
                  <div className="space-y-2">
                    {levels.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLevel(l.id)}
                        className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-2xl border transition-all ${
                          level === l.id
                            ? 'border-accent bg-accent-bg ring-2 ring-accent/20'
                            : 'border-border-light bg-white/60 dark:bg-white/[0.02] hover:border-accent/40'
                        }`}
                      >
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${level === l.id ? 'ai-avatar text-white' : 'bg-surface-2 text-accent'}`}>
                          <Icon name={l.icon} size={18} />
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-text">{l.label}</div>
                          <div className="text-xs text-text-muted">{l.desc}</div>
                        </div>
                        {level === l.id && <Icon name="check" size={16} className="text-accent" />}
                      </button>
                    ))}
                  </div>
                </Field>

                {error && <p className="text-accent text-xs font-medium">{error}</p>}
                <RateLimitNotice seconds={rateLimitSeconds} />

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 accent-[var(--color-accent)] w-4 h-4 rounded" />
                  <span className="text-xs text-text-muted leading-relaxed">
                    Li e aceito os <a href="/termos" target="_blank" className="text-accent hover:underline">Termos de Uso</a> e a <a href="/privacidade" target="_blank" className="text-accent hover:underline">Política de Privacidade</a>. <span className="text-accent">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={acceptEmails} onChange={(e) => setAcceptEmails(e.target.checked)} className="mt-0.5 accent-[var(--color-accent)] w-4 h-4 rounded" />
                  <span className="text-xs text-text-muted leading-relaxed">Quero receber dicas de nail design e novidades por email</span>
                </label>

                <button
                  type="submit"
                  disabled={loading || rateLimitSeconds > 0 || !name.trim() || !level || !phone.replace(/\D/g, '') || !acceptTerms}
                  className="w-full py-3.5 rounded-2xl text-sm btn-gradient flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  {loading ? 'Criando conta…' : rateLimitSeconds > 0 ? `Aguarde ${rateLimitSeconds}s` : (<>Criar conta grátis <Icon name="arrowRight" size={16} /></>)}
                </button>

                <p className="text-center text-sm text-text-muted">
                  Já tem conta?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-accent font-semibold hover:underline">Entrar</button>
                </p>
              </form>
            )}

            {/* ───── FORGOT ───── */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Field label="E-mail">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className={inputClass} />
                </Field>

                {error && <p className="text-accent text-xs font-medium">{error}</p>}
                <RateLimitNotice seconds={rateLimitSeconds} />

                <button type="submit" disabled={loading || rateLimitSeconds > 0} className="w-full py-3.5 rounded-2xl text-sm btn-gradient flex items-center justify-center gap-2.5 disabled:opacity-50">
                  {loading ? 'Enviando…' : rateLimitSeconds > 0 ? `Aguarde ${rateLimitSeconds}s` : (<>Enviar link de recuperação <Icon name="arrowRight" size={16} /></>)}
                </button>

                <p className="text-center text-sm text-text-muted">
                  <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-accent font-semibold hover:underline inline-flex items-center gap-1.5">
                    <Icon name="arrowLeft" size={14} /> Voltar ao login
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* LGPD footer */}
        <div className="w-full max-w-[440px] text-center mt-6 text-[11px] text-text-light flex items-center justify-center gap-3">
          <a href="/termos" className="hover:text-accent transition-colors">Termos de Uso</a>
          <span>·</span>
          <a href="/privacidade" className="hover:text-accent transition-colors">Política de Privacidade</a>
        </div>
      </div>
    </div>
  );
}
