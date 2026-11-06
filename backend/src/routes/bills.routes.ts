// ============================================================
// V5 Fibra - Rotas: Contas a Pagar (Bills)
// Endpoints: /api/financial/bills/*
// Compatível com contas-pagar-page.tsx
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function billsRoutes(db: Pool): Router {
  const router = Router();

  // ============================================================
  // GET /api/financial/bills/summary — resumo para cards
  // Retorna: { pending, paid, overdue, upcoming, by_category }
  // ============================================================
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const { month, year } = req.query;

      // Marcar vencidas automaticamente
      await db.query(
        `UPDATE bills SET status = 'overdue'
         WHERE tenant_id = $1 AND status = 'pending'
         AND due_date < CURRENT_DATE AND deleted_at IS NULL`,
        [tenantId]
      );

      let dateFilter = '';
      const params: any[] = [tenantId];
      let idx = 2;

      if (month && year) {
        dateFilter = ` AND EXTRACT(MONTH FROM due_date) = $${idx} AND EXTRACT(YEAR FROM due_date) = $${idx + 1}`;
        params.push(parseInt(month as string), parseInt(year as string));
        idx += 2;
      }

      const result = await db.query(
        `SELECT
          json_build_object(
            'total', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
            'count', COUNT(*) FILTER (WHERE status = 'pending')
          ) AS pending,
          json_build_object(
            'total', COALESCE(SUM(paid_amount) FILTER (WHERE status = 'paid'), 0),
            'count', COUNT(*) FILTER (WHERE status = 'paid')
          ) AS paid,
          json_build_object(
            'total', COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0),
            'count', COUNT(*) FILTER (WHERE status = 'overdue')
          ) AS overdue,
          json_build_object(
            'total', COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'), 0),
            'count', COUNT(*) FILTER (WHERE status = 'pending' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')
          ) AS upcoming
         FROM bills
         WHERE tenant_id = $1 AND deleted_at IS NULL${dateFilter}`,
        params
      );

      // Por categoria
      const catResult = await db.query(
        `SELECT category,
          COALESCE(SUM(amount), 0) AS total,
          COALESCE(SUM(paid_amount), 0) AS paid_total,
          COUNT(*) AS count
         FROM bills
         WHERE tenant_id = $1 AND deleted_at IS NULL AND status != 'cancelled'${dateFilter}
         GROUP BY category ORDER BY total DESC`,
        params
      );

      const row = result.rows[0] || {};
      res.json({
        pending: row.pending || { total: 0, count: 0 },
        paid: row.paid || { total: 0, count: 0 },
        overdue: row.overdue || { total: 0, count: 0 },
        upcoming: row.upcoming || { total: 0, count: 0 },
        by_category: catResult.rows,
      });
    } catch (err) {
      console.error('Erro ao buscar summary bills:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // GET /api/financial/bills — listar contas com filtros
  // Query: status, category, month, year
  // Retorna: { bills: [...] }
  // ============================================================
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const { status, category, month, year } = req.query;

      // Marcar vencidas automaticamente
      await db.query(
        `UPDATE bills SET status = 'overdue'
         WHERE tenant_id = $1 AND status = 'pending'
         AND due_date < CURRENT_DATE AND deleted_at IS NULL`,
        [tenantId]
      );

      let query = `SELECT * FROM bills WHERE tenant_id = $1 AND deleted_at IS NULL`;
      const params: any[] = [tenantId];
      let idx = 2;

      if (status && status !== 'all') {
        query += ` AND status = $${idx++}`;
        params.push(status);
      }
      if (category && category !== 'all') {
        query += ` AND category = $${idx++}`;
        params.push(category);
      }
      if (month) {
        query += ` AND EXTRACT(MONTH FROM due_date) = $${idx++}`;
        params.push(parseInt(month as string));
      }
      if (year) {
        query += ` AND EXTRACT(YEAR FROM due_date) = $${idx++}`;
        params.push(parseInt(year as string));
      }

      query += ` ORDER BY due_date ASC`;

      const result = await db.query(query, params);

      res.json({ bills: result.rows });
    } catch (err) {
      console.error('Erro ao listar bills:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // POST /api/financial/bills — criar nova conta
  // ============================================================
  router.post('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const {
        description, category, supplier, amount,
        due_date, payment_method, notes, recurring, recurring_interval,
      } = req.body;

      if (!description || !amount || !due_date) {
        return res.status(400).json({ error: 'Campos obrigatórios: description, amount, due_date' });
      }

      const result = await db.query(
        `INSERT INTO bills (
          tenant_id, description, category, supplier, amount,
          due_date, payment_method, notes, recurring, recurring_interval
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
          tenantId, description, category || 'outros', supplier,
          amount, due_date, payment_method, notes,
          recurring || false, recurring_interval,
        ]
      );

      // Se recorrente, gerar próximas parcelas
      if (recurring && recurring_interval) {
        const bill = result.rows[0];
        await generateRecurring(db, tenantId, bill);
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Erro ao criar bill:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // PUT /api/financial/bills/:id — atualizar conta
  // ============================================================
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const {
        description, category, supplier, amount,
        due_date, payment_method, notes, recurring, recurring_interval,
      } = req.body;

      await db.query(
        `UPDATE bills SET
          description = COALESCE($1, description),
          category = COALESCE($2, category),
          supplier = $3,
          amount = COALESCE($4, amount),
          due_date = COALESCE($5, due_date),
          payment_method = $6,
          notes = $7,
          recurring = COALESCE($8, recurring),
          recurring_interval = $9
        WHERE id = $10 AND tenant_id = $11 AND deleted_at IS NULL`,
        [
          description, category, supplier, amount,
          due_date, payment_method, notes,
          recurring, recurring_interval,
          req.params.id, tenantId,
        ]
      );

      const updated = await db.query(
        `SELECT * FROM bills WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, tenantId]
      );

      res.json(updated.rows[0] || { success: true });
    } catch (err) {
      console.error('Erro ao atualizar bill:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // DELETE /api/financial/bills/:id — excluir conta (soft delete)
  // ============================================================
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;

      await db.query(
        `UPDATE bills SET deleted_at = NOW(), status = 'cancelled'
         WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, tenantId]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('Erro ao excluir bill:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // POST /api/financial/bills/:id/payments — registrar pagamento
  // ============================================================
  router.post('/:id/payments', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const billId = req.params.id;
      const { amount, payment_date, payment_method, notes } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valor do pagamento inválido' });
      }

      // Verificar se a conta existe
      const bill = await db.query(
        `SELECT * FROM bills WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [billId, tenantId]
      );

      if (bill.rows.length === 0) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      // Inserir pagamento (o trigger atualiza o status e paid_amount automaticamente)
      const result = await db.query(
        `INSERT INTO bill_payments (bill_id, tenant_id, amount, payment_date, payment_method, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [billId, tenantId, amount, payment_date || new Date().toISOString().split('T')[0], payment_method, notes]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // GET /api/financial/bills/:id/payments — histórico de pagamentos
  // Retorna: { payments: [...] }
  // ============================================================
  router.get('/:id/payments', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      const billId = req.params.id;

      const result = await db.query(
        `SELECT * FROM bill_payments
         WHERE bill_id = $1 AND tenant_id = $2
         ORDER BY payment_date DESC, created_at DESC`,
        [billId, tenantId]
      );

      res.json({ payments: result.rows });
    } catch (err) {
      console.error('Erro ao buscar payments:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  return router;
}

// ============================================================
// Helper: gerar contas recorrentes
// ============================================================
async function generateRecurring(db: Pool, tenantId: string, bill: any) {
  const intervalMap: Record<string, number> = {
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  };

  const months = intervalMap[bill.recurring_interval] || 1;
  const limit = 12; // Gerar até 12 meses à frente
  let currentDate = new Date(bill.due_date);

  for (let i = 0; i < Math.floor(limit / months); i++) {
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + months);

    // Não gerar mais de 1 ano à frente
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (currentDate > oneYearFromNow) break;

    await db.query(
      `INSERT INTO bills (
        tenant_id, description, category, supplier, amount,
        due_date, payment_method, notes, recurring, recurring_interval
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        tenantId, bill.description, bill.category, bill.supplier,
        bill.amount, currentDate.toISOString().split('T')[0],
        bill.payment_method, bill.notes, true, bill.recurring_interval,
      ]
    );
  }
}