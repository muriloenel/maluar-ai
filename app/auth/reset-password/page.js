'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '../../../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Aguardar o Supabase processar os tokens da URL (detectSessionInUrl)
    const supabase = getSupabase();
    if (!supabase) return;

    const checkSession = async () => {
      // Tentar várias vezes com intervalo — o token pode demorar a ser processado
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 500 : 1000));
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
          return;
        }
      }
      // Após 8 tentativas (~8.5s), considerar expirado
      setError('Sessão expirada ou link inválido. Solicite um novo link de recuperação de senha na tela de login.');
    };

    // Também escutar eventos de auth (mais confiável)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true);
      }
    });

    checkSession();

    return () => subscription?.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = getSupabase();
    if (!supabase) {
      setError('Serviço indisponível.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(
        error.message.includes('same_password')
          ? 'A nova senha deve ser diferente da anterior'
          : 'Erro ao redefinir senha. Tente solicitar um novo link.'
      );
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-6">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-rose/[0.03]" />

      <div className="w-full max-w-sm relative space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src="/logo-icon.webp" alt="Maluar" className="w-16 h-16 mx-auto rounded-2xl object-contain shadow-elevated mb-4" />
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#534AB7] via-[#7F77DD] to-[#D4537E] bg-clip-text text-transparent">
            Redefinir Senha
          </h1>
          <p className="text-text-muted text-sm mt-1.5">Escolha uma nova senha para sua conta</p>
        </div>

        {success ? (
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-lg font-bold text-text">Senha redefinida!</h2>
            <p className="text-sm text-text-muted">Redirecionando para o app...</p>
          </div>
        ) : !sessionReady && !error ? (
          <div className="text-center space-y-4">
            <div className="spinner mx-auto" />
            <p className="text-sm text-text-muted">Verificando sessão...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-text text-sm font-medium mb-1.5">Nova senha</label>
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
              <label className="block text-text text-sm font-medium mb-1.5">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-surface-card border border-border rounded-xl px-4 py-3 text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all shadow-soft"
                minLength={6}
                required
              />
            </div>

            {error && <p className="text-rose text-xs font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading || (!sessionReady && !error)}
              className="w-full py-3.5 rounded-xl font-semibold text-sm btn-gradient shadow-soft disabled:opacity-50"
            >
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>

            <p className="text-center text-xs text-text-muted">
              <a href="/" className="text-accent font-semibold hover:underline">← Voltar ao login</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
