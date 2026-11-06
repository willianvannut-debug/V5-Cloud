// ============================================================
// V5 Fibra - Settings Routes (Juros, Multa, Desconto)
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function settingsRoutes(db: Pool) {
  const router = Router();

  // GET /api/financial/settings/fine-interest — carregar config
  router.get('/fine-interest', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      // Verifica se já existe config para este tenant
      const result = await db.query(
        'SELECT * FROM financial_settings WHERE tenant_id = $1',
        [tenantId]
      );

      if (result.rows.length === 0) {
        // Retorna valores padrão
        return res.json({
          data: {
            fine_enabled: true,
            fine_type: 'PERCENTAGE',
            fine_value: 2,
            interest_enabled: true,
            interest_type: 'MONTHLY',
            interest_value: 1,
            discount_enabled: false,
            discount_type: 'PERCENTAGE',
            discount_value: 5,
            discount_days_before: 5,
          }
        });
      }

      const row = result.rows[0];
      res.json({
        data: {
          fine_enabled: row.fine_enabled,
          fine_type: row.fine_type,
          fine_value: parseFloat(row.fine_value),
          interest_enabled: row.interest_enabled,
          interest_type: row.interest_type,
          interest_value: parseFloat(row.interest_value),
          discount_enabled: row.discount_enabled,
          discount_type: row.discount_type,
          discount_value: parseFloat(row.discount_value),
          discount_days_before: row.discount_days_before,
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/financial/settings/fine-interest — salvar config
  router.put('/fine-interest', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const {
        fine_enabled,
        fine_type,
        fine_value,
        interest_enabled,
        interest_type,
        interest_value,
        discount_enabled,
        discount_type,
        discount_value,
        discount_days_before,
      } = req.body;

      // Upsert: insere ou atualiza
      const existing = await db.query(
        'SELECT id FROM financial_settings WHERE tenant_id = $1',
        [tenantId]
      );

      if (existing.rows.length === 0) {
        await db.query(
          `INSERT INTO financial_settings
           (tenant_id, fine_enabled, fine_type, fine_value, interest_enabled, interest_type, interest_value, discount_enabled, discount_type, discount_value, discount_days_before, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [tenantId, fine_enabled, fine_type, fine_value, interest_enabled, interest_type, interest_value, discount_enabled, discount_type, discount_value, discount_days_before]
        );
      } else {
        await db.query(
          `UPDATE financial_settings SET
           fine_enabled = $2, fine_type = $3, fine_value = $4,
           interest_enabled = $5, interest_type = $6, interest_value = $7,
           discount_enabled = $8, discount_type = $9, discount_value = $10,
           discount_days_before = $11, updated_at = NOW()
           WHERE tenant_id = $1`,
          [tenantId, fine_enabled, fine_type, fine_value, interest_enabled, interest_type, interest_value, discount_enabled, discount_type, discount_value, discount_days_before]
        );
      }

      res.json({ success: true, message: 'Configurações salvas com sucesso' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}