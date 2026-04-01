'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

const AuthContext = createContext({ user: undefined, profile: null, signOut: async () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export default function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const supabase = getSupabase();

  const fetchProfile = async (authUser) => {
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

      // Profile doesn't exist — create it (trigger may have failed)
      console.warn('Profile not found, creating...', error?.message);
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

      // Fallback — use a local profile so app doesn't hang
      console.warn('Could not create profile in DB, using fallback');
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
      // Fallback so app doesn't hang
      const meta = authUser.user_metadata || {};
      const fallback = {
        id: authUser.id,
        name: meta.name || meta.full_name || 'Nail Designer',
        level: meta.level || 'iniciante',
        plan: 'free',
        messages_today: 0,
      };
      setProfile(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      return;
    }

    let mounted = true;

    // Timeout fallback — if auth takes too long, treat as logged out
    const timeout = setTimeout(() => {
      if (mounted && user === undefined) {
        console.warn('Auth timeout — treating as logged out');
        setUser(null);
      }
    }, 6000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      clearTimeout(timeout);
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user);
      } else {
        setUser(null);
      }
    }).catch(() => {
      if (mounted) {
        clearTimeout(timeout);
        setUser(null);
      }
    });

    // Listen to auth changes
    let subscription;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      );
      subscription = data?.subscription;
    } catch (err) {
      console.error('onAuthStateChange error:', err);
    }

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates) => {
    if (!user || !supabase) return;
    const { data } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, profile, signOut, updateProfile, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}
