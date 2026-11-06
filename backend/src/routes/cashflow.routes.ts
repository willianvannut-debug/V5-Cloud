// ============================================================
// V5 Fibra - Rotas: Fluxo de Caixa (Cashflow)
// Endpoints: /api/financial/cashflow/*
// Compatível com fluxo-caixa-page.tsx
// ============================================================
// Entradas = pagamentos recebidos (faturas com status RECEIVED/CONFIRMED)
// Saídas   = contas pagas (bills com status paid/partial)
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function cashflowRoutes(db: Pool): Router {
  const router = Router();

  // ============================================================
  // GET /api/financial/cashflow/summary — resumo do período
  // Query: month, year
  // Retorna: { entradas, saidas, saldo, pend_receita, pend_despesa }
  // ============================================================
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Entradas = faturas pagas (tabela FATURAS)
      const entradas = await db.query(
        `SELECT
          COALESCE(SUM(amount), 0) AS total,
          COUNT(*) AS count
         FROM faturas
         WHERE empresa_id = $1
           AND status IN ('CONFIRMED', 'RECEIVED')
           AND EXTRACT(MONTH FROM paid_date) = $2
           AND EXTRACT(YEAR FROM paid_date) = $3`,
        [tenantId, month, year]
      );

      // Saídas = contas pagas (bills)
      const saidas = await db.query(
        `SELECT
          COALESCE(SUM(paid_amount), 0) AS total,
          COUNT(*) AS count
         FROM bills
         WHERE tenant_id = $1
           AND status IN ('paid', 'partial')
           AND EXTRACT(MONTH FROM paid_date) = $2
           AND EXTRACT(YEAR FROM paid_date) = $3
           AND deleted_at IS NULL`,
        [tenantId, month, year]
      );

      // Pendente receita = faturas pendentes do mês
      const pendReceita = await db.query(
        `SELECT
          COALESCE(SUM(amount), 0) AS total,
          COUNT(*) AS count
         FROM faturas
         WHERE empresa_id = $1
           AND status = 'PENDING'
           AND EXTRACT(MONTH FROM due_date) = $2
           AND EXTRACT(YEAR FROM due_date) = $3`,
        [tenantId, month, year]
      );

      // Pendente despesa = contas pendentes do mês
      const pendDespesa = await db.query(
        `SELECT
          COALESCE(SUM(amount), 0) AS total,
          COUNT(*) AS count
         FROM bills
         WHERE tenant_id = $1
           AND status IN ('pending', 'overdue')
           AND EXTRACT(MONTH FROM due_date) = $2
           AND EXTRACT(YEAR FROM due_date) = $3
           AND deleted_at IS NULL`,
        [tenantId, month, year]
      );

      const entradasTotal = parseFloat(entradas.rows[0]?.total || '0');
      const saidasTotal = parseFloat(saidas.rows[0]?.total || '0');

      res.json({
        entradas: {
          total: entradasTotal,
          count: parseInt(entradas.rows[0]?.count || '0'),
        },
        saidas: {
          total: saidasTotal,
          count: parseInt(saidas.rows[0]?.count || '0'),
        },
        saldo: entradasTotal - saidasTotal,
        pend_receita: {
          total: parseFloat(pendReceita.rows[0]?.total || '0'),
          count: parseInt(pendReceita.rows[0]?.count || '0'),
        },
        pend_despesa: {
          total: parseFloat(pendDespesa.rows[0]?.total || '0'),
          count: parseInt(pendDespesa.rows[0]?.count || '0'),
        },
      });
    } catch (err) {
      console.error('Erro ao buscar cashflow summary:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // GET /api/financial/cashflow/chart — dados diários para gráfico
  // Query: month, year
  // Retorna: { days: [{ dia, entradas, saidas, saldo_acumulado }] }
  // ============================================================
  router.get('/chart', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Descobrir quantos dias tem o mês
      const daysInMonth = new Date(year, month, 0).getDate();

      // Entradas por dia (faturas pagas)
      const entradasDia = await db.query(
        `SELECT
          EXTRACT(DAY FROM paid_date)::INT AS dia,
          COALESCE(SUM(amount), 0) AS total
         FROM faturas
         WHERE empresa_id = $1
           AND status IN ('CONFIRMED', 'RECEIVED')
           AND EXTRACT(MONTH FROM paid_date) = $2
           AND EXTRACT(YEAR FROM paid_date) = $3
         GROUP BY EXTRACT(DAY FROM paid_date)
         ORDER BY dia`,
        [tenantId, month, year]
      );

      // Saídas por dia (contas pagas)
      const saidasDia = await db.query(
        `SELECT
          EXTRACT(DAY FROM paid_date)::INT AS dia,
          COALESCE(SUM(paid_amount), 0) AS total
         FROM bills
         WHERE tenant_id = $1
           AND status IN ('paid', 'partial')
           AND EXTRACT(MONTH FROM paid_date) = $2
           AND EXTRACT(YEAR FROM paid_date) = $3
           AND deleted_at IS NULL
         GROUP BY EXTRACT(DAY FROM paid_date)
         ORDER BY dia`,
        [tenantId, month, year]
      );

      // Montar mapa por dia
      const entradasMap: Record<number, number> = {};
      const saidasMap: Record<number, number> = {};

      for (const row of entradasDia.rows) {
        entradasMap[row.dia] = parseFloat(row.total);
      }
      for (const row of saidasDia.rows) {
        saidasMap[row.dia] = parseFloat(row.total);
      }

      // Montar array com todos os dias e saldo acumulado
      const days = [];
      let saldoAcumulado = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const ent = entradasMap[d] || 0;
        const sai = saidasMap[d] || 0;
        saldoAcumulado += (ent - sai);
        days.push({
          dia: d,
          entradas: ent,
          saidas: sai,
          saldo_acumulado: saldoAcumulado,
        });
      }

      res.json({ days });
    } catch (err) {
      console.error('Erro ao buscar cashflow chart:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // GET /api/financial/cashflow/transactions — lista de movimentações
  // Query: month, year, type (all|entrada|saida)
  // Retorna: { transactions: [...] }
  // ============================================================
  router.get('/transactions', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const type = (req.query.type as string) || 'all';

      const transactions: any[] = [];

      // Entradas (faturas pagas — tabela FATURAS)
      if (type === 'all' || type === 'entrada') {
        const entradas = await db.query(
          `SELECT
            f.id,
            'entrada' AS type,
            COALESCE(f.customer_name, c.nome, 'Cliente') AS description,
            'Fatura paga' AS detail,
            f.amount,
            f.paid_date AS date,
            COALESCE(f.metodo, f.billing_type, 'pix') AS method,
            'receita' AS category
           FROM faturas f
           LEFT JOIN clientes c ON c.id = f.cliente_id
           WHERE f.empresa_id = $1
             AND f.status IN ('CONFIRMED', 'RECEIVED')
             AND EXTRACT(MONTH FROM f.paid_date) = $2
             AND EXTRACT(YEAR FROM f.paid_date) = $3
           ORDER BY f.paid_date DESC`,
          [tenantId, month, year]
        );
        transactions.push(...entradas.rows);
      }

      // Saídas (pagamentos de contas)
      if (type === 'all' || type === 'saida') {
        const saidas = await db.query(
          `SELECT
            bp.id,
            'saida' AS type,
            b.description,
            COALESCE(b.supplier, b.category) AS detail,
            bp.amount,
            bp.payment_date AS date,
            COALESCE(bp.payment_method, b.payment_method, 'pix') AS method,
            b.category
           FROM bill_payments bp
           JOIN bills b ON b.id = bp.bill_id
           WHERE bp.tenant_id = $1
             AND EXTRACT(MONTH FROM bp.payment_date) = $2
             AND EXTRACT(YEAR FROM bp.payment_date) = $3
             AND b.deleted_at IS NULL
           ORDER BY bp.payment_date DESC`,
          [tenantId, month, year]
        );
        transactions.push(...saidas.rows);
      }

      // Ordenar por data decrescente
      transactions.sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db2 = new Date(b.date).getTime();
        return db2 - da;
      });

      res.json({ transactions });
    } catch (err) {
      console.error('Erro ao buscar cashflow transactions:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // GET /api/financial/cashflow/monthly — comparação mensal
  // Query: year
  // Retorna: { months: [{ mes, entradas, saidas, saldo }] }
  // ============================================================
  router.get('/monthly', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      // Entradas mensais (faturas pagas)
      const entradas = await db.query(
        `SELECT
          EXTRACT(MONTH FROM paid_date)::INT AS mes,
          COALESCE(SUM(amount), 0) AS total
         FROM faturas
         WHERE empresa_id = $1
           AND status IN ('CONFIRMED', 'RECEIVED')
           AND EXTRACT(YEAR FROM paid_date) = $2
         GROUP BY EXTRACT(MONTH FROM paid_date)
         ORDER BY mes`,
        [tenantId, year]
      );

      // Saídas mensais
      const saidas = await db.query(
        `SELECT
          EXTRACT(MONTH FROM paid_date)::INT AS mes,
          COALESCE(SUM(paid_amount), 0) AS total
         FROM bills
         WHERE tenant_id = $1
           AND status IN ('paid', 'partial')
           AND EXTRACT(YEAR FROM paid_date) = $2
           AND deleted_at IS NULL
         GROUP BY EXTRACT(MONTH FROM paid_date)
         ORDER BY mes`,
        [tenantId, year]
      );

      // Montar mapas
      const entradasMap: Record<number, number> = {};
      const saidasMap: Record<number, number> = {};

      for (const row of entradas.rows) {
        entradasMap[row.mes] = parseFloat(row.total);
      }
      for (const row of saidas.rows) {
        saidasMap[row.mes] = parseFloat(row.total);
      }

      // Gerar 12 meses
      const months = [];
      for (let m = 1; m <= 12; m++) {
        const ent = entradasMap[m] || 0;
        const sai = saidasMap[m] || 0;
        months.push({
          mes: m,
          entradas: ent,
          saidas: sai,
          saldo: ent - sai,
        });
      }

      res.json({ months });
    } catch (err) {
      console.error('Erro ao buscar cashflow monthly:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
}