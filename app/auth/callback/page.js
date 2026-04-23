'use client';

import { useEffect, useState, useRef } from 'react';
import { getSupabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('Verificando...');
  const resolvedRef = useRef(false);

  const redirectTo = (url, msg, delay = 800) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setStatus('success');
    setMessage(msg);
    setTimeout(() => { window.location.href = url; }, delay);
  };

  const showError = (msg) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    setStatus('error');
    setMessage(msg);
  };

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      showError('Serviço indisponível. Tente novamente.');
      return;
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const type = url.searchParams.get('type');
    const urlError = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Erro vindo do Supabase (link expirado, etc.)
    if (urlError) {
      showError(errorDescription || 'Link inválido ou expirado. Tente novamente.');
      return;
    }

    const isRecovery = type === 'recovery';

    // === TIMEOUT GLOBAL (12s) — evita "Verificando..." eterno ===
    const globalTimeout = setTimeout(() => {
      if (resolvedRef.current) return;
      console.warn('[AUTH-CALLBACK] Timeout global (12s)');
      if (isRecovery) {
        // Para recovery, redirecionar mesmo sem sessão — a página de reset mostrará erro
        redirectTo('/auth/reset-password', 'Redirecionando...', 300);
      } else {
        showError('A verificação está demorando. Verifique sua conexão e tente novamente.');
      }
    }, 12000);

    // ================================================================
    // ESTRATÉGIA: detectSessionInUrl (habilitado no client) já faz o
    // exchangeCodeForSession automaticamente. NÃO chamamos manualmente.
    // Ouvimos onAuthStateChange como fonte primária de resolução.
    // Fallback: verificar session manualmente após 5s.
    // ================================================================

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (resolvedRef.current) return;
      console.log('[AUTH-CALLBACK] Event:', event, '| session:', !!session?.user);

      // Recovery (reset de senha)
      if (event === 'PASSWORD_RECOVERY') {
        redirectTo('/auth/reset-password', 'Redirecionando para redefinição de senha...', 300);
        return;
      }

      // Sessão criada — verificar se é recovery antes de redirecionar para home
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        if (isRecovery) {
          // Recovery dispara SIGNED_IN antes de PASSWORD_RECOVERY — redirecionar para reset
          redirectTo('/auth/reset-password', 'Redirecionando para redefinição de senha...', 300);
        } else {
          redirectTo('/', 'Login realizado com sucesso! Redirecionando...', 800);
        }
        return;
      }

      // INITIAL_SESSION com sessão existente (detectSessionInUrl já processou)
      if (event === 'INITIAL_SESSION' && session?.user) {
        if (isRecovery) {
          redirectTo('/auth/reset-password', 'Redirecionando para redefinição de senha...', 300);
        } else {
          redirectTo('/', 'Login realizado com sucesso! Redirecionando...', 800);
        }
        return;
      }
    });

    // === FALLBACK (5s): se onAuthStateChange não resolveu, tentar manualmente ===
    const fallbackTimeout = setTimeout(async () => {
      if (resolvedRef.current) return;
      console.log('[AUTH-CALLBACK] Fallback — tentando exchange manual');

      // Se temos code, tentar exchange manual com timeout
      if (code) {
        try {
          const exchangePromise = supabase.auth.exchangeCodeForSession(code);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('exchange timeout')), 5000)
          );
          const { error: exchangeError } = await Promise.race([exchangePromise, timeoutPromise]);
          if (resolvedRef.current) return;

          if (!exchangeError) {
            // Exchange OK — onAuthStateChange vai disparar, mas resolver direto por segurança
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              if (isRecovery) {
                redirectTo('/auth/reset-password', 'Redirecionando para redefinição de senha...', 300);
              } else {
                redirectTo('/', 'Login realizado com sucesso! Redirecionando...', 500);
              }
              return;
            }
          }
        } catch (err) {
          console.warn('[AUTH-CALLBACK] Fallback exchange failed:', err.message);
        }
      }

      if (resolvedRef.current) return;

      // Checar se session já existe (detectSessionInUrl pode ter criado)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (resolvedRef.current) return;
        if (session?.user) {
          if (isRecovery) {
            redirectTo('/auth/reset-password', 'Redirecionando para redefinição de senha...', 300);
          } else {
            redirectTo('/', 'Login realizado com sucesso! Redirecionando...', 500);
          }
          return;
        }
      } catch {}

      // Nenhuma sessão — se é recovery, redirecionar mesmo assim
      if (isRecovery) {
        redirectTo('/auth/reset-password', 'Redirecionando...', 300);
        return;
      }

      // Sem code e sem sessão
      if (!code && !window.location.hash) {
        showError('Sessão não encontrada. Faça login novamente.');
      }
    }, 5000);

    // === HASH (implicit flow / fallback legado) ===
    if (!code && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashType = hashParams.get('type');
      if (hashType === 'recovery') {
        // detectSessionInUrl vai processar o hash — esperar via onAuthStateChange
        // Se não resolver, o fallback timeout cuida
      }
    }

    return () => {
      clearTimeout(globalTimeout);
      clearTimeout(fallbackTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-rose/[0.03]" />

      <div className="relative text-center max-w-sm w-full space-y-6">
        <div className="relative inline-block">
          <img src="/logo-icon.webp" alt="Maluar" className="w-16 h-16 mx-auto rounded-2xl object-contain shadow-elevated" />
        </div>

        {status === 'processing' && (
          <div className="space-y-4 animate-fade-in">
            <div className="spinner mx-auto" />
            <p className="text-sm text-text-muted">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-lg font-bold text-text">{message}</h2>
            <p className="text-xs text-text-light">Você será redirecionada em instantes...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-rose/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="font-display text-lg font-bold text-text">Ops!</h2>
            <p className="text-sm text-text-muted">{message}</p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover shadow-soft transition-all"
              >
                Tentar novamente
              </button>
              <a
                href="/"
                className="text-xs text-text-muted hover:text-text underline"
              >
                Ir para o login
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
