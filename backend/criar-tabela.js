const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.qienwgcfwxwzkbyiioqq:Iaypfabk1!12@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
});

const sql = `
CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  fine_enabled BOOLEAN DEFAULT true,
  fine_type VARCHAR(20) DEFAULT 'PERCENTAGE',
  fine_value DECIMAL(10,2) DEFAULT 2,
  interest_enabled BOOLEAN DEFAULT true,
  interest_type VARCHAR(20) DEFAULT 'MONTHLY',
  interest_value DECIMAL(10,2) DEFAULT 1,
  discount_enabled BOOLEAN DEFAULT false,
  discount_type VARCHAR(20) DEFAULT 'PERCENTAGE',
  discount_value DECIMAL(10,2) DEFAULT 5,
  discount_days_before INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

pool.query(sql)
  .then(() => {
    console.log('Tabela financial_settings criada com sucesso!');
    pool.end();
  })
  .catch((err) => {
    console.error('Erro:', err.message);
    pool.end();
  });