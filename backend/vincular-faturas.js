// ============================================================
// Script para vincular faturas aos clientes
// Compara por CPF/CNPJ e por nome
// Rode uma vez: node vincular-faturas.js
// ============================================================

const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const EMPRESA_ID = '7d0a7373-b5c3-4874-ac74-97ada94145dc';

async function main() {
  console.log('=== VINCULANDO FATURAS AOS CLIENTES ===\n');

  // 1. Buscar todos os clientes
  const clientes = await db.query(`
    SELECT id, nome,
      REPLACE(REPLACE(REPLACE(COALESCE(cpf, ''), '.', ''), '-', ''), '/', '') as cpf_limpo,
      REPLACE(REPLACE(REPLACE(COALESCE(cnpj, ''), '.', ''), '-', ''), '/', '') as cnpj_limpo,
      cpf, cnpj
    FROM clientes
    WHERE empresa_id = $1
  `, [EMPRESA_ID]);

  console.log('Total clientes:', clientes.rows.length);

  // 2. Buscar faturas SEM cliente_id
  const faturas = await db.query(`
    SELECT id, customer_name, customer_document,
      REPLACE(REPLACE(REPLACE(COALESCE(customer_document, ''), '.', ''), '-', ''), '/', '') as doc_limpo
    FROM faturas
    WHERE empresa_id = $1 AND cliente_id IS NULL
  `, [EMPRESA_ID]);

  console.log('Faturas sem cliente_id:', faturas.rows.length);

  let vinculadasPorCpf = 0;
  let vinculadasPorNome = 0;
  let naoVinculadas = 0;

  for (const fatura of faturas.rows) {
    let clienteId = null;

    // TENTATIVA 1: Vincular por CPF/CNPJ
    if (fatura.doc_limpo && fatura.doc_limpo.length >= 11) {
      const match = clientes.rows.find(c =>
        (c.cpf_limpo && c.cpf_limpo === fatura.doc_limpo) ||
        (c.cnpj_limpo && c.cnpj_limpo === fatura.doc_limpo)
      );
      if (match) {
        clienteId = match.id;
        vinculadasPorCpf++;
      }
    }

    // TENTATIVA 2: Vincular por nome (normalizado)
    if (!clienteId && fatura.customer_name) {
      const nomeNorm = fatura.customer_name.trim().toUpperCase();
      const match = clientes.rows.find(c => {
        if (!c.nome) return false;
        return c.nome.trim().toUpperCase() === nomeNorm;
      });
      if (match) {
        clienteId = match.id;
        vinculadasPorNome++;
      }
    }

    // Atualizar se achou
    if (clienteId) {
      await db.query(
        'UPDATE faturas SET cliente_id = $1 WHERE id = $2',
        [clienteId, fatura.id]
      );
    } else {
      naoVinculadas++;
      console.log('  SEM MATCH:', fatura.customer_name, '|', fatura.customer_document);
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log('Vinculadas por CPF:', vinculadasPorCpf);
  console.log('Vinculadas por NOME:', vinculadasPorNome);
  console.log('Não vinculadas:', naoVinculadas);
  console.log('Total processadas:', vinculadasPorCpf + vinculadasPorNome + naoVinculadas);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });