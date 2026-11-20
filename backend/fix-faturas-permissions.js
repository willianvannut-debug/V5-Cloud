// ============================================================
// V5 Fibra - Corrige permissões da tabela FATURAS no Supabase
// A tabela foi criada direto via conexão Postgres (fora do painel
// do Supabase), então os papéis usados pelo PostgREST/Supabase
// client (service_role, authenticated, anon) nunca ganharam GRANT
// nela -> por isso a Visão Geral dava "permission denied for table
// faturas" e o financeiro aparecia zerado mesmo com dados no banco.
// ============================================================
const { Pool } = require('pg');
require('dotenv').config();

const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await p.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.faturas TO service_role;`);
    await p.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.faturas TO authenticated;`);
    await p.query(`GRANT SELECT ON TABLE public.faturas TO anon;`);

    // Garante que sequences/colunas identity da tabela também sejam utilizáveis
    await p.query(`
      DO $$
      DECLARE
        seq text;
      BEGIN
        FOR seq IN
          SELECT pg_get_serial_sequence('public.faturas', column_name)
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'faturas'
        LOOP
          IF seq IS NOT NULL THEN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role, authenticated;', seq);
          END IF;
        END LOOP;
      END $$;
    `);

    console.log('Permissões da tabela faturas corrigidas com sucesso!');

    const check = await p.query(`
      SELECT grantee, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND table_name = 'faturas'
      ORDER BY grantee, privilege_type;
    `);
    console.log('Grants atuais em faturas:');
    console.table(check.rows);
  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    await p.end();
    process.exit();
  }
}

run();
