const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.qienwgcfwxwzkbyiioqq:Iaypfabk1!12@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
});

const sql = `
DROP TABLE IF EXISTS billing_rule_steps;
DROP TABLE IF EXISTS billing_rules;

CREATE TABLE billing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'Régua Padrão',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE billing_rule_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES billing_rules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  step_type VARCHAR(10) NOT NULL DEFAULT 'before',
  days_offset INTEGER NOT NULL DEFAULT 3,
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  message TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_billing_rules_tenant ON billing_rules(tenant_id);
CREATE INDEX idx_billing_rule_steps_rule ON billing_rule_steps(rule_id);
`;

pool.query(sql)
  .then(() => {
    console.log('Tabelas recriadas com sucesso!');
    pool.end();
  })
  .catch((err) => {
    console.error('Erro:', err.message);
    pool.end();
  });