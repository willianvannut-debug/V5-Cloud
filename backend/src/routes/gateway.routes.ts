// ============================================================
// V5 Fibra - Gateway Routes (Configuração Wide Pay)
// CRUD para gateway_configs - salva credenciais da carteira
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function gatewayRoutes(db: Pool): Router {
  const router = Router();

  // ============================================================
  // GET /api/financial/gateway - Buscar config atual do gateway
  // ============================================================
  router.get('/', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const result = await db.query(
        `SELECT id, tenant_id, provider, wallet_id, wallet_token, environment,
                webhook_url, webhook_token,
                fine_percentage, interest_monthly_pct,
                discount_days_before, discount_percentage, discount_type,
                allow_boleto, allow_pix,
                enabled, created_at, updated_at
         FROM gateway_configs
         WHERE tenant_id = $1
         ORDER BY created_at ASC LIMIT 1`,
        [empresaId]
      );

      if (result.rows.length === 0) {
        return res.json({ configured: false, data: null });
      }

      const config = result.rows[0];
      // Mascarar o token parcialmente para segurança
      const maskedToken = config.wallet_token
        ? config.wallet_token.substring(0, 6) + '****' + config.wallet_token.substring(config.wallet_token.length - 4)
        : '';

      res.json({
        configured: true,
        data: {
          ...config,
          wallet_token_masked: maskedToken,
          // Não retornar o token completo no GET por segurança
          // O frontend só precisa saber que existe
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST /api/financial/gateway - Salvar/atualizar config
  // ============================================================
  router.post('/', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const {
        wallet_id,
        wallet_token,
        environment = 'production',
        webhook_url,
        webhook_token,
        fine_percentage = 0,
        interest_monthly_pct = 0,
        discount_days_before = 0,
        discount_percentage = 0,
        discount_type = 'FIXED',
        allow_boleto = true,
        allow_pix = true,
      } = req.body;

      if (!wallet_id) {
        return res.status(400).json({ error: 'ID da Carteira é obrigatório' });
      }

      // Verificar se já existe config para esta empresa
      const existing = await db.query(
        'SELECT id, wallet_token FROM gateway_configs WHERE tenant_id = $1',
        [empresaId]
      );

      let result;
      if (existing.rows.length > 0) {
        // UPDATE - se não enviou novo token, manter o existente
        const finalToken = wallet_token || existing.rows[0].wallet_token;
        if (!finalToken) {
          return res.status(400).json({ error: 'Token da Carteira é obrigatório' });
        }

        result = await db.query(`
          UPDATE gateway_configs SET
            wallet_id = $1,
            wallet_token = $2,
            environment = $3,
            webhook_url = $4,
            webhook_token = $5,
            fine_percentage = $6,
            interest_monthly_pct = $7,
            discount_days_before = $8,
            discount_percentage = $9,
            discount_type = $10,
            allow_boleto = $11,
            allow_pix = $12,
            enabled = true,
            provider = 'widepay',
            updated_at = NOW()
          WHERE tenant_id = $13
          RETURNING *
        `, [
          wallet_id, finalToken, environment,
          webhook_url || null, webhook_token || null,
          fine_percentage, interest_monthly_pct,
          discount_days_before, discount_percentage, discount_type,
          allow_boleto, allow_pix, empresaId
        ]);
      } else {
        // INSERT - primeira vez, token obrigatório
        if (!wallet_token) {
          return res.status(400).json({ error: 'Token da Carteira é obrigatório na primeira configuração' });
        }
        result = await db.query(`
          INSERT INTO gateway_configs (
            tenant_id, provider, wallet_id, wallet_token, environment,
            webhook_url, webhook_token,
            fine_percentage, interest_monthly_pct,
            discount_days_before, discount_percentage, discount_type,
            allow_boleto, allow_pix, enabled
          ) VALUES ($1, 'widepay', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
          RETURNING *
        `, [
          empresaId, wallet_id, wallet_token, environment,
          webhook_url || null, webhook_token || null,
          fine_percentage, interest_monthly_pct,
          discount_days_before, discount_percentage, discount_type,
          allow_boleto, allow_pix
        ]);
      }

      res.json({
        success: true,
        message: 'Gateway configurado com sucesso!',
        data: result.rows[0],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST /api/financial/gateway/test - Testar conexão com WidePay
  // ============================================================
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      // Pode receber wallet_id/token do body (formulário) ou buscar do banco
      let walletId = req.body.wallet_id;
      let walletToken = req.body.wallet_token;

      if (!walletId || !walletToken) {
        // Buscar do banco
        const configRes = await db.query(
          'SELECT wallet_id, wallet_token FROM gateway_configs WHERE tenant_id = $1 AND enabled = true LIMIT 1',
          [empresaId]
        );
        if (configRes.rows.length === 0) {
          return res.status(400).json({ error: 'Gateway não configurado. Salve as credenciais primeiro.' });
        }
        walletId = configRes.rows[0].wallet_id;
        walletToken = configRes.rows[0].wallet_token;
      }

      const auth = Buffer.from(`${walletId}:${walletToken}`).toString('base64');

      // Fazer uma consulta simples para testar as credenciais
      // WidePay: consultar dados da carteira
      const testRes = await fetch('https://api.widepay.com/v1/recebimentos/cobrancas/consultar', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'id=1', // Consultar qualquer ID só para testar a auth
      });

      const testData: any = await testRes.json();

      // Se retornou algo (mesmo que não encontre a cobrança), a auth está OK
      // WidePay retorna 401 se as credenciais estiverem erradas
      if (testRes.status === 401 || (testData.erro && testData.erro.toLowerCase().includes('credenciais'))) {
        return res.json({
          success: false,
          message: 'Credenciais inválidas. Verifique o ID e Token da carteira.',
        });
      }

      // Se não deu 401, as credenciais estão OK
      res.json({
        success: true,
        message: 'Conexão com Wide Pay estabelecida com sucesso!',
        walletId,
      });
    } catch (err: any) {
      // Se deu erro de rede, provavelmente não conseguiu acessar a API
      res.json({
        success: false,
        message: 'Erro ao conectar com Wide Pay: ' + (err.message || 'Verifique sua conexão'),
      });
    }
  });

  // ============================================================
  // DELETE /api/financial/gateway - Desativar gateway
  // ============================================================
  router.delete('/', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      await db.query(
        'UPDATE gateway_configs SET enabled = false, updated_at = NOW() WHERE tenant_id = $1',
        [empresaId]
      );

      res.json({ success: true, message: 'Gateway desativado' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}