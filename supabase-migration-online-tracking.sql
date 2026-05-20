-- Adiciona coluna last_seen_at na tabela profiles para rastrear usuários online
-- Execute no Supabase SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Index para queries de "quem está online" (últimos 5 min)
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles (last_seen_at DESC)
WHERE last_seen_at IS NOT NULL;
