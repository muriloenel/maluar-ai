-- ============================================
-- Maluar AI — Migração para Geração de Imagem IA
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Adicionar colunas de controle de quota de imagens
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS images_today integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS images_reset_at timestamptz;
