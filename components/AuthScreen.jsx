'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from './SupabaseAuthProvider';
import { useToast } from './Toast';

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
  const toast = useToast();
  const { supabase } = useAuth();

  const levels = [
    { id: 'iniciante', label: 'Iniciante', desc: 'Tô começando do zero', icon: '🌱' },
    { id: 'intermediario', label: 'Intermediária', desc: 'Já faço algumas unhas', icon: '💅' },
    { id: 'avancada', label: 'Avançada', desc: 'Já atendo clientes', icon: '✨' },
  ];

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) { setError('Serviço indisponível. Tente novamente.'); return; }
    setLoading(true);
    setError('');
    setShowResendConfirm(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid_credentials')) {
        setError('Email ou senha incorretos. Verifique e tente novamente.');
      } else if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
        setError('Você precisa confirmar seu email antes de entrar.');
        setShowResendConfirm(true);
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Muitas tentativas. Aguarde alguns minutos.');
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
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError('Erro ao reenviar. Aguarde alguns minutos e tente novamente.');
      } else {
        toast?.('Email de confirmação reenviado! Verifique sua caixa.');
        setShowResendConfirm(false);
      }
    } catch {
      setError('Erro de conexão ao reenviar.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (!supabase) { setError('Serviço indisponível.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        setError('Erro ao conectar com Google. Tente novamente.');
        setLoading(false);
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !level) {
      setError('Preencha seu nome e nível');
      return;
    }
    if (!acceptTerms) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('Telefone inválido. Use DDD + número (ex: 11 99999-9999)');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');

    if (!supabase) { setError('Serviço indisponível. Tente novamente.'); setLoading(false); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name.trim(), level, phone: phoneDigits, email_opt_in: acceptEmails },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('[Maluar] Signup error:', error.message, error.status);
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          setError('Este email já está cadastrado. Tente fazer login.');
        } else if (msg.includes('rate limit') || msg.includes('request this after')) {
          setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else if (msg.includes('not authorized') || msg.includes('signup is disabled')) {
          setError('Cadastro temporariamente indisponível. Tente mais tarde.');
        } else if (msg.includes('invalid') && msg.includes('email')) {
          setError('Email inválido. Verifique o endereço digitado.');
        } else if (msg.includes('password')) {
          setError('Senha deve ter no mínimo 6 caracteres.');
        } else {
          setError(`Erro ao criar conta: ${error.message}`);
        }
      } else if (data?.user?.identities?.length === 0) {
        setError('Este email já está cadastrado. Tente fazer login.');
      } else {
        toast?.('Conta criada! Verifique seu email para confirmar.');
        setMode('login');
      }
    } catch (err) {
      console.error('[Maluar] Signup unexpected error:', err);
      setError('Erro inesperado. Verifique sua conexão e tente novamente.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Digite seu email');
      return;
    }
    setLoading(true);
    setError('');
    if (!supabase) { setError('Serviço indisponível.'); setLoading(false); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    if (error) {
      setError('Erro ao enviar email de recuperação');
    } else {
      toast?.('Email de recuperação enviado! Verifique sua caixa.');
      setMode('login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-6 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-rose/[0.03]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose/[0.04] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-sm relative flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="text-center mb-8 animate-scale-in">
          <div className="relative inline-block">
            <Image src="/logo-icon.webp" alt="Maluar" width={80} height={80} priority className="mx-auto mb-4 rounded-2xl object-contain shadow-elevated" />
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-rose/20 rounded-2xl blur-lg -z-10" />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#534AB7] via-[#7F77DD] to-[#D4537E] bg-clip-text text-transparent tracking-tight">
            Maluar AI
          </h1>
          <p className="text-text-muted text-sm mt-1.5 font-medium tracking-wide">
            Sua mentora de Nail Design
          </p>
        </div>

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-slide-up delay-200">
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                required
              />
            </div>
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 pr-11 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-rose text-xs font-medium">{error}</p>}

            {showResendConfirm && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={loading}
                className="w-full text-center text-xs text-accent font-semibold hover:underline py-1"
              >
                📩 Reenviar email de confirmação
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm btn-gradient shadow-soft"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); }}
              className="w-full text-center text-xs text-text-muted hover:text-accent transition-colors"
            >
              Esqueci minha senha
            </button>

            <div className="relative flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border-light" />
              <span className="text-[10px] text-text-light">ou</span>
              <div className="flex-1 h-px bg-border-light" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-text-muted hover:border-accent/30 hover:bg-accent-bg transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com Google
            </button>

            <p className="text-center text-xs text-text-muted">
              Não tem conta?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className="text-accent font-semibold hover:underline"
              >
                Criar conta grátis
              </button>
            </p>
          </form>
        )}

        {/* Register form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 animate-slide-up delay-200">
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Seu nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como posso te chamar?"
                className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                maxLength={50}
                required
              />
            </div>
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">WhatsApp / Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                required
              />
            </div>
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                required
              />
            </div>
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 pr-11 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text transition-colors p-1"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-text text-sm font-medium mb-2">Qual seu nível?</label>
              <div className="space-y-2">
                {levels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLevel(l.id)}
                    className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-all shadow-soft ${
                      level === l.id
                        ? 'border-accent bg-accent-light text-text ring-2 ring-accent/20'
                        : 'border-border bg-surface-card text-text-muted hover:border-accent/40 hover:bg-accent-bg'
                    }`}
                  >
                    <span className="text-lg">{l.icon}</span>
                    <div>
                      <span className="font-medium text-sm text-text">{l.label}</span>
                      <span className="text-xs text-text-muted block">{l.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-rose text-xs font-medium">{error}</p>}

            {/* LGPD: Consentimento obrigatório */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 accent-[#7F77DD] w-4 h-4 rounded"
              />
              <span className="text-xs text-text-muted leading-relaxed">
                Li e aceito os <a href="/termos" target="_blank" className="text-accent hover:underline">Termos de Uso</a> e a <a href="/privacidade" target="_blank" className="text-accent hover:underline">Política de Privacidade</a>. <span className="text-rose">*</span>
              </span>
            </label>

            {/* Opt-in de emails (não obrigatório) */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptEmails}
                onChange={(e) => setAcceptEmails(e.target.checked)}
                className="mt-0.5 accent-[#7F77DD] w-4 h-4 rounded"
              />
              <span className="text-xs text-text-muted leading-relaxed">
                Quero receber dicas de nail design e novidades por email
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !name.trim() || !level || !phone.replace(/\D/g, '') || !acceptTerms}
              className="w-full py-3.5 rounded-xl font-semibold text-sm btn-gradient shadow-soft"
            >
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>

            <p className="text-center text-xs text-text-muted">
              Já tem conta?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="text-accent font-semibold hover:underline"
              >
                Entrar
              </button>
            </p>
          </form>
        )}

        {/* Forgot password */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 animate-slide-up delay-200">
            <p className="text-sm text-text-muted text-center mb-2">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                required
              />
            </div>

            {error && <p className="text-rose text-xs font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm btn-gradient shadow-soft"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <p className="text-center text-xs text-text-muted">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="text-accent font-semibold hover:underline"
              >
                ← Voltar ao login
              </button>
            </p>
          </form>
        )}


      </div>

      {/* Links LGPD — sempre abaixo do formulário */}
      <div className="w-full max-w-sm text-center mt-6 pb-2 text-[11px] text-text-light space-x-3 relative">
        <a href="/termos" className="hover:text-accent transition-colors">Termos de Uso</a>
        <span>·</span>
        <a href="/privacidade" className="hover:text-accent transition-colors">Política de Privacidade</a>
      </div>
    </div>
  );
}
