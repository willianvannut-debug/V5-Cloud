// ============================================================
// V5 Fibra - Webhook Handler (processa eventos do Asaas)
// ============================================================

import { Pool } from 'pg';

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    status: string;
    billingType: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    dueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installment?: string;
  };
}

export class WebhookHandler {
  constructor(private db: Pool) {}

  async handleAsaasWebhook(tenantId: string, payload: AsaasWebhookPayload): Promise<void> {
    const { event, payment } = payload;

    // 1. Logar o webhook
    await this.db.query(
      `INSERT INTO webhook_logs (tenant_id, provider, event_type, payload, processed)
       VALUES ($1, 'ASAAS', $2, $3, false)`,
      [tenantId, event, JSON.stringify(payload)]
    );

    if (!payment) return;

    // 2. Encontrar a fatura pelo asaas_charge_id
    const invoiceRes = await this.db.query(
      'SELECT * FROM invoices WHERE asaas_charge_id = $1 AND tenant_id = $2',
      [payment.id, tenantId]
    );

    const invoice = invoiceRes.rows[0];
    if (!invoice) {
      console.warn(`[Webhook] Fatura não encontrada para charge ${payment.id}`);
      return;
    }

    const statusBefore = invoice.status;
    let statusAfter = statusBefore;

    // 3. Processar por tipo de evento
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        statusAfter = 'CONFIRMED';
        await this.db.query(
          `UPDATE invoices SET status = 'CONFIRMED', paid_at = NOW(), net_amount = $3, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2`,
          [invoice.id, tenantId, payment.netValue]
        );
        // TODO: Desbloquear cliente no MikroTik
        break;

      case 'PAYMENT_OVERDUE':
        statusAfter = 'OVERDUE';
        await this.db.query(
          `UPDATE invoices SET status = 'OVERDUE', updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2`,
          [invoice.id, tenantId]
        );
        break;

      case 'PAYMENT_REFUNDED':
        statusAfter = 'REFUNDED';
        await this.db.query(
          `UPDATE invoices SET status = 'REFUNDED', refunded_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2`,
          [invoice.id, tenantId]
        );
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_CANCELED':
        statusAfter = 'CANCELED';
        await this.db.query(
          `UPDATE invoices SET status = 'CANCELED', canceled_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2`,
          [invoice.id, tenantId]
        );
        break;

      default:
        console.log(`[Webhook] Evento não tratado: ${event}`);
        break;
    }

    // 4. Registrar evento de pagamento
    await this.db.query(
      `INSERT INTO payment_events (tenant_id, invoice_id, event_type, status_before, status_after, amount, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, invoice.id, event, statusBefore, statusAfter, payment.value, JSON.stringify(payment)]
    );

    // 5. Marcar webhook como processado
    await this.db.query(
      `UPDATE webhook_logs SET processed = true WHERE tenant_id = $1 AND event_type = $2 AND processed = false
       ORDER BY received_at DESC LIMIT 1`,
      [tenantId, event]
    );
  }
}