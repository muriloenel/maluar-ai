import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'maluar-auth',
      flowType: 'pkce',
      // Desabilitar Navigator Lock API — evita "orphaned lock" no gotrue-js
      // que causa timeout de 5s e trava getSession/auth state
      lock: async (_name, _acquireTimeout, fn) => await fn(),
    },
  });
  return client;
}
