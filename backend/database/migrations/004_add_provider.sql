-- Migration 004: Adicionar suporte multi-gateway (Asaas + Wide Pay)
ALTER TABLE gateway_configs ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'asaas';
ALTER TABLE gateway_configs ADD COLUMN IF NOT EXISTS widepay_wallet_id VARCHAR(100);
ALTER TABLE gateway_configs ADD COLUMN IF NOT EXISTS widepay_wallet_token VARCHAR(255);

-- Atualizar registros existentes para Asaas
UPDATE gateway_configs SET provider = 'asaas' WHERE provider IS NULL;