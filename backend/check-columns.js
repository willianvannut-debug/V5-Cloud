require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query(`
  SELECT column_name, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_name = 'faturas' 
  ORDER BY ordinal_position
`).then(res => {
  console.log('Colunas da tabela faturas:');
  res.rows.forEach(r => console.log(' ', r.column_name, '| nullable:', r.is_nullable, '| default:', r.column_default));
  pool.end();
}).catch(err => {
  console.error('Erro:', err.message);
  pool.end();
});