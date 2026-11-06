-- ============================================================
-- V5 Fibra - Migration 001: Módulo Financeiro
-- Cria todas as tabelas principais
-- ============================================================

-- Configuração do gateway Asaas por tenant
CREATE TABLE IF NOT EXISTS gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) DEFAULT 'ASAAS',
  api_key TEXT NOT NULL,
  environment VARCHAR(20) DEFAULT 'PRODUCTION',
  wallet_id VARCHAR(100),
  split_enabled BOOLEAN DEFAULT false,
  split_fixed NUMERIC(10,2) DEFAULT 0,
  split_percent NUMERIC(5,2) DEFAULT 0,
  webhook_url TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Clientes sincronizados com Asaas
CREATE TABLE IF NOT EXISTS asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  asaas_customer_id VARCHAR(100) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  cpf_cnpj VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, customer_id),
  UNIQUE(tenant_id, asaas_customer_id)
);

-- Faturas / Cobranças
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  customer_name VARCHAR(255),
  customer_document VARCHAR(20),
  asaas_charge_id VARCHAR(100),
  installment_plan_id UUID,
  installment_number INT,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  net_amount NUMERIC(10,2),
  due_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING',
  billing_type VARCHAR(30) DEFAULT 'UNDEFINED',
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_expiration TIMESTAMPTZ,
  boleto_url TEXT,
  boleto_barcode VARCHAR(100),
  boleto_due_date DATE,
  invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  fine_value NUMERIC(10,2) DEFAULT 0,
  interest_value NUMERIC(10,2) DEFAULT 0,
  discount_value NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_asaas ON invoices(asaas_charge_id);

-- Planos de parcelamento (carnês)
CREATE TABLE IF NOT EXISTS installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  customer_name VARCHAR(255),
  description TEXT,
  total_amount NUMERIC(10,2) NOT NULL,
  installment_count INT NOT NULL,
  installment_value NUMERIC(10,2) NOT NULL,
  billing_type VARCHAR(30) DEFAULT 'BOLETO',
  first_due_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'ACTIVE',
  asaas_installment_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_tenant ON installment_plans(tenant_id);

-- Eventos de pagamento (histórico)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  event_type VARCHAR(50) NOT NULL,
  status_before VARCHAR(30),
  status_after VARCHAR(30),
  amount NUMERIC(10,2),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_invoice ON payment_events(invoice_id);

-- Logs de webhook
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  provider VARCHAR(50) DEFAULT 'ASAAS',
  event_type VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant ON webhook_logs(tenant_id);

-- Régua de cobrança
CREATE TABLE IF NOT EXISTS billing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) DEFAULT 'Régua Padrão',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Passos da régua
CREATE TABLE IF NOT EXISTS billing_rule_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES billing_rules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  step_order INT NOT NULL,
  days_offset INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  channel VARCHAR(30),
  template TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_steps_rule ON billing_rule_steps(rule_id);

-- Configuração de cobrança automática
CREATE TABLE IF NOT EXISTS auto_billing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  enabled BOOLEAN DEFAULT false,
  generate_day INT DEFAULT 1,
  due_day INT DEFAULT 10,
  billing_type VARCHAR(30) DEFAULT 'BOLETO',
  apply_fine BOOLEAN DEFAULT true,
  fine_value NUMERIC(5,2) DEFAULT 2.00,
  apply_interest BOOLEAN DEFAULT true,
  interest_value NUMERIC(5,2) DEFAULT 1.00,
  apply_discount BOOLEAN DEFAULT false,
  discount_value NUMERIC(5,2) DEFAULT 0,
  discount_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Notas fiscais (NFCom)
CREATE TABLE IF NOT EXISTS fiscal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  number INT NOT NULL,
  series VARCHAR(10) DEFAULT '1',
  status VARCHAR(30) DEFAULT 'DRAFT',
  xml TEXT,
  pdf_url TEXT,
  protocol VARCHAR(100),
  access_key VARCHAR(100),
  sent_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_notes_tenant ON fiscal_notes(tenant_id);

-- Função para gerar próximo número de NF
CREATE OR REPLACE FUNCTION fn_next_nf_number(p_tenant_id UUID)
RETURNS INT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1 INTO next_num
  FROM fiscal_notes WHERE tenant_id = p_tenant_id;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- View: resumo financeiro por tenant
CREATE OR REPLACE VIEW vw_financial_summary AS
SELECT
  tenant_id,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
  COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue_count,
  COUNT(*) FILTER (WHERE status IN ('CONFIRMED','RECEIVED')) as paid_count,
  COUNT(*) FILTER (WHERE status = 'CANCELED') as canceled_count,
  COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) as pending_amount,
  COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0) as overdue_amount,
  COALESCE(SUM(amount) FILTER (WHERE status IN ('CONFIRMED','RECEIVED')), 0) as paid_amount
FROM invoices
GROUP BY tenant_id;