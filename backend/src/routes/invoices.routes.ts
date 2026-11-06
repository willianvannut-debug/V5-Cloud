// ============================================================
// V5 Fibra - Faturas Routes (Apenas Wide Pay)
// Faturas, Boletos e PIX
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function invoiceRoutes(db: Pool) {
  const router = Router();

  // ============================================================
  // GET / - Listar faturas com filtros e paginação
  // ============================================================
  router.get('/', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const {
        status,
        billingType,
        search,
        startDate,
        endDate,
        customerId,
        page = '1',
        limit = '20',
      } = req.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Montar WHERE dinâmico
      const conditions: string[] = ['empresa_id = $1'];
      const values: any[] = [empresaId];
      let idx = 2;

      // Filtrar por cliente específico
      if (customerId) {
        // Buscar o CPF/CNPJ do cliente para encontrar faturas antigas sem cliente_id
        const clienteRes = await db.query(
          'SELECT cpf, cnpj FROM clientes WHERE id = $1 AND empresa_id = $2',
          [customerId, empresaId]
        );
        if (clienteRes.rows.length > 0) {
          const doc = clienteRes.rows[0].cpf || clienteRes.rows[0].cnpj || '';
          if (doc) {
            conditions.push(`(cliente_id = $${idx} OR customer_document = $${idx + 1})`);
            values.push(customerId, doc);
            idx += 2;
          } else {
            conditions.push(`cliente_id = $${idx++}`);
            values.push(customerId);
          }
        } else {
          conditions.push(`cliente_id = $${idx++}`);
          values.push(customerId);
        }
      }

      if (status) {
        conditions.push(`status = $${idx++}`);
        values.push(status);
      }

      if (billingType) {
        conditions.push(`billing_type = $${idx++}`);
        values.push(billingType);
      }

      if (search) {
        conditions.push(`(customer_name ILIKE $${idx} OR customer_document ILIKE $${idx})`);
        values.push(`%${search}%`);
        idx++;
      }

      if (startDate) {
        conditions.push(`due_date >= $${idx++}`);
        values.push(startDate);
      }

      if (endDate) {
        conditions.push(`due_date <= $${idx++}`);
        values.push(endDate);
      }

      const where = conditions.join(' AND ');

      // Contar total
      const countResult = await db.query(`SELECT COUNT(*) FROM faturas WHERE ${where}`, values);
      const total = parseInt(countResult.rows[0].count);

      // Buscar faturas
      const dataResult = await db.query(
        `SELECT * FROM faturas WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, limitNum, offset]
      );

      // Resumo (pendente, recebido, vencido)
      const summaryResult = await db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as total_pending,
          COALESCE(SUM(CASE WHEN status IN ('RECEIVED','CONFIRMED') THEN amount ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN amount ELSE 0 END), 0) as total_overdue,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as count_pending,
          COUNT(CASE WHEN status IN ('RECEIVED','CONFIRMED') THEN 1 END) as count_received,
          COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as count_overdue
        FROM faturas WHERE empresa_id = $1
        ${billingType ? `AND billing_type = $2` : ''}
      `, billingType ? [empresaId, billingType] : [empresaId]);

      const s = summaryResult.rows[0];

      res.json({
        data: dataResult.rows.map(row => ({
          id: row.id,
          customer_name: row.customer_name,
          customer_document: row.customer_document,
          amount: parseFloat(row.amount),
          billing_type: row.billing_type,
          due_date: row.due_date,
          paid_date: row.paid_date,
          status: row.status,
          description: row.description,
          // Campos com nomes que o frontend espera
          boleto_url: row.boleto_url,
          bank_slip_url: row.boleto_url,        // alias para frontend
          barcode: row.boleto_barcode,
          pix_qr_code: row.pix_qr_code,
          pix_qrcode: row.pix_qr_code,          // alias para frontend
          pix_copy_paste: row.pix_copy_paste,
          invoice_url: row.invoice_url,
          url: row.boleto_url || row.invoice_url,
          gateway_id: row.gateway_id,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        summary: {
          totalPending: parseFloat(s.total_pending),
          totalReceived: parseFloat(s.total_received),
          totalOverdue: parseFloat(s.total_overdue),
          countPending: parseInt(s.count_pending),
          countReceived: parseInt(s.count_received),
          countOverdue: parseInt(s.count_overdue),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // POST / - Criar nova cobrança via Wide Pay (Boleto ou PIX)
  // ============================================================
  router.post('/', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const {
        customerId, customerName, customerDocument, customerEmail, customerPhone,
        amount, billingType, dueDate, description
      } = req.body;

      console.log('=== POST /invoices - DADOS RECEBIDOS ===');
      console.log('customerName:', customerName);
      console.log('customerDocument:', customerDocument);
      console.log('customerEmail:', customerEmail);
      console.log('amount:', amount);
      console.log('billingType:', billingType);
      console.log('dueDate:', dueDate);
      console.log('=========================================');

      if (!customerName || !amount || !billingType || !dueDate) {
        return res.status(400).json({ error: 'Campos obrigatórios: customerName, amount, billingType, dueDate' });
      }

      // WidePay exige CPF/CNPJ
      if (!customerDocument || customerDocument.replace(/\D/g, '').length === 0) {
        return res.status(400).json({ error: 'CPF/CNPJ do cliente é obrigatório para gerar cobrança no WidePay. Cadastre o CPF do cliente primeiro.' });
      }

      // Buscar config do gateway (gateway_configs usa tenant_id)
      const configResult = await db.query(
        'SELECT * FROM gateway_configs WHERE tenant_id = $1 AND enabled = true ORDER BY created_at ASC LIMIT 1',
        [empresaId]
      );
      if (configResult.rows.length === 0) {
        return res.status(400).json({ error: 'Gateway não configurado. Vá em Financeiro > Gateway.' });
      }

      const config = configResult.rows[0];
      const auth = Buffer.from(`${config.wallet_id}:${config.wallet_token}`).toString('base64');

      let gatewayId = '';
      let boletoUrl = '';
      let boletoBarcode = '';
      let pixQrCode = '';
      let pixCopyPaste = '';
      let invoiceUrl = '';

      // --- WIDE PAY: Criar cobrança ---
      const forma = billingType === 'PIX' ? 'Pix' : 'Boleto';
      const dueDateFormatted = dueDate.split('-').reverse().join('/');

      // Função para montar o formData do WidePay
      const buildFormData = (includePhone: boolean) => {
        const fd = new URLSearchParams();
        fd.append('forma', forma);
        fd.append('cliente', customerName);
        if (customerDocument) {
          fd.append('pessoa', customerDocument.replace(/\D/g, '').length > 11 ? 'Jurídica' : 'Física');
          fd.append('cpf', customerDocument.replace(/\D/g, ''));
        }
        if (customerEmail) fd.append('email', customerEmail);
        if (includePhone && customerPhone) fd.append('telefone', customerPhone);
        fd.append('vencimento', dueDateFormatted);

        // WidePay exige o campo "itens" com pelo menos 1 item
        fd.append('itens[0][descricao]', description || `Mensalidade - ${customerName}`);
        fd.append('itens[0][valor]', String(amount));

        // Multa e juros (se configurados)
        if (config.fine_percentage > 0) {
          fd.append('multa', String(config.fine_percentage));
        }
        if (config.interest_monthly_pct > 0) {
          fd.append('juros', String(config.interest_monthly_pct));
        }
        return fd;
      };

      // Primeira tentativa (com telefone)
      let formData = buildFormData(true);
      let wpRes = await fetch('https://api.widepay.com/v1/recebimentos/cobrancas/adicionar', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      let wpData: any = await wpRes.json();

      console.log('=== WIDEPAY RESPOSTA ===');
      console.log(JSON.stringify(wpData, null, 2));
      console.log('=== DADOS ENVIADOS AO WIDEPAY ===');
      console.log(formData.toString());
      console.log('==================================');

      // Se deu erro de telefone, tenta novamente sem o telefone
      if (!wpData.sucesso && wpData.erro && wpData.erro.toLowerCase().includes('telefone')) {
        console.log('=== TENTANDO NOVAMENTE SEM TELEFONE ===');
        formData = buildFormData(false);
        wpRes = await fetch('https://api.widepay.com/v1/recebimentos/cobrancas/adicionar', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        wpData = await wpRes.json();
        console.log('=== WIDEPAY RESPOSTA (SEM TELEFONE) ===');
        console.log(JSON.stringify(wpData, null, 2));
        console.log('========================================');
      }

      if (!wpData.sucesso) {
        return res.status(400).json({ error: wpData.erro || 'Erro ao criar cobrança no Wide Pay' });
      }

      gatewayId = wpData.id || '';
      boletoUrl = wpData.link || '';
      invoiceUrl = wpData.link || '';

      // Se for PIX, buscar QR Code
      if (billingType === 'PIX' && wpData.id) {
        const pixRes = await fetch(`https://api.widepay.com/v1/recebimentos/cobrancas/pix/${wpData.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        const pixData: any = await pixRes.json();
        if (pixData.sucesso) {
          pixQrCode = pixData.qrcode || '';
          pixCopyPaste = pixData.pixCopiaECola || '';
        }
      }

      // Salvar no banco local
      // Gerar identificador único para a fatura
      const identificador = gatewayId ? `FAT-${gatewayId}` : `FAT-${Date.now()}`;

      // Extrair mês de referência da data de vencimento (ex: "2026-11" → "Novembro/2026")
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const dtParts = dueDate.split('-');
      const mesRef = dtParts.length >= 2 ? `${meses[parseInt(dtParts[1]) - 1]}/${dtParts[0]}` : `${meses[new Date().getMonth()]}/${new Date().getFullYear()}`;

      // Mapear billingType para metodo PT-BR
      const metodoMap: Record<string, string> = { 'BOLETO': 'boleto', 'PIX': 'pix', 'BOLETO_PIX': 'boleto_pix' };
      const metodo = metodoMap[billingType] || 'boleto';

      const insertResult = await db.query(`
        INSERT INTO faturas (
          empresa_id, cliente_id, identificador, gateway_id, provider,
          customer_name, customer_document, customer_email, customer_phone,
          amount, billing_type, due_date, status, description,
          boleto_url, boleto_barcode, pix_qr_code, pix_copy_paste, invoice_url,
          mes, data, plano, valor, metodo, data_vencimento
        )
        VALUES (
          $1,$2,$3,$4,'widepay',
          $5,$6,$7,$8,
          $9,$10,$11,'PENDING',$12,
          $13,$14,$15,$16,$17,
          $18, CURRENT_DATE, $19, $20, $21, $22
        )
        RETURNING *
      `, [
        empresaId, customerId || null, identificador, gatewayId,
        customerName, customerDocument, customerEmail, customerPhone,
        amount, billingType, dueDate, description || `Cobrança - ${customerName}`,
        boletoUrl, boletoBarcode, pixQrCode, pixCopyPaste, invoiceUrl,
        mesRef, description || `Mensalidade`, amount, metodo, dueDate
      ]);

      // Retornar os dados com aliases que o frontend espera
      const saved = insertResult.rows[0];
      res.json({
        success: true,
        data: saved,
        // Campos no nível raiz para o frontend conseguir ler
        ...saved,
        // Aliases para compatibilidade com frontend
        bank_slip_url: saved.boleto_url,
        pix_qrcode: saved.pix_qr_code,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // GET /pix/:id/qrcode - Buscar QR Code PIX
  // ============================================================
  router.get('/pix/:id/qrcode', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      const { id } = req.params;

      const result = await db.query(
        'SELECT * FROM faturas WHERE id = $1 AND empresa_id = $2',
        [id, empresaId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      const invoice = result.rows[0];

      // Se já tem QR Code salvo, retornar direto
      if (invoice.pix_qr_code) {
        return res.json({ qrCode: invoice.pix_qr_code, copyPaste: invoice.pix_copy_paste });
      }

      // Buscar do Wide Pay se não tiver salvo
      if (!invoice.gateway_id) {
        return res.status(404).json({ error: 'QR Code não disponível' });
      }

      // gateway_configs usa tenant_id
      const configRes = await db.query(
        'SELECT * FROM gateway_configs WHERE tenant_id = $1 AND enabled = true ORDER BY created_at ASC LIMIT 1',
        [empresaId]
      );
      if (configRes.rows.length === 0) {
        return res.status(400).json({ error: 'Gateway não configurado' });
      }

      const cfg = configRes.rows[0];
      const auth = Buffer.from(`${cfg.wallet_id}:${cfg.wallet_token}`).toString('base64');

      const pixRes = await fetch(`https://api.widepay.com/v1/recebimentos/cobrancas/pix/${invoice.gateway_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const pixData: any = await pixRes.json();

      if (pixData.sucesso) {
        // Salvar no banco pra não precisar buscar de novo
        await db.query(
          'UPDATE faturas SET pix_qr_code = $1, pix_copy_paste = $2 WHERE id = $3',
          [pixData.qrcode, pixData.pixCopiaECola, id]
        );
        return res.json({ qrCode: pixData.qrcode, copyPaste: pixData.pixCopiaECola });
      }

      res.status(404).json({ error: 'QR Code não disponível' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // DELETE /:id - Cancelar fatura (frontend usa DELETE)
  // ============================================================
  router.delete('/:id', async (req: Request, res: Response) => {
    // Delega para a mesma lógica de cancelamento
    req.params.id = req.params.id;
    return cancelInvoice(req, res, db);
  });

  // ============================================================
  // POST /:id/cancel - Cancelar cobrança via Wide Pay
  // ============================================================
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    return cancelInvoice(req, res, db);
  });

  // ============================================================
  // POST /carne - Gerar carnê (múltiplas faturas de uma vez)
  // ============================================================
  router.post('/carne', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Empresa não informada' });

      const {
        customerId,
        customerName,
        customerDocument,
        customerEmail,
        customerPhone,
        amount,
        billingType = 'BOLETO',
        billingDay,
        months = 12,
        startMonth,      // ex: "2026-11" (opcional, default = próximo mês)
        description,
      } = req.body;

      // Validações
      if (!customerName || !customerDocument || !amount || !billingDay) {
        return res.status(400).json({
          error: 'Campos obrigatórios: customerName, customerDocument, amount, billingDay',
        });
      }
      if (months < 1 || months > 24) {
        return res.status(400).json({ error: 'Quantidade de meses deve ser entre 1 e 24' });
      }

      // Buscar credenciais do gateway
      const configRes = await db.query(
        'SELECT * FROM gateway_configs WHERE tenant_id = $1 AND enabled = true ORDER BY created_at ASC LIMIT 1',
        [empresaId]
      );
      if (configRes.rows.length === 0) {
        return res.status(400).json({ error: 'Configure sua carteira Wide Pay primeiro!' });
      }
      const cfg = configRes.rows[0];
      const auth = Buffer.from(`${cfg.wallet_id}:${cfg.wallet_token}`).toString('base64');

      // Calcular datas de vencimento
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const today = new Date();
      let startDate: Date;

      if (startMonth) {
        const [y, m] = startMonth.split('-').map(Number);
        startDate = new Date(y, m - 1, parseInt(billingDay));
      } else {
        // Próximo mês
        startDate = new Date(today.getFullYear(), today.getMonth() + 1, parseInt(billingDay));
      }

      const generated: any[] = [];
      const errors: any[] = [];

      // Mapear billingType para metodo PT-BR
      const metodoMap: Record<string, string> = { 'BOLETO': 'boleto', 'PIX': 'pix', 'BOLETO_PIX': 'boleto_pix' };
      const metodo = metodoMap[billingType] || 'boleto';

      // Pessoa física ou jurídica
      const docLimpo = customerDocument.replace(/\D/g, '');
      const pessoa = docLimpo.length <= 11 ? 'Física' : 'Jurídica';

      for (let i = 0; i < months; i++) {
        try {
          const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
          const dueDateStr = dueDate.toISOString().split('T')[0];
          const mesIdx = dueDate.getMonth();
          const anoRef = dueDate.getFullYear();
          const mesRef = `${meses[mesIdx]}/${anoRef}`;
          const parcela = `${i + 1}/${months}`;

          // Gerar cobrança no WidePay
          const formParams = new URLSearchParams();
          formParams.append('forma', billingType === 'PIX' ? 'Pix' : 'Boleto');
          formParams.append('cliente', customerName);
          formParams.append('pessoa', pessoa);
          formParams.append('cpf', docLimpo);
          formParams.append('itens[0][descricao]', `${description || 'Mensalidade'} - Parcela ${parcela}`);
          formParams.append('itens[0][valor]', parseFloat(amount).toFixed(2));
          // WidePay exige formato DD/MM/YYYY
          const dueDateFormatted = dueDateStr.split('-').reverse().join('/');
          formParams.append('vencimento', dueDateFormatted);

          if (customerEmail) {
            formParams.append('email', customerEmail);
          }
          if (customerPhone) {
            formParams.append('telefone', customerPhone);
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

          // Se telefone deu erro, tentar sem
          let finalChargeData = chargeData;
          if (!chargeData.sucesso && customerPhone && chargeData.erro && chargeData.erro.includes('telefone')) {
            formParams.delete('telefone');
            const retryRes = await fetch('https://api.widepay.com/v1/recebimentos/cobrancas/adicionar', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`,
              },
              body: formParams.toString(),
            });
            finalChargeData = await retryRes.json();
          }

          if (!finalChargeData.sucesso) {
            console.error(`Carnê parcela ${parcela} - WidePay erro:`, JSON.stringify(finalChargeData));
            console.error(`Carnê parcela ${parcela} - Body enviado:`, formParams.toString());
            errors.push({ parcela, mes: mesRef, erro: finalChargeData.erro || 'Erro desconhecido' });
            continue;
          }

          const gatewayId = finalChargeData.id ? String(finalChargeData.id) : null;
          const boletoUrl = finalChargeData.link || null;
          const invoiceUrl = finalChargeData.link || null;
          const identificador = gatewayId ? `CARNE-${gatewayId}` : `CARNE-${Date.now()}-${i}`;

          // Salvar no banco
          const insertResult = await db.query(`
            INSERT INTO faturas (
              empresa_id, cliente_id, identificador, gateway_id, provider,
              customer_name, customer_document, customer_email, customer_phone,
              amount, billing_type, due_date, status, description,
              boleto_url, boleto_barcode, pix_qr_code, pix_copy_paste, invoice_url,
              mes, data, plano, valor, metodo, data_vencimento
            )
            VALUES (
              $1,$2,$3,$4,'widepay',
              $5,$6,$7,$8,
              $9,$10,$11,'PENDING',$12,
              $13,$14,$15,$16,$17,
              $18, CURRENT_DATE, $19, $20, $21, $22
            )
            RETURNING *
          `, [
            empresaId, customerId || null, identificador, gatewayId,
            customerName, docLimpo, customerEmail, customerPhone,
            amount, billingType, dueDateStr, `${description || 'Mensalidade'} - Parcela ${parcela}`,
            boletoUrl, gatewayId, null, null, invoiceUrl,
            mesRef, description || 'Mensalidade', amount, metodo, dueDateStr,
          ]);

          generated.push({
            parcela,
            mes: mesRef,
            due_date: dueDateStr,
            amount,
            gateway_id: gatewayId,
            boleto_url: boletoUrl,
            id: insertResult.rows[0].id,
          });

        } catch (err: any) {
          errors.push({ parcela: `${i + 1}/${months}`, erro: err.message });
        }
      }

      res.json({
        success: true,
        total_parcelas: months,
        geradas: generated.length,
        erros: errors.length,
        faturas: generated,
        errors,
      });
    } catch (err: any) {
      console.error('Erro ao gerar carnê:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

// Função compartilhada de cancelamento
async function cancelInvoice(req: Request, res: Response, db: Pool) {
    try {
      const empresaId = req.empresaId!;
      const { id } = req.params;

      const result = await db.query(
        'SELECT * FROM faturas WHERE id = $1 AND empresa_id = $2',
        [id, empresaId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      const invoice = result.rows[0];

      // Cancelar no Wide Pay se tiver gateway_id
      if (invoice.gateway_id) {
        // gateway_configs usa tenant_id
        const configRes = await db.query(
          'SELECT * FROM gateway_configs WHERE tenant_id = $1 AND enabled = true ORDER BY created_at ASC LIMIT 1',
          [empresaId]
        );

        if (configRes.rows.length > 0) {
          const cfg = configRes.rows[0];
          const auth = Buffer.from(`${cfg.wallet_id}:${cfg.wallet_token}`).toString('base64');

          await fetch(`https://api.widepay.com/v1/recebimentos/cobrancas/cancelar/${invoice.gateway_id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
        }
      }

      await db.query(
        'UPDATE faturas SET status = $1, updated_at = NOW() WHERE id = $2',
        ['CANCELLED', id]
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
}