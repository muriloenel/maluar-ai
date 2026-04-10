import { z } from 'zod';

// === Chat ===
const messageContentBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().min(1).max(50000) }),
  z.object({ type: z.literal('image'), source: z.object({
    type: z.literal('base64'),
    media_type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    data: z.string().max(10_000_000), // ~7.5MB base64
  }) }),
]);

const chatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.string().min(1).max(50000),
    z.array(messageContentBlock).min(1).max(10),
  ]),
});

export const chatBodySchema = z.object({
  messages: z.array(chatMessage).min(1).max(20),
  system: z.string().max(15000).optional(),
  stream: z.boolean().optional(),
});

// === Stripe Checkout ===
export const checkoutSchema = z.object({
  plan: z.enum(['pro', 'premium']),
});

// === Image Generate ===
export const imageGenerateSchema = z.object({
  prompt: z.string().min(3).max(1000),
  style: z.string().max(50).optional(),
  size: z.enum(['1024x1024', '1024x1536', '1536x1024']).optional(),
});

// === Account ===
export const accountDeleteSchema = z.object({}).optional();

// Helper: parse com erro amigável
export function parseBody(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    if (issues.length === 0) {
      return { error: 'Dados inválidos', data: null };
    }
    const firstError = issues[0];
    const path = firstError.path?.length ? firstError.path.join('.') + ': ' : '';
    return { error: `${path}${firstError.message}`, data: null };
  }
  return { error: null, data: result.data };
}
