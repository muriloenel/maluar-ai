import { describe, it, expect } from 'vitest';

// ===========================
// Quota Logic Tests (pure functions)
// ===========================
// Extraída da lógica de checkQuotaServer para teste isolado

const DAILY_LIMITS = { free: 15, pro: 150, premium: 9999 };

function computeQuota(profile, now = new Date()) {
  if (!profile) return { allowed: true };
  if (profile.status === 'inactive') return { allowed: false, status: 'inactive' };

  const limit = DAILY_LIMITS[profile.plan] || DAILY_LIMITS.free;
  const resetAt = profile.messages_reset_at ? new Date(profile.messages_reset_at) : new Date(0);
  const isNewDay = now.toDateString() !== resetAt.toDateString();

  if (isNewDay) {
    return { allowed: true, remaining: limit, limit, plan: profile.plan };
  }

  const remaining = Math.max(0, limit - (profile.messages_today || 0));
  return { allowed: remaining > 0, remaining, limit, plan: profile.plan };
}

describe('Quota – computeQuota', () => {
  it('permite se profile null (usuário sem profile)', () => {
    expect(computeQuota(null)).toEqual({ allowed: true });
  });

  it('bloqueia usuário inactive', () => {
    const result = computeQuota({ plan: 'pro', status: 'inactive', messages_today: 0 });
    expect(result.allowed).toBe(false);
    expect(result.status).toBe('inactive');
  });

  it('permite free com 0 mensagens hoje', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const result = computeQuota({
      plan: 'free', status: 'active', messages_today: 0,
      messages_reset_at: now.toISOString(),
    }, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(15);
    expect(result.limit).toBe(15);
  });

  it('bloqueia free com 15 mensagens hoje', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const result = computeQuota({
      plan: 'free', status: 'active', messages_today: 15,
      messages_reset_at: now.toISOString(),
    }, now);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('permite free com 14 mensagens hoje', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const result = computeQuota({
      plan: 'free', status: 'active', messages_today: 14,
      messages_reset_at: now.toISOString(),
    }, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('reseta quota em novo dia', () => {
    const now = new Date('2026-04-11T08:00:00Z');
    const result = computeQuota({
      plan: 'free', status: 'active', messages_today: 15,
      messages_reset_at: '2026-04-10T23:00:00Z',
    }, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(15);
  });

  it('pro tem limite de 150', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const result = computeQuota({
      plan: 'pro', status: 'active', messages_today: 100,
      messages_reset_at: now.toISOString(),
    }, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(50);
    expect(result.limit).toBe(150);
  });

  it('premium tem limite de 9999', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const result = computeQuota({
      plan: 'premium', status: 'active', messages_today: 500,
      messages_reset_at: now.toISOString(),
    }, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9499);
  });

  it('plano desconhecido cai no limite free', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const result = computeQuota({
      plan: 'enterprise', status: 'active', messages_today: 10,
      messages_reset_at: now.toISOString(),
    }, now);
    expect(result.limit).toBe(15);
    expect(result.remaining).toBe(5);
  });

  it('sem messages_reset_at trata como novo dia', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const result = computeQuota({
      plan: 'free', status: 'active', messages_today: 15,
      messages_reset_at: null,
    }, now);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(15);
  });
});

// ===========================
// Circuit Breaker Tests
// ===========================
describe('Circuit Breaker Logic', () => {
  const THRESHOLD = 3;

  function shouldBlock(failCount) {
    return failCount >= THRESHOLD;
  }

  it('não bloqueia com 0 falhas', () => {
    expect(shouldBlock(0)).toBe(false);
  });

  it('não bloqueia com 2 falhas', () => {
    expect(shouldBlock(2)).toBe(false);
  });

  it('bloqueia com 3 falhas', () => {
    expect(shouldBlock(3)).toBe(true);
  });

  it('bloqueia com 10 falhas', () => {
    expect(shouldBlock(10)).toBe(true);
  });
});

// ===========================
// Billing Logic Tests
// ===========================
describe('Billing – Webhook Plan Updates', () => {
  // Simula a lógica do webhook para testar decisões de negócio

  function shouldDowngrade(stripeStatus) {
    return ['canceled', 'unpaid'].includes(stripeStatus);
  }

  function isGracePeriod(stripeStatus) {
    return stripeStatus === 'past_due';
  }

  function isActive(stripeStatus) {
    return ['active', 'trialing', 'past_due'].includes(stripeStatus);
  }

  it('active → mantém plano', () => {
    expect(shouldDowngrade('active')).toBe(false);
    expect(isActive('active')).toBe(true);
  });

  it('trialing → mantém plano', () => {
    expect(shouldDowngrade('trialing')).toBe(false);
    expect(isActive('trialing')).toBe(true);
  });

  it('past_due → grace period, mantém plano', () => {
    expect(shouldDowngrade('past_due')).toBe(false);
    expect(isGracePeriod('past_due')).toBe(true);
    expect(isActive('past_due')).toBe(true);
  });

  it('canceled → downgrade para free', () => {
    expect(shouldDowngrade('canceled')).toBe(true);
  });

  it('unpaid → downgrade para free', () => {
    expect(shouldDowngrade('unpaid')).toBe(true);
  });

  it('incomplete → não faz downgrade', () => {
    expect(shouldDowngrade('incomplete')).toBe(false);
  });
});

// ===========================
// Rate Limiter Tests
// ===========================
describe('Rate Limiter Logic', () => {
  const RATE_LIMITS = { free: 15, pro: 30, premium: 60 };

  function checkRateLimit(requestsInWindow, plan) {
    const limit = RATE_LIMITS[plan] || RATE_LIMITS.free;
    return requestsInWindow < limit;
  }

  it('free: permite 14 requests', () => {
    expect(checkRateLimit(14, 'free')).toBe(true);
  });

  it('free: bloqueia na 15a request', () => {
    expect(checkRateLimit(15, 'free')).toBe(false);
  });

  it('pro: permite 29 requests', () => {
    expect(checkRateLimit(29, 'pro')).toBe(true);
  });

  it('pro: bloqueia na 30a request', () => {
    expect(checkRateLimit(30, 'pro')).toBe(false);
  });

  it('premium: permite 59 requests', () => {
    expect(checkRateLimit(59, 'premium')).toBe(true);
  });

  it('plano desconhecido usa limite free', () => {
    expect(checkRateLimit(15, 'bogus')).toBe(false);
  });
});
