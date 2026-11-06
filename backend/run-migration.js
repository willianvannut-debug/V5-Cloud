const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const sql = fs.readFileSync('database/migrations/003_add_gateway_columns.sql', 'utf8');
    await p.query(sql);
    console.log('Colunas adicionadas com sucesso!');
  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    await p.end();
    process.exit();
  }
}

run();