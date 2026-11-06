// ============================================================
// V5 Fibra - Invoice Service (Apenas Wide Pay)
// Tabelas: faturas, clientes | Coluna: empresa_id
// ============================================================

import { Pool } from 'pg';

interface WidePayConfig {
  wallet_id: string;
  wallet_token: string;
  fine_percentage?: number;
  interest_monthly_pct?: number;
  discount_percentage?: number;
  discount_days_before?: number;
  discount_type?: string;
}

export class InvoiceService {
  constructor(private db: Pool) {}

  // ============================================================
  // Buscar config do Wide Pay (gateway_configs usa tenant_id)
  // ============================================================
  private async getWidePayConfig(empresaId: string): Promise<WidePayConfig> {
    const result = await this.db.query(
      `SELECT wallet_id, wallet_token, fine_percentage, interest_monthly_pct,
              discount_percentage, discount_days_before, discount_type
       FROM gateway_configs
       WHERE tenant_id = $1 AND enabled = true
       ORDER BY created_at ASC LIMIT 1`,
      [empresaId]
    );

    if (result.rows.length === 0) {
      throw new Error('Gateway Wide Pay não configurado. Vá em Financeiro > Gateway.');
    }

    return result.rows[0];
  }

  // ============================================================
  // Auth header para Wide Pay
  // ============================================================
  private getAuthHeader(config: WidePayConfig): string {
    return `Basic ${Buffer.from(`${config.wallet_id}:${config.wallet_token}`).toString('base64')}`;
  }

