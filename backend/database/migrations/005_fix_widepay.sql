-- Migration 005: Adicionar coluna widepay_wallet_token (wallet_id já existe)
ALTER TABLE gateway_configs ADD COLUMN IF NOT EXISTS widepay_wallet_token VARCHAR(255);