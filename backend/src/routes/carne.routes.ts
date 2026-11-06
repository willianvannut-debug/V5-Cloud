// ============================================================
// V5 Fibra - Carnê Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function carneRoutes(db: Pool) {
  const router = Router();

  // POST /api/financial/carne — criar carnê (parcelamento)
  router.post('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { customerId, totalAmount, installmentCount, dueDate, billingType, description } = req.body;
      if (!customerId || !totalAmount || !installmentCount || !dueDate) {
        return res.status(400).json({ error: 'Campos obrigatórios: customerId, totalAmount, installmentCount, dueDate' });
      }

      const installmentAmount = parseFloat((totalAmount / installmentCount).toFixed(2));
      const type = billingType || 'BOLETO';

      // Criar o plano de parcelamento
      const planResult = await db.query(
        `INSERT INTO installment_plans (tenant_id, customer_id, total_amount, installment_count, installment_amount, billing_type, description, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', NOW())
         RETURNING *`,
        [tenantId, customerId, totalAmount, installmentCount, installmentAmount, type, description || null]
      );

      const plan = planResult.rows[0];

      // Criar as faturas (parcelas) do carnê
      const invoices = [];
      for (let i = 0; i < installmentCount; i++) {
        const parcDueDate = new Date(dueDate);
        parcDueDate.setMonth(parcDueDate.getMonth() + i);

        const invResult = await db.query(
          `INSERT INTO invoices (tenant_id, customer_id, amount, due_date, billing_type, status, description, external_reference, created_at)
           VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7, NOW())
           RETURNING *`,
          [
            tenantId,
            customerId,
            installmentAmount,
            parcDueDate.toISOString().split('T')[0],
            type,
            `${description || 'Carnê'} - Parcela ${i + 1}/${installmentCount}`,
            plan.id
          ]
        );
        invoices.push(invResult.rows[0]);
      }

      res.status(201).json({ ...plan, invoices });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/financial/carne — listar carnês
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      let where = 'WHERE tenant_id = $1';
      const values: any[] = [tenantId];
      let idx = 2;

      if (req.query.customer_id) {
        where += ` AND customer_id = $${idx++}`;
        values.push(req.query.customer_id);
      }
      if (req.query.status) {
        where += ` AND status = $${idx++}`;
        values.push(req.query.status);
      }

      const countRes = await db.query(`SELECT COUNT(*) FROM installment_plans ${where}`, values);
      const total = parseInt(countRes.rows[0].count);

      const result = await db.query(
        `SELECT * FROM installment_plans ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        [...values, limit, offset]
      );

      res.json({ data: result.rows, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/financial/carne/:id — detalhes do carnê com parcelas
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const plan = await db.query(
        'SELECT * FROM installment_plans WHERE id = $1 AND tenant_id = $2',
        [req.params.id, tenantId]
      );
      if (plan.rows.length === 0) return res.status(404).json({ error: 'Carnê não encontrado' });

      const invoices = await db.query(
        'SELECT * FROM invoices WHERE external_reference = $1 AND tenant_id = $2 ORDER BY due_date',
        [req.params.id, tenantId]
      );

      res.json({ ...plan.rows[0], invoices: invoices.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}