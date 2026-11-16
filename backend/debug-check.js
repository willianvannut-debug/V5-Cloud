const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Faturas - documentos únicos
  const faturas = await db.query(`
    SELECT DISTINCT
      REPLACE(REPLACE(REPLACE(customer_document, '.', ''), '-', ''), '/', '') as doc_limpo,
      customer_document,
      customer_name
    FROM faturas
    WHERE empresa_id = '7d0a7373-b5c3-4874-ac74-97ada94145dc'
    ORDER BY customer_name
    LIMIT 30
  `);

  console.log('========== FATURAS (documentos) ==========');
  faturas.rows.forEach(r => {
    console.log(r.doc_limpo, ' | ', r.customer_document, ' | ', r.customer_name);
  });
  console.log('Total docs únicos:', faturas.rows.length);

  // Clientes - CPFs
  const clientes = await db.query(`
    SELECT
      REPLACE(REPLACE(REPLACE(COALESCE(cpf, cnpj, ''), '.', ''), '-', ''), '/', '') as doc_limpo,
      cpf, cnpj, nome
    FROM clientes
    WHERE empresa_id = '7d0a7373-b5c3-4874-ac74-97ada94145dc'
    ORDER BY nome
    LIMIT 30
  `);

  console.log('\n========== CLIENTES (cpf/cnpj) ==========');
  clientes.rows.forEach(r => {
    console.log(r.doc_limpo, ' | ', r.cpf, ' | ', r.cnpj, ' | ', r.nome);
  });
  console.log('Total clientes:', clientes.rows.length);

  // Quantas faturas têm cliente_id preenchido?
  const linked = await db.query(`
    SELECT
      COUNT(*) as total,
      COUNT(cliente_id) as com_cliente_id,
      COUNT(*) - COUNT(cliente_id) as sem_cliente_id
    FROM faturas
    WHERE empresa_id = '7d0a7373-b5c3-4874-ac74-97ada94145dc'
  `);
  console.log('\n========== RESUMO FATURAS ==========');
  console.log(linked.rows[0]);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });