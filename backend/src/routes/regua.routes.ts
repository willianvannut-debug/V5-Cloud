// ============================================================
// V5 Fibra - Régua de Cobrança Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function reguaRoutes(db: Pool) {
  const router = Router();

  // GET /api/financial/regua — carregar régua + steps
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      // Busca régua do tenant
      let ruleResult = await db.query(
        'SELECT * FROM billing_rules WHERE tenant_id = $1 ORDER BY created_at LIMIT 1',
        [tenantId]
      );

      // Se não existe, cria uma régua padrão com steps
      if (ruleResult.rows.length === 0) {
        const newRule = await db.query(
          'INSERT INTO billing_rules (tenant_id, name, enabled) VALUES ($1, $2, true) RETURNING *',
          [tenantId, 'Régua Padrão']
        );
        const ruleId = newRule.rows[0].id;

        // Insere steps padrão
        const defaultSteps = [
          { step_type: 'before', days_offset: 5, channel: 'whatsapp', message: 'Olá {nome}! Sua fatura de R${valor} vence em {dias} dias. Pague pelo link: {link}', sort_order: 1 },
          { step_type: 'before', days_offset: 1, channel: 'whatsapp', message: 'Olá {nome}! Sua fatura de R${valor} vence amanhã. Evite juros, pague agora: {link}', sort_order: 2 },
          { step_type: 'after',  days_offset: 1, channel: 'whatsapp', message: 'Olá {nome}, sua fatura de R${valor} venceu ontem. Pague agora e evite multa: {link}', sort_order: 3 },
          { step_type: 'after',  days_offset: 7, channel: 'email',    message: 'Prezado(a) {nome}, identificamos que sua fatura de R${valor} está em atraso há {dias} dias. Regularize pelo link: {link}', sort_order: 4 },
          { step_type: 'after',  days_offset: 15, channel: 'whatsapp', message: '{nome}, sua fatura está em atraso há {dias} dias. Regularize para evitar suspensão do serviço: {link}', sort_order: 5 },
          { step_type: 'after',  days_offset: 30, channel: 'email',    message: 'AVISO: {nome}, sua conexão será suspensa em 48h por inadimplência. Valor: R${valor}. Regularize: {link}', sort_order: 6 },
        ];

        for (const step of defaultSteps) {
          await db.query(
            `INSERT INTO billing_rule_steps (rule_id, tenant_id, step_type, days_offset, channel, message, enabled, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
            [ruleId, tenantId, step.step_type, step.days_offset, step.channel, step.message, step.sort_order]
          );
        }

        ruleResult = await db.query('SELECT * FROM billing_rules WHERE id = $1', [ruleId]);
      }

      const rule = ruleResult.rows[0];

      // Busca os steps
      const stepsResult = await db.query(
        'SELECT * FROM billing_rule_steps WHERE rule_id = $1 ORDER BY sort_order ASC',
        [rule.id]
      );

      res.json({
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        steps: stepsResult.rows.map((s: any) => ({
          id: s.id,
          step_type: s.step_type,
          days_offset: s.days_offset,
          channel: s.channel,
          message: s.message,
          enabled: s.enabled,
          sort_order: s.sort_order,
        })),
      });
    } catch (err: any) {
      console.error('Erro GET /regua:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/financial/regua — atualizar régua (enabled/name)
  router.put('/', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { name, enabled } = req.body;
      await db.query(
        'UPDATE billing_rules SET name = $2, enabled = $3, updated_at = NOW() WHERE tenant_id = $1',
        [tenantId, name, enabled]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/financial/regua/steps — adicionar step
  router.post('/steps', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { step_type, days_offset, channel, message } = req.body;

      // Pega o rule_id do tenant
      const ruleResult = await db.query(
        'SELECT id FROM billing_rules WHERE tenant_id = $1 LIMIT 1',
        [tenantId]
      );
      if (ruleResult.rows.length === 0) return res.status(404).json({ error: 'Régua não encontrada' });

      const ruleId = ruleResult.rows[0].id;

      // Pega o maior sort_order
      const maxOrder = await db.query(
        'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM billing_rule_steps WHERE rule_id = $1',
        [ruleId]
      );

      const result = await db.query(
        `INSERT INTO billing_rule_steps (rule_id, tenant_id, step_type, days_offset, channel, message, enabled, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING *`,
        [ruleId, tenantId, step_type, days_offset, channel, message, (maxOrder.rows[0].max_order || 0) + 1]
      );

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/financial/regua/steps/:id — atualizar step
  router.put('/steps/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { id } = req.params;
      const { step_type, days_offset, channel, message, enabled } = req.body;

      await db.query(
        `UPDATE billing_rule_steps SET step_type = $2, days_offset = $3, channel = $4, message = $5, enabled = $6, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $7`,
        [id, step_type, days_offset, channel, message, enabled, tenantId]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/financial/regua/steps/:id — remover step
  router.delete('/steps/:id', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const { id } = req.params;
      await db.query(
        'DELETE FROM billing_rule_steps WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}