// ============================================================
// V5 Fibra - Billing Routes (Cobrança Automática)
// backend/src/routes/billing.routes.ts
// Apenas WidePay | empresa_id | tabelas em português
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function billingRoutes(db: Pool): Router {
  const router = Router();

  // ============================================================
  // GET /api/financial/billing/contratos — listar contratos
  // ============================================================
  router.get('/contratos', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      let where = 'WHERE c.empresa_id = $1';
      const values: any[] = [empresaId];
      let idx = 2;

      // Filtro por status
      if (req.query.status && req.query.status !== 'all') {
        where += ` AND c.status = $${idx++}`;
        values.push(req.query.status);
      }

      // Filtro por busca (nome ou documento)
      if (req.query.search) {
        where += ` AND (c.customer_name ILIKE $${idx} OR c.customer_document ILIKE $${idx})`;
        values.push(`%${req.query.search}%`);
        idx++;
      }

      // Filtro por tipo de cobrança
      if (req.query.billing_type) {
        where += ` AND c.billing_type = $${idx++}`;
        values.push(req.query.billing_type);
      }

      // Contar total
      const countRes = await db.query(
        `SELECT COUNT(*) FROM contratos c ${where}`,
        values
      );
      const total = parseInt(countRes.rows[0].count);

      // Buscar contratos
      const result = await db.query(
        `SELECT c.* FROM contratos c ${where} ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        [...values, limit, offset]
      );

      // Resumo
      const summaryRes = await db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as total_monthly
        FROM contratos WHERE empresa_id = $1`,
        [empresaId]
      );

      const summary = summaryRes.rows[0];

      res.json({
        data: result.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        summary: {
          active: parseInt(summary.active_count) || 0,
          suspended: parseInt(summary.suspended_count) || 0,
          cancelled: parseInt(summary.cancelled_count) || 0,
          totalMonthly: parseFloat(summary.total_monthly) || 0,
        },
      });
    } catch (err: any) {
      console.error('Erro ao listar contratos:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST /api/financial/billing/contratos — criar contrato
  // ============================================================
  router.post('/contratos', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const {
        customer_name,
        customer_document,
        customer_email,
        customer_phone,
        plan_name,
        amount,
        billing_day,
        billing_type,
        gateway_id,
      } = req.body;

      // Validações
      if (!customer_name || !customer_document || !amount || !billing_day) {
        return res.status(400).json({
          error: 'Campos obrigatórios: customer_name, customer_document, amount, billing_day',
        });
      }

      // Calcular próxima data de cobrança
      const today = new Date();
      let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), billing_day);

      if (nextBillingDate <= today) {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      const nextBillingStr = nextBillingDate.toISOString().split('T')[0];

      // Buscar gateway padrão se não informado
      let finalGatewayId = gateway_id;

      if (!finalGatewayId) {
        const gwRes = await db.query(
          `SELECT id FROM gateway_configs WHERE tenant_id = $1 AND enabled = true ORDER BY created_at ASC LIMIT 1`,
          [empresaId]
        );
        if (gwRes.rows.length > 0) {
          finalGatewayId = gwRes.rows[0].id;
        }
      }

      const result = await db.query(
        `INSERT INTO contratos (
          empresa_id, customer_name, customer_document, customer_email, customer_phone,
          plan_name, amount, billing_day, billing_type, gateway_id, provider,
          status, start_date, next_billing_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'widepay', 'active', CURRENT_DATE, $11)
        RETURNING *`,
        [
          empresaId, customer_name, customer_document, customer_email || null,
          customer_phone || null, plan_name || 'Internet', amount, billing_day,
          billing_type || 'BOLETO', finalGatewayId || null, nextBillingStr,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error('Erro ao criar contrato:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // PUT /api/financial/billing/contratos/:id — atualizar contrato
  // ============================================================
  router.put('/contratos/:id', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const { id } = req.params;
      const {
        customer_name, customer_document, customer_email, customer_phone,
        plan_name, amount, billing_day, billing_type, gateway_id, status,
      } = req.body;

      // Verificar se existe
      const existing = await db.query(
        'SELECT * FROM contratos WHERE id = $1 AND empresa_id = $2',
        [id, empresaId]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Contrato não encontrado' });
      }

      const result = await db.query(
        `UPDATE contratos SET
          customer_name = COALESCE($3, customer_name),
          customer_document = COALESCE($4, customer_document),
          customer_email = COALESCE($5, customer_email),
          customer_phone = COALESCE($6, customer_phone),
          plan_name = COALESCE($7, plan_name),
          amount = COALESCE($8, amount),
          billing_day = COALESCE($9, billing_day),
          billing_type = COALESCE($10, billing_type),
          gateway_id = COALESCE($11, gateway_id),
          status = COALESCE($12, status),
          updated_at = NOW()
        WHERE id = $1 AND empresa_id = $2
        RETURNING *`,
        [
          id, empresaId, customer_name, customer_document, customer_email,
          customer_phone, plan_name, amount, billing_day, billing_type,
          gateway_id, status,
        ]
      );

      res.json(result.rows[0]);
    } catch (err: any) {
      console.error('Erro ao atualizar contrato:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST /api/financial/billing/contratos/:id/suspend — suspender
  // ============================================================
  router.post('/contratos/:id/suspend', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const result = await db.query(
        `UPDATE contratos SET status = 'suspended', updated_at = NOW()
         WHERE id = $1 AND empresa_id = $2 AND status = 'active'
         RETURNING *`,
        [req.params.id, empresaId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Contrato não encontrado ou já suspenso' });
      }

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST /api/financial/billing/contratos/:id/activate — reativar
  // ============================================================
  router.post('/contratos/:id/activate', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const contract = await db.query(
        'SELECT billing_day FROM contratos WHERE id = $1 AND empresa_id = $2',
        [req.params.id, empresaId]
      );
      if (contract.rows.length === 0) {
        return res.status(404).json({ error: 'Contrato não encontrado' });
      }

      const billingDay = contract.rows[0].billing_day;
      const today = new Date();
      let nextDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
      if (nextDate <= today) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const result = await db.query(
        `UPDATE contratos SET status = 'active', next_billing_date = $3, updated_at = NOW()
         WHERE id = $1 AND empresa_id = $2 AND status IN ('suspended', 'cancelled')
         RETURNING *`,
        [req.params.id, empresaId, nextDate.toISOString().split('T')[0]]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Contrato não encontrado ou já ativo' });
      }

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST /api/financial/billing/contratos/:id/cancel — cancelar
  // ============================================================
  router.post('/contratos/:id/cancel', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const result = await db.query(
        `UPDATE contratos SET status = 'cancelled', end_date = CURRENT_DATE, updated_at = NOW()
         WHERE id = $1 AND empresa_id = $2 AND status != 'cancelled'
         RETURNING *`,
        [req.params.id, empresaId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Contrato não encontrado ou já cancelado' });
      }

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST /api/financial/billing/run — executar cobrança manual
  // ============================================================
  router.post('/run', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const todayStr = today.toISOString().split('T')[0];

      // Criar registro do billing run
      const runRes = await db.query(
        `INSERT INTO billing_runs (empresa_id, run_date, status, started_at)
         VALUES ($1, $2, 'running', NOW()) RETURNING id`,
        [empresaId, todayStr]
      );
      const runId = runRes.rows[0].id;

      // Buscar contratos ativos que precisam de cobrança
      // gateway_configs ainda usa tenant_id
      const contratosRes = await db.query(
        `SELECT c.*, gc.wallet_id, gc.wallet_token
         FROM contratos c
         LEFT JOIN gateway_configs gc ON gc.id = c.gateway_id
         WHERE c.empresa_id = $1
           AND c.status = 'active'
           AND c.billing_day = $2
           AND (
             c.last_billing_date IS NULL
             OR c.last_billing_date < $3
           )`,
        [empresaId, currentDay, `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`]
      );

      const contratos = contratosRes.rows;
      let generated = 0;
      let failed = 0;
      const details: any[] = [];

      // Nomes dos meses para referência
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

      for (const contract of contratos) {
        try {
          const dueDate = new Date(currentYear, currentMonth, contract.billing_day);
          const dueDateStr = dueDate.toISOString().split('T')[0];

          // Gerar fatura via WidePay
          const invoiceData = await generateWidepayInvoice(contract, dueDateStr);

          if (invoiceData) {
            // Gerar identificador, mês referência e método
            const identificador = `FAT-AUTO-${Date.now()}-${contract.id}`;
            const mesRef = `${meses[currentMonth]}/${currentYear}`;
            const metodoMap: Record<string, string> = { 'BOLETO': 'boleto', 'PIX': 'pix', 'BOLETO_PIX': 'boleto_pix' };
            const metodo = metodoMap[contract.billing_type] || 'boleto';

            // Salvar fatura no banco — incluindo TODAS as colunas NOT NULL
            await db.query(
              `INSERT INTO faturas (
                empresa_id, cliente_id, identificador, gateway_id, provider,
                customer_name, customer_document, customer_email, customer_phone,
                amount, billing_type, due_date, status, description,
                external_reference, boleto_url, boleto_barcode,
                pix_qr_code, pix_copy_paste, invoice_url,
                mes, data, plano, valor, metodo, data_vencimento
              ) VALUES (
                $1, NULL, $2, $3, 'widepay',
                $4, $5, $6, $7,
                $8, $9, $10, $11, $12,
                $13, $14, $15,
                $16, $17, $18,
                $19, CURRENT_DATE, $20, $21, $22, $23
              )`,
              [
                empresaId, identificador, contract.gateway_id,
                contract.customer_name, contract.customer_document,
                contract.customer_email, contract.customer_phone,
                contract.amount, contract.billing_type, dueDateStr,
                invoiceData.status || 'PENDING',
                `Cobrança automática - ${contract.plan_name}`,
                contract.id,
                invoiceData.boleto_url || null,
                invoiceData.boleto_barcode || null,
                invoiceData.pix_qr_code || null,
                invoiceData.pix_copy_paste || null,
                invoiceData.invoice_url || null,
                mesRef,
                contract.plan_name || 'Internet',
                contract.amount,
                metodo,
                dueDateStr,
              ]
            );

            // Atualizar contrato
            const nextMonth = new Date(currentYear, currentMonth + 1, contract.billing_day);
            await db.query(
              `UPDATE contratos SET
                last_billing_date = $2,
                next_billing_date = $3,
                updated_at = NOW()
              WHERE id = $1`,
              [contract.id, todayStr, nextMonth.toISOString().split('T')[0]]
            );

            generated++;
            details.push({
              contract_id: contract.id,
              customer: contract.customer_name,
              amount: contract.amount,
              status: 'success',
            });
          }
        } catch (invoiceErr: any) {
          failed++;
          details.push({
            contract_id: contract.id,
            customer: contract.customer_name,
            amount: contract.amount,
            status: 'error',
            error: invoiceErr.message,
          });
        }
      }

      // Atualizar billing run
      await db.query(
        `UPDATE billing_runs SET
          contratos_checked = $2,
          faturas_generated = $3,
          faturas_failed = $4,
          status = 'completed',
          details = $5,
          finished_at = NOW()
        WHERE id = $1`,
        [runId, contratos.length, generated, failed, JSON.stringify(details)]
      );

      res.json({
        run_id: runId,
        contratos_checked: contratos.length,
        faturas_generated: generated,
        faturas_failed: failed,
        details,
      });
    } catch (err: any) {
      console.error('Erro ao executar cobrança:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // GET /api/financial/billing/runs — histórico de execuções
  // ============================================================
  router.get('/runs', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const limit = parseInt(req.query.limit as string) || 20;

      const result = await db.query(
        `SELECT * FROM billing_runs WHERE empresa_id = $1 ORDER BY started_at DESC LIMIT $2`,
        [empresaId, limit]
      );

      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // Função auxiliar - Gerar fatura na Wide Pay
  // ============================================================
  async function generateWidepayInvoice(contract: any, dueDate: string): Promise<any> {
    const walletId = contract.wallet_id;
    const token = contract.wallet_token;
    if (!walletId || !token) throw new Error('Credenciais Wide Pay não configuradas');

    const auth = Buffer.from(`${walletId}:${token}`).toString('base64');

    // WidePay exige form-encoded, não JSON
    const formParams = new URLSearchParams();
    formParams.append('forma', contract.billing_type === 'PIX' ? 'PIX' : 'Boleto');
    formParams.append('cliente', contract.customer_name);
    formParams.append('pessoa', contract.customer_document.replace(/\D/g, '').length <= 11 ? 'Fisica' : 'Juridica');
    formParams.append('cpf', contract.customer_document.replace(/\D/g, ''));
    formParams.append('itens[0][descricao]', `Cobrança automática - ${contract.plan_name}`);
    formParams.append('itens[0][valor]', parseFloat(contract.amount).toFixed(2));
    formParams.append('vencimento', dueDate);

    if (contract.customer_email) {
      formParams.append('email', contract.customer_email);
    }

    const chargeRes = await fetch('https://api.widepay.com/v1/recebimentos/cobrancas/adicionar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      body: formParams.toString(),
    });

    const chargeData: any = await chargeRes.json();

    if (!chargeData.sucesso) {
      throw new Error(`Erro Wide Pay: ${chargeData.erro || 'Erro desconhecido'}`);
    }

    return {
      status: 'PENDING',
      boleto_url: chargeData.link || null,
      boleto_barcode: chargeData.id || null,
      invoice_url: chargeData.link || null,
      pix_qr_code: null,
      pix_copy_paste: null,
    };
  }

  return router;
}