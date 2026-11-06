const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.qienwgcfwxwzkbyiioqq:Iaypfabk1!12@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`
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
      )
    `);
    console.log('Tabela invoices criada com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message);
  }
  pool.end();
}

run();