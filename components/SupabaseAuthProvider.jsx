'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { identifyUser, resetPostHog } from './PostHogProvider';

const AuthContext = createContext({
  user: undefined,
  profile: null,
  signOut: async () => {},
  getAccessToken: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const supabase = getSupabase();

  // Função centralizada pra obter token — usa getSession() com timeout
  const getAccessToken = useCallback(async () => {
    if (!supabase) return null;

    // Helper: ler token direto do localStorage (fallback se getSession travar)
    const getTokenFromStorage = () => {
      try {
        const raw = localStorage.getItem('maluar-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed?.access_token || null;
        }
      } catch {}
      return null;
    };

    try {
      // Timeout de 3s — getSession() pode travar com lock do storage
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getSession timeout')), 3000)
      );
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

      if (error || !session?.access_token) {
        // Tentar refresh silencioso antes de usar fallback
        try {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.access_token) {
            return refreshData.session.access_token;
          }
        } catch {}
        return getTokenFromStorage();
      }
      return session.access_token;
    } catch (err) {
      // Timeout ou erro — usar localStorage direto (rápido, sem lock)
      return getTokenFromStorage();
    }
  }, [supabase]);

  // Carregar profile cacheado do localStorage (instantâneo no re-login)
  const loadCachedProfile = useCallback((userId) => {
    try {
      const raw = localStorage.getItem('maluar-profile');
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.id === userId) return cached;
      }
    } catch {}
    return null;
  }, []);

  const saveCachedProfile = useCallback((data) => {
    try { localStorage.setItem('maluar-profile', JSON.stringify(data)); } catch {}
  }, []);

  const fetchProfile = useCallback(async (authUser) => {
    if (!supabase) return null;

    // ── ESTRATÉGIA CACHE-FIRST ──
    // 1. Se tem cache com phone → usa IMEDIATAMENTE (login instantâneo)
    // 2. DB query roda em background para atualizar dados frescos
    // 3. Se não tem cache → espera DB (com timeout curto de 6s)
    const cached = loadCachedProfile(authUser.id);
    if (cached && cached.phone) {
      setProfile(cached);
      // Atualizar em background (não bloqueia)
      supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
            saveCachedProfile(data);
          }
        })
        .catch(() => {});
      return cached;
    }

    // Sem cache válido → precisa esperar o DB (primeiro login ou cache limpo)
    try {
      const dbPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      const dbTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('fetchProfile timeout')), 4000)
      );
      const { data, error } = await Promise.race([dbPromise, dbTimeout]);

      if (data) {
        setProfile(data);
        saveCachedProfile(data);
        return data;
      }

      // Profile não existe — criar (trigger pode ter falhado)
      const meta = authUser.user_metadata || {};
      const { data: created } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          name: meta.name || meta.full_name || 'Nail Designer',
          level: meta.level || 'iniciante',
          phone: meta.phone || null,
        })
        .select()
        .single();

      if (created) {
        setProfile(created);
        saveCachedProfile(created);
        // Enviar email de boas-vindas (async, não bloqueia)
        if (authUser.email) {
          fetch('/api/account/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: authUser.email, name: created.name }),
          }).catch(() => {});
        }
        return created;
      }

      // Fallback local pra não travar o app
      const fallback = {
        id: authUser.id,
        name: meta.name || meta.full_name || 'Nail Designer',
        level: meta.level || 'iniciante',
        phone: meta.phone || null,
        plan: 'free',
        messages_today: 0,
      };
      setProfile(fallback);
      return fallback;
    } catch (err) {
      console.error('fetchProfile error:', err);
      // Se já tem profile válido (do cache), NÃO sobrescrever com fallback sem phone
      // Isso evita redirecionar para CompleteProfile quando o banco está lento
      setProfile(prev => {
        if (prev && prev.phone) return prev;
        const cached = loadCachedProfile(authUser.id);
        if (cached && cached.phone) return cached;
        const meta = authUser.user_metadata || {};
        return {
          id: authUser.id,
          name: meta.name || 'Nail Designer',
          level: meta.level || 'iniciante',
          phone: meta.phone || null,
          plan: 'free',
          messages_today: 0,
        };
      });
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    // Timeout de segurança: se o Supabase não responder em 5s, assume "deslogado"
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[AUTH] Timeout — assumindo deslogado');
        setUser(null);
        setProfile(null);
      }
    }, 5000);

    // onAuthStateChange é a FONTE PRIMÁRIA de verdade (boa prática Supabase)
    // Ele dispara INITIAL_SESSION no mount, SIGNED_IN no login, SIGNED_OUT no logout,
    // e TOKEN_REFRESHED quando o token é renovado automaticamente.
    let retryingRefresh = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        resolved = true;
        clearTimeout(timeout);

        // Token expirado — deslogar IMEDIATAMENTE, tentar refresh em background
        if (event === 'SIGNED_OUT') {
          // Limpar estado agora (mostra tela de login instantaneamente)
          setUser(null);
          setProfile(null);
          // NÃO remover maluar-profile do localStorage aqui!
          // O cache deve sobreviver para o caso do refresh em background funcionar.
          // Só o signOut() explícito (clique do usuário) deve limpar o cache.

          // Tentar refresh em background — se funcionar, restaura a sessão
          if (!retryingRefresh) {
            retryingRefresh = true;
            try {
              console.log('[AUTH] SIGNED_OUT — tentando refresh em background...');
              const refreshPromise = supabase.auth.refreshSession();
              const refreshTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('refresh timeout')), 3000)
              );
              const { data: refreshData, error: refreshError } = await Promise.race([refreshPromise, refreshTimeout]);
              if (refreshData?.session?.user && !refreshError) {
                console.log('[AUTH] Refresh OK — sessão restaurada');
                // onAuthStateChange vai disparar SIGNED_IN automaticamente
              }
            } catch (err) {
              console.warn('[AUTH] Refresh falhou:', err.message);
            }
            retryingRefresh = false;
          }
          return;
        }

        // Recovery de senha — redirecionar para formulário de nova senha
        // (apenas se NÃO estiver na página de callback — ela já cuida disso)
        if (event === 'PASSWORD_RECOVERY') {
          if (session?.user) {
            setUser(session.user);
          }
          const isOnCallback = typeof window !== 'undefined' && window.location.pathname === '/auth/callback';
          if (!isOnCallback) {
            window.location.href = '/auth/reset-password';
          }
          return;
        }

        if (session?.user) {
          // Evitar setUser com nova referência no TOKEN_REFRESHED (causa re-render desnecessário)
          if (event === 'TOKEN_REFRESHED') {
            return; // user já está correto, não precisa re-setar
          }
          setUser(session.user);
          await fetchProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Auto-refresh profile quando usuário volta à aba (captura mudanças de plano via webhook)
  useEffect(() => {
    if (!supabase || !user) return;
    let lastRefresh = Date.now();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 30000) {
        lastRefresh = Date.now();
        fetchProfile(user).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [supabase, user, fetchProfile]);

  const signOut = useCallback(async () => {
    // Limpar state imediatamente (não esperar o Supabase que pode travar no lock)
    setUser(null);
    setProfile(null);
    resetPostHog();
    try { localStorage.removeItem('maluar-auth'); } catch {}
    try { localStorage.removeItem('maluar-profile'); } catch {}
    // Tentar signOut no Supabase com timeout (não bloquear se travar)
    if (supabase) {
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch {}
    }
  }, [supabase]);

  // Re-fetch profile do Supabase (usado após checkout Stripe, etc.)
  const refreshProfile = useCallback(async () => {
    if (!user || !supabase || user.id?.startsWith('guest-')) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data);
        saveCachedProfile(data);
        return data;
      }
    } catch (err) {
      console.error('refreshProfile error:', err);
    }
    return null;
  }, [user, supabase, saveCachedProfile]);

  // Atualiza profile LOCAL (sem tocar no banco) — usado após confirmar plano via API
  const patchProfile = useCallback((updates) => {
    setProfile(prev => {
      const updated = prev ? { ...prev, ...updates } : null;
      if (updated) saveCachedProfile(updated);
      return updated;
    });
  }, [saveCachedProfile]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return;
    // Guest mode — update local state only
    if (user.id?.startsWith('guest-')) {
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
      return { ...updates };
    }
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
    return data;
  }, [user, supabase]);

  // PostHog: identificar usuário quando user+profile estão disponíveis
  useEffect(() => {
    if (user && profile) identifyUser(user, profile);
  }, [user, profile]);

  return (
    <AuthContext.Provider value={{ user, profile, signOut, updateProfile, patchProfile, refreshProfile, supabase, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
