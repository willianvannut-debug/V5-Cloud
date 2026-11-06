// ============================================================
// V5 Fibra - Webhook Routes (recebe notificações do Asaas)
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { WebhookHandler } from '../handlers/webhook.handler';

export function webhookRoutes(db: Pool) {
  const router = Router();
  const handler = new WebhookHandler(db);

  // Asaas envia POST para esta rota quando um pagamento muda de status
  router.post('/asaas', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;

      // Se não vier tenant_id no header, tenta extrair do path ou query
      const tenant = tenantId || req.query.tenant as string;

      if (!tenant) {
        // Loga mesmo sem tenant para debug
        console.warn('[Webhook] Recebido sem tenant_id:', JSON.stringify(req.body).substring(0, 200));
        return res.status(200).json({ received: true, warning: 'no tenant' });
      }

      await handler.handleAsaasWebhook(tenant, req.body);

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[Webhook] Erro:', err.message);
      // Sempre retorna 200 para o Asaas não reenviar infinitamente
      res.status(200).json({ received: true, error: err.message });
    }
  });

  // Rota alternativa: /webhook/asaas/:tenantId (mais fácil configurar no Asaas)
  router.post('/asaas/:tenantId', async (req: Request, res: Response) => {
    try {
      const tenantId = req.params.tenantId;

      await handler.handleAsaasWebhook(tenantId, req.body);

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[Webhook] Erro:', err.message);
      res.status(200).json({ received: true, error: err.message });
    }
  });

  // Lista os logs de webhook (para debug no painel)
  router.get('/logs', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const result = await db.query(
        'SELECT * FROM webhook_logs WHERE tenant_id = $1 ORDER BY received_at DESC LIMIT $2 OFFSET $3',
        [tenantId, limit, offset]
      );

      const countRes = await db.query(
        'SELECT COUNT(*) FROM webhook_logs WHERE tenant_id = $1',
        [tenantId]
      );

      res.json({
        data: result.rows,
        total: parseInt(countRes.rows[0].count),
        page,
        totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}