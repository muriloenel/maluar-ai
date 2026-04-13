-- ============================================
-- Maluar AI — App Config (Admin Configurável)
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================

-- Tabela de configurações key-value
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  label text,                          -- nome amigável para o admin
  category text not null default 'general', -- agrupamento
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Desabilitar RLS (só admin acessa via service_role)
alter table public.app_config enable row level security;

-- Nenhuma policy para usuários normais — só service_role acessa
-- Admin usa SUPABASE_SERVICE_ROLE_KEY nas APIs

-- ============================================
-- Valores padrão — inserir todos de uma vez
-- ============================================

-- QUOTAS: Mensagens por dia por plano
insert into public.app_config (key, value, label, category) values
  ('quota_messages_free', '15', 'Mensagens/dia — Free', 'quotas'),
  ('quota_messages_pro', '150', 'Mensagens/dia — Pro', 'quotas'),
  ('quota_messages_premium', '9999', 'Mensagens/dia — Premium', 'quotas')
on conflict (key) do nothing;

-- QUOTAS: Imagens por dia por plano
insert into public.app_config (key, value, label, category) values
  ('quota_images_free', '0', 'Imagens/dia — Free', 'quotas'),
  ('quota_images_pro', '5', 'Imagens/dia — Pro', 'quotas'),
  ('quota_images_premium', '20', 'Imagens/dia — Premium', 'quotas')
on conflict (key) do nothing;

-- QUOTAS: Rate limit (requisições por minuto)
insert into public.app_config (key, value, label, category) values
  ('rate_limit_free', '15', 'Rate limit/min — Free', 'quotas'),
  ('rate_limit_pro', '30', 'Rate limit/min — Pro', 'quotas'),
  ('rate_limit_premium', '60', 'Rate limit/min — Premium', 'quotas')
on conflict (key) do nothing;

-- IA: Modelos e tokens
insert into public.app_config (key, value, label, category) values
  ('ai_model_default', '"claude-haiku-4-5"', 'Modelo padrão', 'ai'),
  ('ai_model_complex', '"claude-sonnet-4-20250514"', 'Modelo para perguntas complexas', 'ai'),
  ('ai_max_tokens_casual', '300', 'Max tokens — casual', 'ai'),
  ('ai_max_tokens_complex', '600', 'Max tokens — complexo', 'ai'),
  ('ai_max_tokens_image', '2000', 'Max tokens — imagem', 'ai'),
  ('ai_temperature', '0.7', 'Temperatura', 'ai'),
  ('ai_extra_instructions', '""', 'Instruções extras para o bot', 'ai')
on conflict (key) do nothing;

-- NEGÓCIO: Preços (para cálculos de MRR)
insert into public.app_config (key, value, label, category) values
  ('price_free', '0', 'Preço mensal — Free (R$)', 'business'),
  ('price_pro', '29.90', 'Preço mensal — Pro (R$)', 'business'),
  ('price_premium', '59.90', 'Preço mensal — Premium (R$)', 'business')
on conflict (key) do nothing;

-- SISTEMA: Manutenção e avisos
insert into public.app_config (key, value, label, category) values
  ('maintenance_mode', 'false', 'Modo manutenção', 'system'),
  ('maintenance_message', '"Estamos em manutenção. Voltamos em breve!"', 'Mensagem de manutenção', 'system'),
  ('global_banner', '""', 'Aviso global (banner para usuárias)', 'system'),
  ('global_banner_type', '"info"', 'Tipo do banner (info/warning/success)', 'system')
on conflict (key) do nothing;
