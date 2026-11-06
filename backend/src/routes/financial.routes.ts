// ============================================================
// V5 Fibra - Financial Routes (SPC, NFCom, Dashboard, Fluxo, Contas)
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function financialRoutes(db: Pool) {
  const router = Router();

  // ==================== SPC / SERASA ====================

  router.get('/spc-serasa', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as string;

      let where = 'WHERE tenant_id = $1';
      const values: any[] = [tenantId];
      let idx = 2;

      if (search) {
        where += ` AND (customer_name ILIKE $${idx} OR customer_document ILIKE $${idx})`;
        values.push(`%${search}%`);
        idx++;
      }
      if (status) {
        where += ` AND status = $${idx}`;
        values.push(status);
        idx++;
      }

      const countRes = await db.query(`SELECT COUNT(*) FROM credit_bureau_entries ${where}`, values);
      const total = parseInt(countRes.rows[0].count);

      const result = await db.query(
        `SELECT * FROM credit_bureau_entries ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        [...values, limit, offset]
      );

      const statsRes = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'NEGATIVATED') as total_negativated,
          COUNT(*) FILTER (WHERE status = 'PENDING') as total_pending,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('PENDING','NEGATIVATED')), 0) as total_amount
         FROM credit_bureau_entries WHERE tenant_id = $1`,
        [tenantId]
      );

      res.json({
        data: result.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        stats: statsRes.rows[0],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/spc-serasa/include', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { customer_id, customer_name, customer_document, amount, invoice_id, due_date } = req.body;

      const result = await db.query(
        `INSERT INTO credit_bureau_entries (tenant_id, customer_id, customer_name, customer_document, amount, invoice_id, due_date, status, days_overdue)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING', EXTRACT(DAY FROM NOW() - $7::date)::int) RETURNING *`,
        [tenantId, customer_id, customer_name, customer_document, amount, invoice_id, due_date]
      );

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/negativation/:id/send', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      await db.query(
        `UPDATE credit_bureau_entries SET status = 'NEGATIVATED', sent_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, tenantId]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/negativation/:id/remove', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      await db.query(
        `UPDATE credit_bureau_entries SET status = 'REMOVED', removed_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, tenantId]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== NFCOM ====================

  router.get('/nfcom', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const countRes = await db.query('SELECT COUNT(*) FROM fiscal_notes WHERE tenant_id = $1', [tenantId]);
      const total = parseInt(countRes.rows[0].count);

      const result = await db.query(
        'SELECT * FROM fiscal_notes WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [tenantId, limit, offset]
      );

      res.json({ data: result.rows, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/nfcom', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { invoice_id, series } = req.body;

      const nextNumber = await db.query('SELECT fn_next_nf_number($1) as num', [tenantId]);

      const result = await db.query(
        `INSERT INTO fiscal_notes (tenant_id, invoice_id, number, series, status)
         VALUES ($1, $2, $3, $4, 'DRAFT') RETURNING *`,
        [tenantId, invoice_id, nextNumber.rows[0].num, series || '1']
      );

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== DASHBOARD ====================

  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const summary = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
          COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue_count,
          COUNT(*) FILTER (WHERE status IN ('CONFIRMED','RECEIVED')) as paid_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) as pending_amount,
          COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0) as overdue_amount,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('CONFIRMED','RECEIVED')), 0) as paid_amount,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('CONFIRMED','RECEIVED') AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as month_revenue
         FROM invoices WHERE tenant_id = $1`,
        [tenantId]
      );

      const recent = await db.query(
        `SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [tenantId]
      );

      res.json({ summary: summary.rows[0], recentInvoices: recent.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/dashboard/monthly', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const result = await db.query(
        `SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
          COUNT(*) as total_invoices,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('CONFIRMED','RECEIVED')), 0) as paid_amount,
          COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0) as overdue_amount
         FROM invoices WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', created_at) ORDER BY month`,
        [tenantId]
      );

      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== FLUXO DE CAIXA ====================

  router.get('/fluxo-caixa', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const startDate = req.query.start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const endDate = req.query.end_date || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

      const income = await db.query(
        `SELECT DATE(due_date) as date, SUM(amount) as total
         FROM invoices WHERE tenant_id = $1 AND status IN ('CONFIRMED','RECEIVED','PENDING')
         AND due_date BETWEEN $2 AND $3
         GROUP BY DATE(due_date) ORDER BY date`,
        [tenantId, startDate, endDate]
      );

      const expenses = await db.query(
        `SELECT DATE(due_date) as date, SUM(amount) as total
         FROM accounts_payable WHERE tenant_id = $1 AND status IN ('PAID','PENDING')
         AND due_date BETWEEN $2 AND $3
         GROUP BY DATE(due_date) ORDER BY date`,
        [tenantId, startDate, endDate]
      );

      res.json({ income: income.rows, expenses: expenses.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== CONTAS A PAGAR ====================

  router.get('/contas-pagar', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      let where = 'WHERE tenant_id = $1';
      const values: any[] = [tenantId];
      let idx = 2;

      if (req.query.status) { where += ` AND status = $${idx++}`; values.push(req.query.status); }
      if (req.query.category) { where += ` AND category = $${idx++}`; values.push(req.query.category); }

      const countRes = await db.query(`SELECT COUNT(*) FROM accounts_payable ${where}`, values);
      const total = parseInt(countRes.rows[0].count);

      const result = await db.query(
        `SELECT * FROM accounts_payable ${where} ORDER BY due_date ASC LIMIT $${idx++} OFFSET $${idx}`,
        [...values, limit, offset]
      );

      res.json({ data: result.rows, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/contas-pagar', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { description, amount, due_date, category, supplier, recurrence, notes } = req.body;

      const result = await db.query(
        `INSERT INTO accounts_payable (tenant_id, description, amount, due_date, category, supplier, recurrence, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING') RETURNING *`,
        [tenantId, description, amount, due_date, category || 'OUTROS', supplier, recurrence || 'NONE', notes]
      );

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/contas-pagar/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { description, amount, due_date, category, supplier, recurrence, notes } = req.body;

      await db.query(
        `UPDATE accounts_payable SET description=$3, amount=$4, due_date=$5, category=$6, supplier=$7, recurrence=$8, notes=$9, updated_at=NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, tenantId, description, amount, due_date, category, supplier, recurrence, notes]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/contas-pagar/:id/pay', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      await db.query(
        `UPDATE accounts_payable SET status = 'PAID', paid_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [req.params.id, tenantId]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/contas-pagar/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      await db.query(
        'UPDATE accounts_payable SET status = $1 WHERE id = $2 AND tenant_id = $3',
        ['CANCELED', req.params.id, tenantId]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings (negativação, auto-billing)
  router.get('/settings/:type', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });
      res.json({ auto_enabled: false, auto_days: 30 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/settings/:type', async (req: Request, res: Response) => {
    try {
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}