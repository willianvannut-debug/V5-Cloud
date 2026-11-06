-- ============================================================
-- V5 Fibra - Migration 006: Tabela de Faturas/Cobranças
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  gateway_id VARCHAR(200),
  provider VARCHAR(20) DEFAULT 'asaas',
  customer_name VARCHAR(255) NOT NULL,
  customer_document VARCHAR(20),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_gateway_id VARCHAR(200),
  amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2),
  billing_type VARCHAR(20) NOT NULL DEFAULT 'BOLETO',
  due_date DATE NOT NULL,
  paid_date DATE,
  status VARCHAR(20) DEFAULT 'PENDING',
  description TEXT,
  external_reference VARCHAR(200),
  boleto_url TEXT,
  boleto_barcode TEXT,
  boleto_nosso_numero VARCHAR(50),
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_transaction_id VARCHAR(200),
  pix_end_to_end_id VARCHAR(200),
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_billing ON invoices(tenant_id, billing_type);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_gateway ON invoices(tenant_id, gateway_id);