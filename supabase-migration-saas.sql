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

-- 2. Adicionar coluna de telefone na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- 3. Adicionar coluna de status no profiles (admin pode ativar/desativar)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 4. Tabela de logs de uso da IA (monitoramento de custos)
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  model text NOT NULL,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  feature text DEFAULT 'chat',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_created
  ON public.usage_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user
  ON public.usage_logs (user_id, created_at DESC);

-- RLS para usage_logs (apenas service role pode inserir/ler)
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Ninguém lê via client (apenas server/service role)
-- O admin dashboard usa service role key nos API routes

-- 5. Tabela de idempotência para webhooks do Stripe
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id
  ON public.webhook_events (event_id);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Limpar eventos antigos (>30 dias) — executar periodicamente
-- DELETE FROM public.webhook_events WHERE created_at < now() - interval '30 days';
