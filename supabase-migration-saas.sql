-- ============================================
-- Maluar AI — Migrações para SaaS
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Adicionar colunas do Stripe na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Index para buscar por customer_id (webhook do Stripe)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
