'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';

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
        console.warn('[AUTH] getSession sem token, usando fallback localStorage');
        return getTokenFromStorage();
      }
      return session.access_token;
    } catch (err) {
      console.warn('[AUTH] getAccessToken falhou:', err?.message, '— usando fallback localStorage');
      return getTokenFromStorage();
    }
  }, [supabase]);

  const fetchProfile = useCallback(async (authUser) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        setProfile(data);
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
        plan: 'free',
        messages_today: 0,
      };
      setProfile(fallback);
      return fallback;
    } catch (err) {
      console.error('fetchProfile error:', err);
      const meta = authUser.user_metadata || {};
      setProfile({
        id: authUser.id,
        name: meta.name || 'Nail Designer',
        level: meta.level || 'iniciante',
        plan: 'free',
        messages_today: 0,
      });
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    // Timeout de segurança: se o Supabase não responder em 5s, assume "deslogado"
    // pra não travar no "Carregando..." infinito (proxy corporativo, rede lenta, etc.)
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

        // Token expirado — tentar refresh silencioso 1x antes de deslogar
        if (event === 'SIGNED_OUT') {
          if (!retryingRefresh) {
            retryingRefresh = true;
            try {
              console.log('[AUTH] SIGNED_OUT recebido — tentando refresh silencioso...');
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              if (refreshData?.session?.user && !refreshError) {
                console.log('[AUTH] Refresh silencioso OK — sessão restaurada');
                retryingRefresh = false;
                setUser(refreshData.session.user);
                await fetchProfile(refreshData.session.user);
                return; // Sessão recuperada, não desloga
              }
            } catch {}
            retryingRefresh = false;
          }
          setUser(null);
          setProfile(null);
          return;
        }

        // Recovery de senha — redirecionar para formulário de nova senha
        if (event === 'PASSWORD_RECOVERY') {
          if (session?.user) {
            setUser(session.user);
          }
          // Redireciona para a página de redefinição de senha
          window.location.href = '/auth/reset-password';
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

  const signOut = useCallback(async () => {
    // Limpar state imediatamente (não esperar o Supabase que pode travar no lock)
    setUser(null);
    setProfile(null);
    try { localStorage.removeItem('maluar-auth'); } catch {}
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
        return data;
      }
    } catch (err) {
      console.error('refreshProfile error:', err);
    }
    return null;
  }, [user, supabase]);

  // Atualiza profile LOCAL (sem tocar no banco) — usado após confirmar plano via API
  const patchProfile = useCallback((updates) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, profile, signOut, updateProfile, patchProfile, refreshProfile, supabase, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
