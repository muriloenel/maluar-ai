'use client';

import { useState } from 'react';
import { useAuth } from './SupabaseAuthProvider';
import { useToast } from './Toast';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const { supabase } = useAuth();

  const levels = [
    { id: 'iniciante', label: 'Iniciante', desc: 'Tô começando do zero', icon: '🌱' },
    { id: 'intermediario', label: 'Intermediária', desc: 'Já faço algumas unhas', icon: '💅' },
    { id: 'avancada', label: 'Avançada', desc: 'Já atendo clientes', icon: '✨' },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
      setError(
        error.message.includes('Invalid login')
          ? 'Email ou senha incorretos'
          : error.message.includes('Email not confirmed')
          ? 'Confirme seu email antes de entrar'
          : `Erro ao entrar: ${error.message}`
      );
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim() || !level) {
      setError('Preencha seu nome e nível');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim(), level },
      },
    });

    if (error) {
      console.error('Signup error:', error);
      setError(
        error.message.includes('already registered')
          ? 'Este email já está cadastrado'
          : `Erro ao criar conta: ${error.message}`
      );
    } else if (data?.user?.identities?.length === 0) {
      setError('Este email já está cadastrado');
    } else {
      toast?.('Conta criada! Verifique seu email para confirmar.');
      setMode('login');
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
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
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8 animate-scale-in">
          <img src="/logo-icon.png" alt="Maluar" className="w-20 h-20 mx-auto mb-4 rounded-2xl object-contain" />
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-[#534AB7] via-[#7F77DD] to-[#D4537E] bg-clip-text text-transparent tracking-tight">
            Maluar AI
          </h1>
          <p className="text-text-muted text-sm mt-1">
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full text-center text-xs text-text-muted hover:text-accent transition-colors"
            >
              Esqueci minha senha
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                minLength={6}
                required
              />
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

            <button
              type="submit"
              disabled={loading || !name.trim() || !level}
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
    </div>
  );
}
