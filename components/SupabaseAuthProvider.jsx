'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';

const AuthContext = createContext({
  user: undefined,
  profile: null,
  signOut: async () => {},
  getAccessToken: async () => null,
  enterGuestMode: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const supabase = getSupabase();

  // Função centralizada pra obter token — usa getSession() que retorna do cache local
  const getAccessToken = useCallback(async () => {
    if (!supabase) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) return null;
      return session.access_token;
    } catch {
      return null;
    }
  }, [supabase]);

  const fetchProfile = useCallback(async (authUser) => {
    if (!supabase) return null;
    try {
      const { data } = await supabase
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
        })
        .select()
        .single();

      if (created) {
        setProfile(created);
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
        setUser((prev) => prev === undefined ? null : prev);
      }
    }, 5000);

    // onAuthStateChange é a FONTE PRIMÁRIA de verdade (boa prática Supabase)
    // Ele dispara INITIAL_SESSION no mount, SIGNED_IN no login, SIGNED_OUT no logout,
    // e TOKEN_REFRESHED quando o token é renovado automaticamente.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        resolved = true;
        clearTimeout(timeout);
        if (session?.user) {
          setUser(session.user);
          // Não re-fetch profile no TOKEN_REFRESHED (desnecessário)
          if (event !== 'TOKEN_REFRESHED') {
            await fetchProfile(session.user);
          }
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

  const enterGuestMode = useCallback(() => {
    let guestId = null;
    try { guestId = localStorage.getItem('maluar-guest-id'); } catch {}
    if (!guestId) {
      guestId = 'guest-' + crypto.randomUUID();
      try { localStorage.setItem('maluar-guest-id', guestId); } catch {}
    }
    setUser({ id: guestId, email: 'convidado', user_metadata: { name: 'Nail Designer', level: 'iniciante' } });
    setProfile({ id: guestId, name: 'Nail Designer', level: 'iniciante', plan: 'free', messages_today: 0 });
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    try { localStorage.removeItem('maluar-guest-id'); } catch {}
    setUser(null);
    setProfile(null);
  }, [supabase]);

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
    <AuthContext.Provider value={{ user, profile, signOut, updateProfile, supabase, getAccessToken, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}
