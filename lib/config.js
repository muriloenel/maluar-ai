import { createClient } from '@supabase/supabase-js';

// Cache em memória com TTL — evita consultas ao banco em cada request
const cache = new Map();
const CACHE_TTL = 30_000; // 30 segundos

// Singleton — reutilizado entre requests
let _serviceSb = null;
function getServiceSupabase() {
  if (_serviceSb) return _serviceSb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _serviceSb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _serviceSb;
}

// Valores padrão (fallback se o banco não responder)
const DEFAULTS = {
  // Quotas mensagens
  quota_messages_free: 15,
  quota_messages_pro: 150,
  quota_messages_premium: 9999,
  // Quotas imagens
  quota_images_free: 0,
  quota_images_pro: 5,
  quota_images_premium: 20,
  // Rate limits
  rate_limit_free: 15,
  rate_limit_pro: 30,
  rate_limit_premium: 60,
  // IA
  ai_model_default: 'claude-haiku-4-5',
  ai_model_complex: 'claude-sonnet-4-20250514',
  ai_max_tokens_casual: 300,
  ai_max_tokens_complex: 600,
  ai_max_tokens_image: 2000,
  ai_temperature: 0.7,
  ai_extra_instructions: '',
  // Negócio
  price_free: 0,
  price_pro: 29.90,
  price_premium: 59.90,
  // Sistema
  maintenance_mode: false,
  maintenance_message: 'Estamos em manutenção. Voltamos em breve!',
  global_banner: '',
  global_banner_type: 'info',
};

// Busca UMA config do cache ou banco
export async function getConfig(key) {
  // Verificar cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.value;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return DEFAULTS[key] ?? null;

  try {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .single();

    const value = data?.value ?? DEFAULTS[key] ?? null;
    cache.set(key, { value, ts: Date.now() });
    return value;
  } catch {
    return DEFAULTS[key] ?? null;
  }
}

// Busca TODAS as configs de uma categoria (ou todas)
export async function getAllConfigs(category = null) {
  const cacheKey = `__all__${category || ''}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.value;
  }

  const supabase = getServiceSupabase();
  if (!supabase) return DEFAULTS;

  try {
    let query = supabase.from('app_config').select('*');
    if (category) query = query.eq('category', category);
    const { data } = await query;

    if (!data || data.length === 0) return DEFAULTS;

    const configs = {};
    for (const row of data) {
      configs[row.key] = row.value;
    }

    // Merge com defaults para garantir que nenhuma config falta
    const merged = { ...DEFAULTS, ...configs };
    cache.set(cacheKey, { value: merged, ts: Date.now() });
    return merged;
  } catch {
    return DEFAULTS;
  }
}

// Busca configs agrupadas por categoria (para o admin dashboard)
export async function getConfigsGrouped() {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from('app_config')
      .select('*')
      .order('category')
      .order('key');

    if (!data) return null;

    const grouped = {};
    for (const row of data) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push({
        key: row.key,
        value: row.value,
        label: row.label,
        updated_at: row.updated_at,
      });
    }
    return grouped;
  } catch {
    return null;
  }
}

// Atualiza uma config
export async function setConfig(key, value, userId = null) {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('app_config')
      .update({ value, updated_at: new Date().toISOString(), updated_by: userId })
      .eq('key', key);

    if (error) return false;

    // Invalidar cache
    cache.delete(key);
    // Invalidar caches de "all"
    for (const k of cache.keys()) {
      if (k.startsWith('__all__')) cache.delete(k);
    }

    return true;
  } catch {
    return false;
  }
}

// Helpers rápidos para uso nas APIs
export async function getQuotaMessages(plan) {
  return await getConfig(`quota_messages_${plan}`) ?? DEFAULTS[`quota_messages_${plan}`] ?? 15;
}

export async function getQuotaImages(plan) {
  return await getConfig(`quota_images_${plan}`) ?? DEFAULTS[`quota_images_${plan}`] ?? 0;
}

export async function getRateLimit(plan) {
  return await getConfig(`rate_limit_${plan}`) ?? DEFAULTS[`rate_limit_${plan}`] ?? 15;
}

export async function getAIConfig() {
  const configs = await getAllConfigs('ai');
  return {
    modelDefault: configs.ai_model_default || DEFAULTS.ai_model_default,
    modelComplex: configs.ai_model_complex || DEFAULTS.ai_model_complex,
    maxTokensCasual: Number(configs.ai_max_tokens_casual) || DEFAULTS.ai_max_tokens_casual,
    maxTokensComplex: Number(configs.ai_max_tokens_complex) || DEFAULTS.ai_max_tokens_complex,
    maxTokensImage: Number(configs.ai_max_tokens_image) || DEFAULTS.ai_max_tokens_image,
    temperature: Number(configs.ai_temperature) || DEFAULTS.ai_temperature,
    extraInstructions: configs.ai_extra_instructions || '',
  };
}

export async function getSystemConfig() {
  const configs = await getAllConfigs('system');
  return {
    maintenanceMode: configs.maintenance_mode === true || configs.maintenance_mode === 'true',
    maintenanceMessage: configs.maintenance_message || DEFAULTS.maintenance_message,
    globalBanner: configs.global_banner || '',
    globalBannerType: configs.global_banner_type || 'info',
  };
}

// Invalida todo o cache (para uso após batch update)
export function invalidateConfigCache() {
  cache.clear();
}

export { DEFAULTS };
