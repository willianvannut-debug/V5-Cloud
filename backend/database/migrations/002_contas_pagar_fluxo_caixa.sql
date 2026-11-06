-- ============================================================
-- V5 Fibra - Migration 002: Contas a Pagar e Fluxo de Caixa
-- ============================================================

-- Categorias de despesa
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  icon VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant ON expense_categories(tenant_id);

-- Contas a pagar
CREATE TABLE IF NOT EXISTS accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING',
  category VARCHAR(100) DEFAULT 'OUTROS',
  supplier VARCHAR(255),
  recurrence VARCHAR(30) DEFAULT 'NONE',
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_tenant ON accounts_payable(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due ON accounts_payable(tenant_id, due_date);

-- Negativação (SPC/Serasa)
CREATE TABLE IF NOT EXISTS credit_bureau_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  customer_name VARCHAR(255),
  customer_document VARCHAR(20),
  amount NUMERIC(10,2) NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  due_date DATE,
  days_overdue INT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'PENDING',
  sent_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_bureau_tenant ON credit_bureau_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_bureau_status ON credit_bureau_entries(tenant_id, status);

-- View: Fluxo de Caixa
CREATE OR REPLACE VIEW vw_cash_flow AS
SELECT
  tenant_id,
  'INCOME' as type,
  description,
  amount,
  due_date,
  status,
  CASE WHEN status IN ('CONFIRMED','RECEIVED') THEN 'REALIZED' ELSE 'PROJECTED' END as flow_type,
  created_at
FROM invoices
UNION ALL
SELECT
  tenant_id,
  'EXPENSE' as type,
  description,
  amount * -1 as amount,
  due_date,
  status,
  CASE WHEN status = 'PAID' THEN 'REALIZED' ELSE 'PROJECTED' END as flow_type,
  created_at
FROM accounts_payable
WHERE status != 'CANCELED';

-- Inserir categorias padrão para novos tenants (função utilitária)
CREATE OR REPLACE FUNCTION fn_seed_expense_categories(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO expense_categories (tenant_id, name, color) VALUES
    (p_tenant_id, 'Infraestrutura', '#3B82F6'),
    (p_tenant_id, 'Pessoal', '#10B981'),
    (p_tenant_id, 'Impostos', '#EF4444'),
    (p_tenant_id, 'Marketing', '#8B5CF6'),
    (p_tenant_id, 'Manutenção', '#F59E0B'),
    (p_tenant_id, 'Outros', '#6B7280')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;