import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Singleton service client — reutilizado entre requests
let _serviceClient = null;
export function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  if (!_serviceClient) {
    _serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

// Singleton auth client para validação de tokens
let _authClient = null;
function getAuthClient() {
  if (!supabaseUrl) return null;
  if (!_authClient) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) return null;
    _authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _authClient;
}

// Cache de getUser — evita roundtrip ao Supabase se token repetido
const _userCache = new Map();
const USER_CACHE_TTL = 60_000; // 1 minuto

export async function getAuthUser(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token || !supabaseUrl) return null;

  // Verificar cache (token curto como key para economizar memória)
  const cacheKey = token.slice(-20);
  const cached = _userCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < USER_CACHE_TTL) {
    return cached.user;
  }

  const supabase = getAuthClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  // Cachear resultado
  _userCache.set(cacheKey, { user: data.user, ts: Date.now() });
  // Limpar entradas expiradas (max 200)
  if (_userCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of _userCache) {
      if (now - v.ts > USER_CACHE_TTL) _userCache.delete(k);
    }
  }

  return data.user;
}

export function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

export async function requireAdmin(req) {
  const user = await getAuthUser(req);
  if (!user || !isAdmin(user.email)) return null;
  return user;
}