  // ============================================================
  // Criar cobrança no Wide Pay e salvar na tabela faturas
  // ============================================================
  async createInvoice(empresaId: string, data: {
    clienteId?: string;
    customerName: string;
    customerDocument: string;
    customerEmail?: string;
    customerPhone?: string;
    amount: number;
    dueDate: string;
    billingType: 'BOLETO' | 'PIX';
    description?: string;
    externalReference?: string;
  }) {
    const config = await this.getWidePayConfig(empresaId);
    const auth = this.getAuthHeader(config);

    // Se tem clienteId, buscar dados do cliente na tabela clientes
    let customerName = data.customerName;
    let customerDocument = data.customerDocument;
    let customerEmail = data.customerEmail;
    let customerPhone = data.customerPhone;

    if (data.clienteId) {
      const clienteRes = await this.db.query(
        'SELECT * FROM clientes WHERE id = $1 AND empresa_id = $2',
        [data.clienteId, empresaId]
      );
      if (clienteRes.rows.length > 0) {
        const c = clienteRes.rows[0];
        customerName = customerName || c.nome;
        customerDocument = customerDocument || c.cpf;
        customerEmail = customerEmail || c.email;
        customerPhone = customerPhone || c.telefone || c.whatsapp;
      }
    }

    // Montar corpo da requisição Wide Pay
    const docLimpo = customerDocument.replace(/\D/g, '');
    const forma = data.billingType === 'PIX' ? 'Pix' : 'Boleto';
    const dueDateFormatted = data.dueDate.split('-').reverse().join('/');

    const formData = new URLSearchParams();
    formData.append('forma', forma);
    formData.append('cliente', customerName);
    formData.append('pessoa', docLimpo.length > 11 ? 'Jurídica' : 'Física');
    formData.append('cpf', docLimpo);

    if (customerEmail) formData.append('email', customerEmail);
    if (customerPhone) formData.append('telefone', customerPhone.replace(/\D/g, ''));

    formData.append('valor', String(data.amount));
    formData.append('vencimento', dueDateFormatted);

    if (data.description) formData.append('descricao', data.description);

    // Multa e juros
    if (config.fine_percentage && config.fine_percentage > 0) {
      formData.append('multa', String(config.fine_percentage));
    }
    if (config.interest_monthly_pct && config.interest_monthly_pct > 0) {
      formData.append('juros', String(config.interest_monthly_pct));
    }

    // Criar cobrança
    const chargeRes = await fetch('https://api.widepay.com/v1/recebimentos/cobrancas/adicionar', {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const chargeData: any = await chargeRes.json();

    if (!chargeData.sucesso) {
      throw new Error(`Erro Wide Pay: ${chargeData.erro || 'Erro desconhecido'}`);
    }

    const gatewayId = chargeData.id || '';
    const boletoUrl = chargeData.link || '';
    let pixQrCode = '';
    let pixCopyPaste = '';

    // Se for PIX, buscar QR Code
    if (data.billingType === 'PIX' && gatewayId) {
      const pixRes = await fetch(`https://api.widepay.com/v1/recebimentos/cobrancas/pix/${gatewayId}`, {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const pixData: any = await pixRes.json();
      if (pixData.sucesso) {
        pixQrCode = pixData.qrcode || '';
        pixCopyPaste = pixData.pixCopiaECola || '';
      }
    }

    // Salvar na tabela faturas
    const result = await this.db.query(
      `INSERT INTO faturas (
        empresa_id, cliente_id, gateway_id, provider,
        customer_name, customer_document, customer_email, customer_phone,
        amount, billing_type, due_date, status, description, external_reference,
        boleto_url, boleto_barcode, pix_qr_code, pix_copy_paste, invoice_url
      ) VALUES ($1,$2,$3,'widepay',$4,$5,$6,$7,$8,$9,$10,'PENDING',$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        empresaId, data.clienteId || null, gatewayId,
        customerName, customerDocument, customerEmail || null, customerPhone || null,
        data.amount, data.billingType, data.dueDate,
        data.description || 'Fatura V5 Fibra', data.externalReference || null,
        boletoUrl, gatewayId, pixQrCode, pixCopyPaste, boletoUrl,
      ]
    );

    return result.rows[0];
  }

  // ============================================================
  // Buscar fatura por ID
  // ============================================================
  async getInvoice(empresaId: string, invoiceId: string) {
    const result = await this.db.query(
      'SELECT * FROM faturas WHERE id = $1 AND empresa_id = $2',
      [invoiceId, empresaId]
    );
    return result.rows[0] || null;
  }

  // ============================================================
  // Listar faturas com paginação
  // ============================================================
  async listInvoices(empresaId: string, params: {
    clienteId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { clienteId, status, page = 1, limit = 20 } = params;

    let where = 'WHERE empresa_id = $1';
    const values: any[] = [empresaId];
    let idx = 2;

    if (clienteId) {
      where += ` AND cliente_id = $${idx++}`;
      values.push(clienteId);
    }
    if (status) {
      where += ` AND status = $${idx++}`;
      values.push(status);
    }

    const countRes = await this.db.query(`SELECT COUNT(*) FROM faturas ${where}`, values);
    const total = parseInt(countRes.rows[0].count);
    const offset = (page - 1) * limit;

    const result = await this.db.query(
      `SELECT * FROM faturas ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );

    return { data: result.rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ============================================================
  // Cancelar fatura (cancela no Wide Pay + atualiza banco)
  // ============================================================
  async cancelInvoice(empresaId: string, invoiceId: string) {
    const invoice = await this.getInvoice(empresaId, invoiceId);
    if (!invoice) throw new Error('Fatura não encontrada');

    // Cancelar no Wide Pay se tiver gateway_id
    if (invoice.gateway_id) {
      try {
        const config = await this.getWidePayConfig(empresaId);
        const auth = this.getAuthHeader(config);

        await fetch(`https://api.widepay.com/v1/recebimentos/cobrancas/cancelar/${invoice.gateway_id}`, {
          method: 'POST',
          headers: {
            'Authorization': auth,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      } catch (err: any) {
        console.error('Erro ao cancelar no Wide Pay:', err.message);
        // Continua e cancela localmente mesmo se falhar no gateway
      }
    }

    await this.db.query(
      'UPDATE faturas SET status = $1, updated_at = NOW() WHERE id = $2 AND empresa_id = $3',
      ['CANCELLED', invoiceId, empresaId]
    );

    return { success: true };
  }

  // ============================================================
  // Buscar QR Code PIX do Wide Pay
  // ============================================================
  async getPixQrCode(empresaId: string, invoiceId: string) {
    const invoice = await this.getInvoice(empresaId, invoiceId);
    if (!invoice) throw new Error('Fatura não encontrada');

    // Se já tem QR Code salvo
    if (invoice.pix_qr_code) {
      return { qrCode: invoice.pix_qr_code, copyPaste: invoice.pix_copy_paste };
    }

    if (!invoice.gateway_id) throw new Error('QR Code não disponível');

    const config = await this.getWidePayConfig(empresaId);
    const auth = this.getAuthHeader(config);

    const pixRes = await fetch(`https://api.widepay.com/v1/recebimentos/cobrancas/pix/${invoice.gateway_id}`, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const pixData: any = await pixRes.json();

    if (!pixData.sucesso) {
      throw new Error('QR Code não disponível');
    }

    // Salvar no banco pra cache
    await this.db.query(
      'UPDATE faturas SET pix_qr_code = $1, pix_copy_paste = $2 WHERE id = $3',
      [pixData.qrcode, pixData.pixCopiaECola, invoiceId]
    );

    return { qrCode: pixData.qrcode, copyPaste: pixData.pixCopiaECola };
  }
}