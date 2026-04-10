import { describe, it, expect } from 'vitest';
import { chatBodySchema, checkoutSchema, imageGenerateSchema, parseBody } from '../lib/validation';

// ===========================
// Chat Body Validation
// ===========================
describe('chatBodySchema', () => {
  it('aceita body válido com string content', () => {
    const body = {
      messages: [{ role: 'user', content: 'Olá' }],
      stream: true,
    };
    const { error } = parseBody(chatBodySchema, body);
    expect(error).toBeNull();
  });

  it('aceita body com array content (image)', () => {
    const body = {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Analise esta foto' },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'abc123' } },
        ],
      }],
    };
    const { error } = parseBody(chatBodySchema, body);
    expect(error).toBeNull();
  });

  it('rejeita messages vazio', () => {
    const { error } = parseBody(chatBodySchema, { messages: [] });
    expect(error).toBeTruthy();
  });

  it('rejeita role inválido', () => {
    const { error } = parseBody(chatBodySchema, {
      messages: [{ role: 'system', content: 'hack' }],
    });
    expect(error).toBeTruthy();
  });

  it('rejeita mais de 20 mensagens', () => {
    const msgs = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `msg ${i}`,
    }));
    const { error } = parseBody(chatBodySchema, { messages: msgs });
    expect(error).toBeTruthy();
  });

  it('rejeita system prompt > 15000 chars', () => {
    const { error } = parseBody(chatBodySchema, {
      messages: [{ role: 'user', content: 'oi' }],
      system: 'x'.repeat(15001),
    });
    expect(error).toBeTruthy();
  });

  it('rejeita media_type inválido', () => {
    const { error } = parseBody(chatBodySchema, {
      messages: [{
        role: 'user',
        content: [{ type: 'image', source: { type: 'base64', media_type: 'image/svg+xml', data: 'abc' } }],
      }],
    });
    expect(error).toBeTruthy();
  });

  it('rejeita body null', () => {
    const { error } = parseBody(chatBodySchema, null);
    expect(error).toBeTruthy();
  });
});

// ===========================
// Checkout Validation
// ===========================
describe('checkoutSchema', () => {
  it('aceita plano pro', () => {
    const { error, data } = parseBody(checkoutSchema, { plan: 'pro' });
    expect(error).toBeNull();
    expect(data.plan).toBe('pro');
  });

  it('aceita plano premium', () => {
    const { error, data } = parseBody(checkoutSchema, { plan: 'premium' });
    expect(error).toBeNull();
    expect(data.plan).toBe('premium');
  });

  it('rejeita plano free (não é upgrade)', () => {
    const { error } = parseBody(checkoutSchema, { plan: 'free' });
    expect(error).toBeTruthy();
  });

  it('rejeita plano inventado', () => {
    const { error } = parseBody(checkoutSchema, { plan: 'mega_ultra' });
    expect(error).toBeTruthy();
  });

  it('rejeita body sem plan', () => {
    const { error } = parseBody(checkoutSchema, {});
    expect(error).toBeTruthy();
  });

  it('rejeita plan numérico (type coercion)', () => {
    const { error } = parseBody(checkoutSchema, { plan: 123 });
    expect(error).toBeTruthy();
  });
});

// ===========================
// Image Generate Validation
// ===========================
describe('imageGenerateSchema', () => {
  it('aceita prompt válido', () => {
    const { error, data } = parseBody(imageGenerateSchema, { prompt: 'Unhas stiletto rosa com glitter' });
    expect(error).toBeNull();
    expect(data.prompt).toBe('Unhas stiletto rosa com glitter');
  });

  it('rejeita prompt vazio', () => {
    const { error } = parseBody(imageGenerateSchema, { prompt: '' });
    expect(error).toBeTruthy();
  });

  it('rejeita prompt curto demais (< 3 chars)', () => {
    const { error } = parseBody(imageGenerateSchema, { prompt: 'ab' });
    expect(error).toBeTruthy();
  });

  it('rejeita prompt > 1000 chars', () => {
    const { error } = parseBody(imageGenerateSchema, { prompt: 'x'.repeat(1001) });
    expect(error).toBeTruthy();
  });

  it('rejeita sem prompt', () => {
    const { error } = parseBody(imageGenerateSchema, {});
    expect(error).toBeTruthy();
  });
});
