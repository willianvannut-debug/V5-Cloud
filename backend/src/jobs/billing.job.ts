// ============================================================
// V5 Fibra - Billing Job (Cron de Cobrança Automática)
// backend/src/jobs/billing.job.ts
// ============================================================

import { Pool } from 'pg';

export class BillingJob {
  private db: Pool;
  private interval: NodeJS.Timeout | null = null;

  constructor(db: Pool) {
    this.db = db;
  }

  // Iniciar o job (roda a cada 1 hora, verificando se precisa gerar cobranças)
  start() {
    console.log('[BillingJob] Job de cobrança automática iniciado');

    // Rodar imediatamente na primeira vez
    this.run();

    // Depois rodar a cada 1 hora (3600000 ms)
    this.interval = setInterval(() => {
      this.run();
    }, 3600000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log('[BillingJob] Job de cobrança automática parado');
  }

  async run() {
    const now = new Date();
    const currentHour = now.getHours();

    // Só gera cobranças entre 6h e 8h da manhã (horário do servidor)
    // Isso evita gerar cobranças duplicadas se o servidor reiniciar
    if (currentHour < 6 || currentHour > 8) {
      console.log(`[BillingJob] Fora do horário de execução (${currentHour}h). Próxima verificação em 1h.`);
      return;
    }

    console.log('[BillingJob] Verificando contratos para cobrança...');

    try {
      // Buscar todos os tenants que têm contratos ativos
      const tenantsRes = await this.db.query(
        `SELECT DISTINCT tenant_id FROM contracts WHERE status = 'active'`
      );

      for (const tenant of tenantsRes.rows) {
        await this.runForTenant(tenant.tenant_id);
      }
    } catch (err) {
      console.error('[BillingJob] Erro geral:', err);
    }
  }

  private async runForTenant(tenantId: string) {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0];
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

    // Verificar se já rodou hoje pra esse tenant
    const alreadyRan = await this.db.query(
      `SELECT id FROM billing_runs WHERE tenant_id = $1 AND run_date = $2 AND status = 'completed'`,
      [tenantId, todayStr]
    );

    if (alreadyRan.rows.length > 0) {
      console.log(`[BillingJob] Tenant ${tenantId} já processado hoje.`);
      return;
    }

    // Buscar contratos que vencem hoje e não foram cobrados neste mês
    const contractsRes = await this.db.query(
      `SELECT c.*, gc.api_key_production, gc.api_key_sandbox, gc.wallet_id, gc.api_key
       FROM contracts c
       LEFT JOIN gateway_configs gc ON gc.id = c.gateway_id
       WHERE c.tenant_id = $1
         AND c.status = 'active'
         AND c.billing_day = $2
         AND (c.last_billing_date IS NULL OR c.last_billing_date < $3)`,
      [tenantId, currentDay, monthStart]
    );

    if (contractsRes.rows.length === 0) {
      console.log(`[BillingJob] Tenant ${tenantId}: nenhum contrato para cobrar hoje (dia ${currentDay}).`);
      return;
    }

    console.log(`[BillingJob] Tenant ${tenantId}: ${contractsRes.rows.length} contratos para cobrar.`);

    // Criar registro do run
    const runRes = await this.db.query(
      `INSERT INTO billing_runs (tenant_id, run_date, status, started_at)
       VALUES ($1, $2, 'running', NOW()) RETURNING id`,
      [tenantId, todayStr]
    );
    const runId = runRes.rows[0].id;

    let generated = 0;
    let failed = 0;
    const details: any[] = [];

    for (const contract of contractsRes.rows) {
      try {
        const dueDate = new Date(currentYear, currentMonth, contract.billing_day);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        let invoiceData: any = null;

        if (contract.provider === 'asaas') {
          invoiceData = await this.generateAsaasInvoice(contract, dueDateStr);
        } else if (contract.provider === 'widepay') {
          invoiceData = await this.generateWidepayInvoice(contract, dueDateStr);
        }

        if (invoiceData) {
          await this.db.query(
            `INSERT INTO invoices (
              tenant_id, gateway_id, provider, customer_name, customer_document,
              customer_email, customer_phone, amount, billing_type, due_date,
              status, description, external_reference,
              boleto_url, boleto_barcode, boleto_nosso_numero,
              pix_qr_code, pix_copy_paste, invoice_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [
              tenantId, contract.gateway_id, contract.provider,
              contract.customer_name, contract.customer_document,
              contract.customer_email, contract.customer_phone,
              contract.amount, contract.billing_type, dueDateStr,
              invoiceData.status || 'PENDING',
              `Cobrança automática - ${contract.plan_name}`,
              contract.id,
              invoiceData.boleto_url || null,
              invoiceData.boleto_barcode || null,
              invoiceData.boleto_nosso_numero || null,
              invoiceData.pix_qr_code || null,
              invoiceData.pix_copy_paste || null,
              invoiceData.invoice_url || null,
            ]
          );

          // Atualizar contrato
          const nextMonth = new Date(currentYear, currentMonth + 1, contract.billing_day);
          await this.db.query(
            `UPDATE contracts SET
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

          console.log(`[BillingJob] ✓ Fatura gerada: ${contract.customer_name} - R$ ${contract.amount}`);
        }
      } catch (err: any) {
        failed++;
        details.push({
          contract_id: contract.id,
          customer: contract.customer_name,
          amount: contract.amount,
          status: 'error',
          error: err.message,
        });
        console.error(`[BillingJob] ✗ Erro: ${contract.customer_name} - ${err.message}`);
      }
    }

    // Atualizar billing run
    await this.db.query(
      `UPDATE billing_runs SET
        contracts_checked = $2,
        invoices_generated = $3,
        invoices_failed = $4,
        status = 'completed',
        details = $5,
        finished_at = NOW()
      WHERE id = $1`,
      [runId, contractsRes.rows.length, generated, failed, JSON.stringify(details)]
    );

    console.log(`[BillingJob] Tenant ${tenantId} concluído: ${generated} geradas, ${failed} falharam.`);
  }

  // Gerar fatura Asaas
  private async generateAsaasInvoice(contract: any, dueDate: string): Promise<any> {
    const apiKey = contract.api_key_production || contract.api_key_sandbox;
    if (!apiKey) throw new Error('Chave API Asaas não configurada');

    const baseUrl = contract.api_key_production
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // Buscar ou criar customer
    const searchRes = await fetch(
      `${baseUrl}/customers?cpfCnpj=${contract.customer_document.replace(/\D/g, '')}`,
      { headers: { 'access_token': apiKey } }
    );
    const searchData = await searchRes.json();

    let customerId: string;

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id;
    } else {
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
        body: JSON.stringify({
          name: contract.customer_name,
          cpfCnpj: contract.customer_document.replace(/\D/g, ''),
          email: contract.customer_email || undefined,
          phone: contract.customer_phone?.replace(/\D/g, '') || undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createData.id) throw new Error(`Erro ao criar cliente: ${JSON.stringify(createData)}`);
      customerId = createData.id;
    }

    const chargeRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: contract.billing_type,
        value: parseFloat(contract.amount),
        dueDate,
        description: `Cobrança automática - ${contract.plan_name}`,
      }),
    });

    const chargeData = await chargeRes.json();
    if (chargeData.errors) throw new Error(`Asaas: ${JSON.stringify(chargeData.errors)}`);

    return {
      status: chargeData.status || 'PENDING',
      boleto_url: chargeData.bankSlipUrl || null,
      boleto_barcode: chargeData.nossoNumero || null,
      boleto_nosso_numero: chargeData.nossoNumero || null,
      invoice_url: chargeData.invoiceUrl || null,
    };
  }

  // Gerar fatura Wide Pay
  private async generateWidepayInvoice(contract: any, dueDate: string): Promise<any> {
    const walletId = contract.wallet_id;
    const token = contract.api_key;
    if (!walletId || !token) throw new Error('Credenciais Wide Pay não configuradas');

    const auth = Buffer.from(`${walletId}:${token}`).toString('base64');

    const chargeRes = await fetch('https://api.widepay.com/v1/recebimentos/cobrancas/adicionar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
      body: JSON.stringify({
        forma: contract.billing_type === 'PIX' ? 'PIX' : 'Boleto',
        cliente: contract.customer_name,
        pessoa: contract.customer_document.replace(/\D/g, '').length <= 11 ? 'Fisica' : 'Juridica',
        cpf: contract.customer_document.replace(/\D/g, ''),
        itens: [{
          descricao: `Cobrança automática - ${contract.plan_name}`,
          valor: parseFloat(contract.amount).toFixed(2),
        }],
        vencimento: dueDate,
        email: contract.customer_email || undefined,
      }),
    });

    const chargeData = await chargeRes.json();
    if (!chargeData.sucesso) throw new Error(`Wide Pay: ${chargeData.erro || 'Erro desconhecido'}`);

    return {
      status: 'PENDING',
      boleto_url: chargeData.link || null,
      boleto_barcode: chargeData.id || null,
      invoice_url: chargeData.link || null,
    };
  }
}