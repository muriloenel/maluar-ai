-- Tabela de controle de pagamentos Pix manuais
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pix_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('pro', 'premium')),
  amount numeric(10,2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index para buscas por status e vencimento
CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status);
CREATE INDEX IF NOT EXISTS idx_pix_payments_expires ON pix_payments(expires_at);
CREATE INDEX IF NOT EXISTS idx_pix_payments_user ON pix_payments(user_id);

-- RLS: service role apenas (admin)
ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy para anon/authenticated — só service role acessa
