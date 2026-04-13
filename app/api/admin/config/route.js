import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin';
import { getConfigsGrouped, setConfig, invalidateConfigCache, DEFAULTS } from '../../../../lib/config';

// GET — Retorna todas as configurações agrupadas por categoria
export async function GET(req) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const grouped = await getConfigsGrouped();
  if (!grouped) {
    // Fallback: retorna defaults estruturados
    return NextResponse.json({ configs: formatDefaults(), defaults: DEFAULTS });
  }

  return NextResponse.json({ configs: grouped, defaults: DEFAULTS });
}

// PATCH — Atualiza uma ou mais configurações
export async function PATCH(req) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  try {
    const body = await req.json();
    const { updates } = body; // { key: value, key2: value2, ... }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Formato inválido. Envie { updates: { key: value } }' }, { status: 400 });
    }

    // Validar que todas as keys existem nos defaults
    const validKeys = Object.keys(DEFAULTS);
    const invalidKeys = Object.keys(updates).filter(k => !validKeys.includes(k));
    if (invalidKeys.length > 0) {
      return NextResponse.json({ error: `Chaves inválidas: ${invalidKeys.join(', ')}` }, { status: 400 });
    }

    // Validações de tipo e range
    const errors = [];
    for (const [key, value] of Object.entries(updates)) {
      // Quotas e limites devem ser números >= 0
      if (key.startsWith('quota_') || key.startsWith('rate_limit_') || key.startsWith('ai_max_tokens_') || key.startsWith('price_')) {
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          errors.push(`${key}: deve ser um número >= 0`);
        }
      }
      // Temperatura: 0 a 1
      if (key === 'ai_temperature') {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 1) {
          errors.push(`${key}: deve ser entre 0 e 1`);
        }
      }
      // Modelo: deve ser string não vazia
      if (key.startsWith('ai_model_')) {
        if (typeof value !== 'string' || !value.trim()) {
          errors.push(`${key}: deve ser um nome de modelo válido`);
        }
      }
      // Maintenance mode: boolean
      if (key === 'maintenance_mode') {
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(`${key}: deve ser true ou false`);
        }
      }
      // Banner type
      if (key === 'global_banner_type') {
        if (!['info', 'warning', 'success'].includes(value)) {
          errors.push(`${key}: deve ser info, warning ou success`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validação falhou', details: errors }, { status: 400 });
    }

    // Aplicar updates
    const results = {};
    for (const [key, value] of Object.entries(updates)) {
      const ok = await setConfig(key, value, user.id);
      results[key] = ok ? 'ok' : 'error';
    }

    // Invalidar todo o cache após batch update
    invalidateConfigCache();

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('[ADMIN-CONFIG] Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function formatDefaults() {
  const grouped = {};
  const categoryMap = {
    quota_messages: 'quotas', quota_images: 'quotas', rate_limit: 'quotas',
    ai_: 'ai', price_: 'business', maintenance: 'system', global_banner: 'system',
  };

  for (const [key, value] of Object.entries(DEFAULTS)) {
    let cat = 'general';
    for (const [prefix, category] of Object.entries(categoryMap)) {
      if (key.startsWith(prefix)) { cat = category; break; }
    }
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ key, value, label: key, updated_at: null });
  }
  return grouped;
}
