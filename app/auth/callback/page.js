'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '../../../lib/supabase';

export default function AuthCallback() {
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('Verificando...');

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setStatus('error');
        setMessage('Serviço indisponível. Tente novamente.');
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const type = url.searchParams.get('type');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      // Erro vindo do Supabase (link expirado, etc.)
      if (error) {
        setStatus('error');
        setMessage(errorDescription || 'Link inválido ou expirado. Tente novamente.');
        return;
      }

      // Recovery check
      if (type === 'recovery') {
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch {}
        }
        setMessage('Redirecionando para redefinição de senha...');
        window.location.href = '/auth/reset-password';
        return;
      }

      // Trocar code por sessão (PKCE flow — email confirm, OAuth, magic link)
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('[AUTH-CALLBACK] Exchange error:', exchangeError.message);
            // detectSessionInUrl pode ter processado o code antes — verificar session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              setStatus('error');
              setMessage('Link expirado ou já utilizado. Faça login normalmente.');
              return;
            }
          }
        } catch (err) {
          console.error('[AUTH-CALLBACK] Exchange exception:', err);
          // Tentar getSession como fallback
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              setStatus('error');
              setMessage('Erro ao processar autenticação. Tente fazer login normalmente.');
              return;
            }
          } catch {
            setStatus('error');
            setMessage('Erro ao processar autenticação. Tente fazer login normalmente.');
            return;
          }
        }

        // Aguardar sessão confirmar (onAuthStateChange pode levar alguns ms)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Confirmar sessão estabelecida antes de redirecionar
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession) {
          setStatus('success');
          setMessage('Login realizado com sucesso! Redirecionando...');
          setTimeout(() => { window.location.href = '/'; }, 1000);
          return;
        }

        // Session não encontrada — aguardar mais um pouco (OAuth pode demorar)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          setStatus('success');
          setMessage('Login realizado com sucesso! Redirecionando...');
          setTimeout(() => { window.location.href = '/'; }, 500);
          return;
        }

        setStatus('error');
        setMessage('Não foi possível completar o login. Tente novamente.');
        return;
      }

      // Verificar se hash contém tokens (implicit flow / fallback)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashType = hashParams.get('type');
        if (hashType === 'recovery') {
          window.location.href = '/auth/reset-password';
          return;
        }
        // Para outros tipos (signup, magiclink), o detectSessionInUrl já processou
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Verificar se existe session (pode vir de detectSessionInUrl ou hash processing)
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        setStatus('success');
        setMessage('Login realizado com sucesso! Redirecionando...');
        setTimeout(() => { window.location.href = '/'; }, 1000);
        return;
      }

      // Fallback — email confirmado sem session
      setStatus('success');
      setMessage('Conta verificada! Faça login para continuar.');
      setTimeout(() => { window.location.href = '/'; }, 2000);
    };

    handleCallback();
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
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover shadow-soft transition-all"
            >
              Ir para o login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
