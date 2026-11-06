// ============================================================
// V5 Fibra - Rotas: Sincronização Wide Pay → Sistema
// Puxa TODAS as cobranças E carnês do Wide Pay
// Sincroniza com a tabela FATURAS
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { WidePayClient } from '../services/widepay.client';

export function syncRoutes(db: Pool): Router {
  const router = Router();

  // Helper: buscar credenciais do Wide Pay no banco
  async function getWidePayCredentials(empresaId: string): Promise<{ walletId: string; walletToken: string } | null> {
    try {
      const result = await db.query(
        `SELECT * FROM gateway_configs WHERE tenant_id = $1 AND enabled = true ORDER BY created_at ASC LIMIT 1`,
        [empresaId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];

      const walletId = row.wallet_id || '';
      const walletToken = row.wallet_token || '';

      if (!walletId || !walletToken) return null;

      return { walletId, walletToken };
    } catch (err) {
      console.error('[Sync] Erro ao buscar gateway config:', err);
      return null;
    }
  }

  // Helper: criar client Wide Pay
  async function getWidePayClient(empresaId: string): Promise<WidePayClient | null> {
    const creds = await getWidePayCredentials(empresaId);
    if (!creds) return null;
    return new WidePayClient(creds);
  }

  // Helper: chamada direta à API do Wide Pay (para endpoints que o client não tem)
  async function widePayRequest(walletId: string, walletToken: string, endpoint: string, data: Record<string, string> = {}): Promise<any> {
    const url = `https://api.widepay.com/v1${endpoint}`;
    const auth = Buffer.from(`${walletId}:${walletToken}`).toString('base64');

    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        body.append(key, value);
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wide Pay API error: ${response.status} - ${text}`);
    }

    return response.json();
  }

  // Helper: processar uma cobrança e inserir/atualizar na tabela faturas
  async function processCobranca(
    cob: any,
    empresaId: string,
    db: Pool,
    origem: string = 'cobranca' // 'cobranca' ou 'carne'
  ): Promise<'inserted' | 'updated' | 'skipped' | 'error'> {
    try {
      const gatewayId = String(cob.id);

      // Verificar se já existe na tabela FATURAS pelo gateway_id
      const existing = await db.query(
        `SELECT id, status, paid_date FROM faturas WHERE gateway_id = $1 AND empresa_id = $2`,
        [gatewayId, empresaId]
      );

      // ============================================================
      // O Wide Pay usa o campo "status" (NÃO "situacao")
      // Valores: "Aguardando", "Recebido", "Vencido", "Cancelado"
      // ============================================================
      const rawStatus = cob.status || '';

      const statusMap: Record<string, string> = {
        'Aguardando':            'PENDING',
        'Em análise':            'PENDING',
        'Recebido':              'RECEIVED',
        'Recebido manualmente':  'RECEIVED',
        'Pago':                  'RECEIVED',
        'Cancelado':             'CANCELLED',
        'Vencido':               'OVERDUE',
        'Expirado':              'OVERDUE',
      };
      const mappedStatus = statusMap[rawStatus] || 'PENDING';

      // Mapear forma de pagamento
      const formaMap: Record<string, string> = {
        'Boleto':       'BOLETO',
        'Cartão':       'CARTAO',
        'PIX':          'PIX',
        'Pix':          'PIX',
        'Boleto e PIX': 'BOLETO_PIX',
        'Boleto,Pix':   'BOLETO_PIX',
      };
      const billingType = formaMap[cob.forma] || 'BOLETO_PIX';

      // Mapear billingType para metodo PT-BR
      const metodoMap: Record<string, string> = {
        'BOLETO': 'boleto',
        'CARTAO': 'cartao',
        'PIX': 'pix',
        'BOLETO_PIX': 'boleto_pix',
      };
      const metodo = metodoMap[billingType] || 'boleto';

      // Valor — pode ser número direto ou string
      let amount = 0;
      if (cob.valor != null) {
        const valorStr = String(cob.valor);
        if (valorStr.includes(',')) {
          amount = parseFloat(valorStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        } else {
          amount = parseFloat(valorStr) || 0;
        }
      }

      // Valor REAL recebido (inclui juros/multa) — campo "recebido" do Wide Pay
      let valorRecebido = 0;
      if (cob.recebido != null) {
        const recStr = String(cob.recebido);
        if (recStr.includes(',')) {
          valorRecebido = parseFloat(recStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        } else {
          valorRecebido = parseFloat(recStr) || 0;
        }
      }

      // Tarifa do Wide Pay — campo "tarifa"
      let tarifa = 0;
      if (cob.tarifa != null) {
        const tarifaStr = String(cob.tarifa);
        if (tarifaStr.includes(',')) {
          tarifa = parseFloat(tarifaStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        } else {
          tarifa = parseFloat(tarifaStr) || 0;
        }
      }

      // ============================================================
      // Datas do Wide Pay já vêm em formato YYYY-MM-DD
      // Campos: "vencimento", "recebimento", "compensacao", "criacao"
      // ============================================================
      let dueDate: string | null = cob.vencimento || null;
      if (dueDate && dueDate.includes('/')) {
        const parts = dueDate.split('/');
        if (parts.length === 3) {
          dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      // Data de pagamento = campo "recebimento"
      let paidDate: string | null = cob.recebimento || null;
      if (paidDate && paidDate.includes('/')) {
        const parts = paidDate.split('/');
        if (parts.length === 3) {
          paidDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      // Se status é RECEIVED e não tem data de pagamento, usar data de hoje
      if (mappedStatus === 'RECEIVED' && !paidDate) {
        paidDate = new Date().toISOString().split('T')[0];
      }

      // Nome do cliente e documento
      const customerName = cob.cliente || 'Cliente Wide Pay';
      const customerDocument = cob.cpf || cob.cnpj || '';
      const customerEmail = cob.email || '';
      const customerPhone = cob.telefone || '';

      // Tentar encontrar o cliente_id na tabela clientes
      let clienteId: string | null = null;
      if (customerDocument) {
        const docLimpo = customerDocument.replace(/\D/g, '');
        const clientSearch = await db.query(
          `SELECT id FROM clientes
           WHERE empresa_id = $1
           AND (cpf = $2 OR cnpj = $2 OR REPLACE(REPLACE(REPLACE(cpf,'.',''),'-',''),'/','') = $2)
           LIMIT 1`,
          [empresaId, docLimpo]
        );
        if (clientSearch.rows.length > 0) {
          clienteId = clientSearch.rows[0].id;
        }
      }
      if (!clienteId && customerName && customerName !== 'Cliente Wide Pay') {
        const nameSearch = await db.query(
          `SELECT id FROM clientes
           WHERE empresa_id = $1
           AND nome ILIKE $2
           LIMIT 1`,
          [empresaId, `%${customerName}%`]
        );
        if (nameSearch.rows.length > 0) {
          clienteId = nameSearch.rows[0].id;
        }
      }

      // Descrição
      let description = cob.descricao || cob.referencia || '';
      if (!description && cob.itens && Array.isArray(cob.itens) && cob.itens.length > 0) {
        description = cob.itens[0].descricao || '';
      }
      if (!description) {
        description = origem === 'carne'
          ? `Carnê Wide Pay #${gatewayId}`
          : `Cobrança Wide Pay #${gatewayId}`;
      }

      // Mês de referência
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      let mesRef = '';
      if (dueDate) {
        const dtParts = dueDate.split('-');
        if (dtParts.length >= 2) {
          const mesIdx = parseInt(dtParts[1]) - 1;
          if (mesIdx >= 0 && mesIdx < 12) {
            mesRef = `${meses[mesIdx]}/${dtParts[0]}`;
          }
        }
      }

      const identificador = `SYNC-${gatewayId}`;
      const boletoUrl = cob.link || null;

      if (existing.rows.length > 0) {
        const currentStatus = existing.rows[0].status;
        if (currentStatus !== mappedStatus || (paidDate && !existing.rows[0].paid_date) || valorRecebido > 0) {
          await db.query(
            `UPDATE faturas SET
              status = $1,
              paid_date = COALESCE($2, paid_date),
              customer_name = COALESCE($3, customer_name),
              customer_document = COALESCE($4, customer_document),
              customer_email = COALESCE($5, customer_email),
              customer_phone = COALESCE($6, customer_phone),
              amount = COALESCE($7, amount),
              valor_recebido = CASE WHEN $9::numeric > 0 THEN $9::numeric ELSE valor_recebido END,
              tarifa = CASE WHEN $10::numeric > 0 THEN $10::numeric ELSE tarifa END,
              updated_at = NOW()
            WHERE id = $8`,
            [mappedStatus, paidDate, customerName, customerDocument, customerEmail, customerPhone, amount, existing.rows[0].id, valorRecebido, tarifa]
          );
          return 'updated';
        } else {
          return 'skipped';
        }
      } else {
        await db.query(
          `INSERT INTO faturas (
            empresa_id, cliente_id, identificador, gateway_id, provider,
            customer_name, customer_document, customer_email, customer_phone,
            amount, billing_type, due_date, paid_date, status, description,
            boleto_url, invoice_url,
            mes, data, plano, valor, metodo, data_vencimento,
            valor_recebido, tarifa
          ) VALUES (
            $1, $2, $3, $4, 'widepay',
            $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14,
            $15, $16,
            $17, CURRENT_DATE, $18, $19, $20, $21,
            $22, $23
          )`,
          [
            empresaId, clienteId, identificador, gatewayId,
            customerName, customerDocument, customerEmail, customerPhone,
            amount, billingType,
            dueDate || new Date().toISOString().split('T')[0],
            paidDate, mappedStatus, description,
            boletoUrl, boletoUrl,
            mesRef, description, amount, metodo,
            dueDate || new Date().toISOString().split('T')[0],
            valorRecebido, tarifa,
          ]
        );
        return 'inserted';
      }
    } catch (err: any) {
      console.error(`[Sync] Erro ao processar cobrança ${cob.id}: ${err.message}`);
      return 'error';
    }
  }

  // ============================================================
  // POST /api/financial/sync/widepay — sincronizar TUDO
  // Puxa cobranças + carnês do Wide Pay
  // ============================================================
  router.post('/widepay', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) {
        return res.status(400).json({ error: 'x-tenant-id é obrigatório' });
      }

      // Buscar credenciais
      const creds = await getWidePayCredentials(empresaId);
      if (!creds) {
        return res.status(400).json({
          error: 'Wide Pay não configurado. Vá em Gateway e configure suas credenciais.',
        });
      }

      const widepay = new WidePayClient(creds);

      console.log('[Sync] Iniciando sincronização COMPLETA com Wide Pay (cobranças + carnês)...');

      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let errorCount = 0;
      const errorDetails: string[] = [];
      const processedIds = new Set<number>();

      // ============================================================
      // PARTE 1: COBRANÇAS
      // ============================================================
      console.log('[Sync] === PARTE 1: COBRANÇAS ===');

      const latestResult = await widepay.consultarCobranca();
      const latestCobrancas = latestResult.cobrancas || [];

      // Processar as últimas cobranças
      for (const cob of latestCobrancas) {
        const result = await processCobranca(cob, empresaId, db, 'cobranca');
        processedIds.add(parseInt(cob.id));
        if (result === 'inserted') inserted++;
        else if (result === 'updated') updated++;
        else if (result === 'skipped') skipped++;
        else { errorCount++; errorDetails.push(`Cobrança #${cob.id}`); }
      }

      // Descobrir range de IDs
      let maxId = 0;
      let minIdFromLatest = 999999999;
      for (const cob of latestCobrancas) {
        const cobId = parseInt(cob.id);
        if (cobId > maxId) maxId = cobId;
        if (cobId < minIdFromLatest) minIdFromLatest = cobId;
      }

      console.log(`[Sync] Cobranças últimas: ${latestCobrancas.length}, IDs ${minIdFromLatest}-${maxId}`);

      // Varrer IDs antigos (abaixo do mínimo encontrado)
      const BATCH_SIZE = 50;
      let emptyBatches = 0;
      const MAX_EMPTY_BATCHES = 5; // Aumentado para 5 para pegar mais

      let currentMaxId = minIdFromLatest - 1;
      if (currentMaxId > 0) {
        console.log(`[Sync] Varrendo IDs antigos de ${currentMaxId} para baixo...`);
        while (currentMaxId > 0 && emptyBatches < MAX_EMPTY_BATCHES) {
          const batchIds: string[] = [];
          const startId = Math.max(1, currentMaxId - BATCH_SIZE + 1);
          for (let id = currentMaxId; id >= startId; id--) {
            if (!processedIds.has(id)) batchIds.push(String(id));
          }
          currentMaxId = startId - 1;
          if (batchIds.length === 0) { emptyBatches++; continue; }

          let foundInBatch = 0;
          for (const idStr of batchIds) {
            try {
              const singleResult = await widepay.consultarCobranca(idStr);
              const singleCobrancas = singleResult.cobrancas || [];
              for (const cob of singleCobrancas) {
                foundInBatch++;
                const result = await processCobranca(cob, empresaId, db, 'cobranca');
                processedIds.add(parseInt(cob.id));
                if (result === 'inserted') inserted++;
                else if (result === 'updated') updated++;
                else if (result === 'skipped') skipped++;
                else { errorCount++; errorDetails.push(`Cobrança #${cob.id}`); }
              }
            } catch (e) { /* ID não existe */ }
          }

          if (foundInBatch === 0) {
            emptyBatches++;
            console.log(`[Sync] Lote vazio (${emptyBatches}/${MAX_EMPTY_BATCHES})`);
          } else {
            emptyBatches = 0;
            console.log(`[Sync] Lote: ${foundInBatch} cobranças encontradas`);
          }
        }
      }

      // Verificar IDs acima do máximo
      for (let id = maxId + 1; id <= maxId + 30; id++) {
        if (processedIds.has(id)) continue;
        try {
          const r = await widepay.consultarCobranca(String(id));
          for (const cob of (r.cobrancas || [])) {
            const result = await processCobranca(cob, empresaId, db, 'cobranca');
            processedIds.add(parseInt(cob.id));
            if (result === 'inserted') inserted++;
            else if (result === 'updated') updated++;
            else if (result === 'skipped') skipped++;
            else { errorCount++; }
          }
        } catch (e) { /* ignorar */ }
      }

      const cobrancasTotal = inserted + updated + skipped + errorCount;
      console.log(`[Sync] Cobranças concluído: ${cobrancasTotal} processadas`);

      // ============================================================
      // PARTE 2: CARNÊS
      // Endpoint: /recebimentos/carnes/consultar (sem ID = retorna TODOS com parcelas)
      // A API já retorna cada carnê com sua array "cobrancas" (parcelas)
      // Cada parcela tem: id, valor, status, recebido, vencimento, recebimento, link
      // Dados do cliente (cliente, cpf, email, telefone) vêm no carnê pai
      // ============================================================
      console.log('[Sync] === PARTE 2: CARNÊS ===');

      let carnesFound = 0;
      let parcelasFound = 0;

      // Função para processar todos os carnês de uma resposta
      async function processarCarnes(carnes: any[]) {
        for (const carne of carnes) {
          carnesFound++;
          const carneId = String(carne.id);

          // As parcelas JÁ vêm dentro do carnê como "cobrancas"
          const parcelas = carne.cobrancas || [];
          console.log(`[Sync] Carnê #${carneId} (${carne.cliente || 'sem nome'}): ${parcelas.length} parcelas`);

          if (parcelas.length === 0) continue;

          for (const parcela of parcelas) {
            const parcelaId = parseInt(parcela.id);
            if (processedIds.has(parcelaId)) {
              skipped++;
              continue;
            }

            parcelasFound++;

            // Criar objeto enriquecido com dados do cliente do carnê pai
            const cobEnriquecida: any = {
              ...parcela,
              // Herdar dados do cliente do carnê pai
              cliente: parcela.cliente || carne.cliente || 'Cliente Wide Pay',
              cpf: parcela.cpf || carne.cpf || '',
              cnpj: parcela.cnpj || carne.cnpj || '',
              email: parcela.email || carne.email || '',
              telefone: parcela.telefone || carne.telefone || '',
              // Herdar itens/descricao do carnê pai se a parcela não tiver
              itens: parcela.itens || carne.itens || [],
              descricao: parcela.descricao || (carne.itens && carne.itens[0] ? carne.itens[0].descricao : '') || `Carnê #${carneId}`,
              forma: parcela.forma || 'Boleto e PIX',
            };

            const result = await processCobranca(cobEnriquecida, empresaId, db, 'carne');
            processedIds.add(parcelaId);
            if (result === 'inserted') inserted++;
            else if (result === 'updated') updated++;
            else if (result === 'skipped') skipped++;
            else { errorCount++; errorDetails.push(`Carnê #${carneId} parcela #${parcelaId}`); }
          }
        }
      }

      try {
        // A API retorna TODOS os carnês com parcelas em uma única chamada
        const carnesResult = await widePayRequest(
          creds.walletId, creds.walletToken,
          '/recebimentos/carnes/consultar',
          {}
        );

        console.log(`[Sync] Resposta carnês — sucesso: ${carnesResult.sucesso}, total: ${carnesResult.total}`);
        console.log(`[Sync] Campos da resposta: ${Object.keys(carnesResult).join(', ')}`);

        // A API retorna os carnês no campo "carnes"
        const carnes = carnesResult.carnes || [];
        console.log(`[Sync] Wide Pay retornou ${carnes.length} carnês`);

        if (carnes.length > 0) {
          await processarCarnes(carnes);
        }

        // Varrer carnês por ID (pode ter mais antigos não incluídos na listagem)
        if (carnes.length > 0) {
          let maxCarneId = 0;
          let minCarneId = 999999999;
          for (const c of carnes) {
            const cid = parseInt(c.id);
            if (cid > maxCarneId) maxCarneId = cid;
            if (cid < minCarneId) minCarneId = cid;
          }

          const processedCarneIds = new Set(carnes.map((c: any) => parseInt(c.id)));

          // Varrer IDs de carnê abaixo do mínimo
          for (let id = minCarneId - 1; id >= Math.max(1, minCarneId - 50); id--) {
            if (processedCarneIds.has(id)) continue;
            try {
              const carneDetail = await widePayRequest(
                creds.walletId, creds.walletToken,
                '/recebimentos/carnes/consultar',
                { id: String(id) }
              );
              // Resposta individual: o carnê vem diretamente com suas cobrancas
              const parcelas = carneDetail.cobrancas || [];
              if (parcelas.length === 0) continue;

              // Montar como se fosse um item da lista
              const carneObj = { ...carneDetail, cobrancas: parcelas };
              await processarCarnes([carneObj]);
            } catch (e) { /* carnê não existe */ }
          }

          // Varrer IDs acima do máximo
          for (let id = maxCarneId + 1; id <= maxCarneId + 20; id++) {
            if (processedCarneIds.has(id)) continue;
            try {
              const carneDetail = await widePayRequest(
                creds.walletId, creds.walletToken,
                '/recebimentos/carnes/consultar',
                { id: String(id) }
              );
              const parcelas = carneDetail.cobrancas || [];
              if (parcelas.length === 0) continue;

              const carneObj = { ...carneDetail, cobrancas: parcelas };
              await processarCarnes([carneObj]);
            } catch (e) { /* ignorar */ }
          }
        }
      } catch (carnesErr: any) {
        console.error('[Sync] Erro ao buscar carnês:', carnesErr.message);
        errorDetails.push(`Carnês: ${carnesErr.message}`);
      }

      // ============================================================
      // RESULTADO FINAL
      // ============================================================
      const totalProcessed = inserted + updated + skipped + errorCount;
      console.log(`[Sync] ========================================`);
      console.log(`[Sync] RESULTADO FINAL:`);
      console.log(`[Sync]   Cobranças processadas: ${cobrancasTotal}`);
      console.log(`[Sync]   Carnês encontrados: ${carnesFound}`);
      console.log(`[Sync]   Parcelas de carnês: ${parcelasFound}`);
      console.log(`[Sync]   Total: ${totalProcessed} (${inserted} novas, ${updated} atualizadas, ${skipped} sem alteração, ${errorCount} erros)`);
      console.log(`[Sync] ========================================`);

      res.json({
        success: true,
        total: totalProcessed,
        inserted,
        updated,
        skipped,
        errors: errorCount,
        carnes: {
          carnesEncontrados: carnesFound,
          parcelasProcessadas: parcelasFound,
        },
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        message: `Sincronização completa: ${inserted} novas, ${updated} atualizadas, ${skipped} sem alteração. Carnês: ${carnesFound} encontrados, ${parcelasFound} parcelas.`,
      });
    } catch (err: any) {
      console.error('[Sync] Erro na sincronização:', err);
      res.status(500).json({ error: `Erro ao sincronizar: ${err.message}` });
    }
  });

  // ============================================================
  // GET /api/financial/sync/status — verificar se Wide Pay está configurado
  // ============================================================
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      const config = await db.query(
        `SELECT id, wallet_id, environment FROM gateway_configs WHERE tenant_id = $1 AND enabled = true`,
        [empresaId]
      );

      if (config.rows.length === 0) {
        return res.json({ configured: false, message: 'Wide Pay não configurado' });
      }

      const count = await db.query(
        `SELECT COUNT(*) AS total FROM faturas WHERE empresa_id = $1 AND gateway_id IS NOT NULL`,
        [empresaId]
      );

      res.json({
        configured: true,
        walletId: config.rows[0].wallet_id,
        environment: config.rows[0].environment,
        syncedInvoices: parseInt(count.rows[0].total),
      });
    } catch (err) {
      console.error('[Sync] Erro ao verificar status:', err);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // GET /api/financial/sync/diagnostico — resumo do banco de dados
  // ============================================================
  router.get('/diagnostico', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;

      const byStatus = await db.query(
        `SELECT status, COUNT(*) as qtd, COALESCE(SUM(amount), 0) as total
         FROM faturas WHERE empresa_id = $1
         GROUP BY status ORDER BY status`,
        [empresaId]
      );

      const recebidosPorMes = await db.query(
        `SELECT TO_CHAR(paid_date, 'YYYY-MM') as mes, COUNT(*) as qtd, COALESCE(SUM(amount), 0) as total
         FROM faturas
         WHERE empresa_id = $1 AND status IN ('RECEIVED', 'CONFIRMED') AND paid_date IS NOT NULL
         GROUP BY TO_CHAR(paid_date, 'YYYY-MM')
         ORDER BY mes`,
        [empresaId]
      );

      // Total por mês de VENCIMENTO (para comparar com Wide Pay)
      const totalPorVencimento = await db.query(
        `SELECT TO_CHAR(due_date, 'YYYY-MM') as mes, COUNT(*) as qtd, COALESCE(SUM(amount), 0) as total,
          COUNT(*) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')) as qtd_recebido,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')), 0) as total_recebido
         FROM faturas
         WHERE empresa_id = $1
         GROUP BY TO_CHAR(due_date, 'YYYY-MM')
         ORDER BY mes`,
        [empresaId]
      );

      const totalGeral = await db.query(
        `SELECT COUNT(*) as qtd, COALESCE(SUM(amount), 0) as total FROM faturas WHERE empresa_id = $1`,
        [empresaId]
      );

      res.json({
        total_faturas: parseInt(totalGeral.rows[0].qtd),
        total_valor: parseFloat(totalGeral.rows[0].total),
        por_status: byStatus.rows,
        recebidos_por_mes_pagamento: recebidosPorMes.rows,
        total_por_mes_vencimento: totalPorVencimento.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // GET /api/financial/sync/debug — dados brutos do Wide Pay
  // ============================================================
  router.get('/debug', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      const widepay = await getWidePayClient(empresaId);
      if (!widepay) {
        return res.status(400).json({ error: 'Wide Pay não configurado' });
      }

      const result = await widepay.consultarCobranca();

      // Também buscar carnês
      const creds = await getWidePayCredentials(empresaId);
      let carnesResult: any = null;
      if (creds) {
        try {
          carnesResult = await widePayRequest(
            creds.walletId, creds.walletToken,
            '/recebimentos/carnes/consultar',
            {}
          );
        } catch (e: any) {
          carnesResult = { error: e.message };
        }
      }

      res.json({
        cobrancas: {
          total: result.total,
          cobrancas: result.cobrancas,
        },
        carnes: carnesResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // GET /api/financial/sync/diagnostico — investigar diferenças Wide Pay vs Sistema
  // ============================================================
  router.get('/diagnostico', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Tenant não informado' });

      // 1) Recebidos por mês de PAGAMENTO com valor_recebido
      const recebidosPorMes = await db.query(
        `SELECT
          TO_CHAR(paid_date, 'YYYY-MM') as mes,
          COUNT(*) as qtd,
          COALESCE(SUM(amount), 0)::numeric as soma_amount,
          COALESCE(SUM(valor_recebido), 0)::numeric as soma_valor_recebido,
          COALESCE(SUM(CASE WHEN valor_recebido > 0 THEN valor_recebido ELSE amount END), 0)::numeric as soma_real,
          COUNT(*) FILTER (WHERE valor_recebido = 0 OR valor_recebido IS NULL) as sem_valor_recebido
        FROM faturas
        WHERE empresa_id = $1
          AND status IN ('RECEIVED', 'CONFIRMED')
          AND paid_date IS NOT NULL
        GROUP BY TO_CHAR(paid_date, 'YYYY-MM')
        ORDER BY mes`,
        [empresaId]
      );

      // 2) Faturas recebidas que NÃO têm valor_recebido (valor = 0)
      const semValorRecebido = await db.query(
        `SELECT
          id, gateway_id, customer_name, amount, valor_recebido,
          TO_CHAR(paid_date, 'YYYY-MM-DD') as paid_date,
          TO_CHAR(due_date, 'YYYY-MM-DD') as due_date,
          status
        FROM faturas
        WHERE empresa_id = $1
          AND status IN ('RECEIVED', 'CONFIRMED')
          AND (valor_recebido = 0 OR valor_recebido IS NULL)
        ORDER BY paid_date`,
        [empresaId]
      );

      // 3) Total no sistema vs Wide Pay
      const totalSistema = await db.query(
        `SELECT
          COUNT(*) as total_faturas,
          COUNT(*) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')) as total_recebidas,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')), 0)::numeric as soma_amount_recebidas,
          COALESCE(SUM(valor_recebido) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED') AND valor_recebido > 0), 0)::numeric as soma_valor_recebido
        FROM faturas
        WHERE empresa_id = $1`,
        [empresaId]
      );

      // 4) Tentar contar cobranças no Wide Pay
      let widePayTotal: any = null;
      try {
        const widepay = await getWidePayClient(empresaId);
        if (widepay) {
          const cobRes = await widepay.consultarCobranca();
          const cobData = cobRes?.data || cobRes;
          if (cobData?.cobrancas) {
            const cobrancas = cobData.cobrancas;
            let wpRecebidas = 0;
            let wpTotalRecebido = 0;
            const wpPorMes: Record<string, { qtd: number; total: number }> = {};

            cobrancas.forEach((c: any) => {
              if (c.status === 'Recebido' || c.status === 'Recebido manualmente' || c.status === 'Pago') {
                wpRecebidas++;
                let recVal = 0;
                if (c.recebido != null) {
                  const s = String(c.recebido);
                  recVal = s.includes(',')
                    ? parseFloat(s.replace('R$','').replace(/\./g,'').replace(',','.').trim()) || 0
                    : parseFloat(s) || 0;
                }
                wpTotalRecebido += recVal;

                // Agrupar por mês de recebimento
                let recDate = c.recebimento || '';
                if (recDate.includes('/')) {
                  const p = recDate.split('/');
                  if (p.length === 3) recDate = `${p[2]}-${p[1].padStart(2,'0')}`;
                  else recDate = '';
                } else if (recDate.length >= 7) {
                  recDate = recDate.substring(0, 7);
                }
                if (recDate) {
                  if (!wpPorMes[recDate]) wpPorMes[recDate] = { qtd: 0, total: 0 };
                  wpPorMes[recDate].qtd++;
                  wpPorMes[recDate].total += recVal;
                }
              }
            });

            widePayTotal = {
              total_cobrancas: cobrancas.length,
              recebidas: wpRecebidas,
              total_recebido: wpTotalRecebido,
              por_mes_recebimento: wpPorMes,
            };
          }
        }
      } catch (e: any) {
        widePayTotal = { error: e.message };
      }

      // 5) Comparação lado a lado
      const comparacao: any[] = [];
      if (widePayTotal && widePayTotal.por_mes_recebimento) {
        const meses = new Set([
          ...Object.keys(widePayTotal.por_mes_recebimento),
          ...recebidosPorMes.rows.map((r: any) => r.mes),
        ]);
        Array.from(meses).sort().forEach(mes => {
          const wp = widePayTotal.por_mes_recebimento[mes] || { qtd: 0, total: 0 };
          const sys = recebidosPorMes.rows.find((r: any) => r.mes === mes) || {
            qtd: 0, soma_amount: 0, soma_valor_recebido: 0, soma_real: 0, sem_valor_recebido: 0,
          };
          comparacao.push({
            mes,
            widepay_qtd: wp.qtd,
            widepay_recebido: Math.round(wp.total * 100) / 100,
            sistema_qtd: parseInt(sys.qtd) || 0,
            sistema_amount: parseFloat(sys.soma_amount) || 0,
            sistema_valor_recebido: parseFloat(sys.soma_valor_recebido) || 0,
            sistema_real: parseFloat(sys.soma_real) || 0,
            sistema_sem_valor_recebido: parseInt(sys.sem_valor_recebido) || 0,
            diferenca: Math.round((wp.total - (parseFloat(sys.soma_real) || 0)) * 100) / 100,
          });
        });
      }

      res.json({
        recebidos_por_mes_pagamento: recebidosPorMes.rows.map((r: any) => ({
          mes: r.mes,
          qtd: parseInt(r.qtd),
          soma_amount: parseFloat(r.soma_amount),
          soma_valor_recebido: parseFloat(r.soma_valor_recebido),
          soma_real: parseFloat(r.soma_real),
          sem_valor_recebido: parseInt(r.sem_valor_recebido),
        })),
        faturas_sem_valor_recebido: semValorRecebido.rows,
        totais_sistema: totalSistema.rows[0],
        widepay_cobrancas: widePayTotal,
        comparacao_mensal: comparacao,
      });
    } catch (err: any) {
      console.error('Erro no diagnóstico:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // GET /api/financial/sync/investigar — comparação DETALHADA
  // Mostra CADA cobrança recebida do Wide Pay e se existe no sistema
  // ============================================================
  router.get('/investigar', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Tenant não informado' });

      const creds = await getWidePayCredentials(empresaId);
      if (!creds) return res.status(400).json({ error: 'Wide Pay não configurado' });

      // 1) Buscar TODAS as cobranças do Wide Pay
      const widepay = await getWidePayClient(empresaId);
      if (!widepay) return res.status(400).json({ error: 'Wide Pay client error' });

      const cobResult = await widepay.consultarCobranca();
      const cobData = cobResult?.data || cobResult;
      const cobrancas = cobData?.cobrancas || [];

      // 2) Buscar TODOS os carnês do Wide Pay
      let todasParcelas: any[] = [];
      try {
        const carnesResult = await widePayRequest(
          creds.walletId, creds.walletToken,
          '/recebimentos/carnes/consultar', {}
        );
        const carnesData = carnesResult?.data || carnesResult;
        const carnes = carnesData?.carnes || [];
        for (const carne of carnes) {
          const carneId = carne.id;
          try {
            const detalhe = await widePayRequest(
              creds.walletId, creds.walletToken,
              `/recebimentos/carnes/${carneId}/consultar`, {}
            );
            const detalheData = detalhe?.data || detalhe;
            const parcelas = detalheData?.parcelas || [];
            parcelas.forEach((p: any) => {
              p._carneId = carneId;
              p._origem = 'carne';
            });
            todasParcelas = todasParcelas.concat(parcelas);
          } catch (e) {
            // skip
          }
        }
      } catch (e) {
        // skip carnês
      }

      // 3) Buscar o que temos no banco
      const noBanco = await db.query(
        `SELECT gateway_id, amount, valor_recebido, status,
          TO_CHAR(paid_date, 'YYYY-MM-DD') as paid_date,
          TO_CHAR(due_date, 'YYYY-MM-DD') as due_date,
          customer_name
        FROM faturas WHERE empresa_id = $1`,
        [empresaId]
      );
      const bancoMap = new Map<string, any>();
      noBanco.rows.forEach((r: any) => {
        bancoMap.set(r.gateway_id, r);
      });

      // 4) Comparar cobranças
      const parseVal = (v: any): number => {
        if (v == null) return 0;
        const s = String(v);
        return s.includes(',')
          ? parseFloat(s.replace('R$','').replace(/\./g,'').replace(',','.').trim()) || 0
          : parseFloat(s) || 0;
      };

      const recebidasWidePay: any[] = [];
      const faltandoNoBanco: any[] = [];
      const resumoPorMes: Record<string, { wp_total: number; wp_qtd: number; sys_total: number; sys_qtd: number; faltando: number }> = {};

      // Processar cobranças individuais
      for (const cob of cobrancas) {
        if (cob.status !== 'Recebido' && cob.status !== 'Recebido manualmente' && cob.status !== 'Pago') continue;

        const id = String(cob.id);
        const valor = parseVal(cob.valor);
        const recebido = parseVal(cob.recebido);
        const tarifa = parseVal(cob.tarifa);
        let recDate = cob.recebimento || '';
        if (recDate.includes('/')) {
          const p = recDate.split('/');
          if (p.length === 3) recDate = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        }
        const mes = recDate.length >= 7 ? recDate.substring(0, 7) : 'sem-data';

        const noBancoItem = bancoMap.get(id);

        const item = {
          tipo: 'cobranca',
          id,
          cliente: cob.cliente || '',
          valor,
          recebido,
          tarifa,
          data_recebimento: recDate,
          mes,
          no_banco: !!noBancoItem,
          banco_amount: noBancoItem ? parseFloat(noBancoItem.amount) : null,
          banco_valor_recebido: noBancoItem ? parseFloat(noBancoItem.valor_recebido) : null,
          banco_status: noBancoItem ? noBancoItem.status : null,
        };

        recebidasWidePay.push(item);

        if (!noBancoItem) {
          faltandoNoBanco.push(item);
        }

        if (!resumoPorMes[mes]) resumoPorMes[mes] = { wp_total: 0, wp_qtd: 0, sys_total: 0, sys_qtd: 0, faltando: 0 };
        resumoPorMes[mes].wp_total += recebido;
        resumoPorMes[mes].wp_qtd++;
        if (noBancoItem) {
          const sysVal = parseFloat(noBancoItem.valor_recebido) > 0 ? parseFloat(noBancoItem.valor_recebido) : parseFloat(noBancoItem.amount);
          resumoPorMes[mes].sys_total += sysVal;
          resumoPorMes[mes].sys_qtd++;
        } else {
          resumoPorMes[mes].faltando++;
        }
      }

      // Processar parcelas de carnês
      for (const p of todasParcelas) {
        if (p.status !== 'Recebido' && p.status !== 'Recebido manualmente' && p.status !== 'Pago') continue;

        const id = String(p.id);
        const valor = parseVal(p.valor);
        const recebido = parseVal(p.recebido);
        const tarifa = parseVal(p.tarifa);
        let recDate = p.recebimento || '';
        if (recDate.includes('/')) {
          const pp = recDate.split('/');
          if (pp.length === 3) recDate = `${pp[2]}-${pp[1].padStart(2,'0')}-${pp[0].padStart(2,'0')}`;
        }
        const mes = recDate.length >= 7 ? recDate.substring(0, 7) : 'sem-data';

        const noBancoItem = bancoMap.get(id);

        const item = {
          tipo: 'carne',
          id,
          carneId: p._carneId,
          cliente: p.cliente || '',
          valor,
          recebido,
          tarifa,
          data_recebimento: recDate,
          mes,
          no_banco: !!noBancoItem,
          banco_amount: noBancoItem ? parseFloat(noBancoItem.amount) : null,
          banco_valor_recebido: noBancoItem ? parseFloat(noBancoItem.valor_recebido) : null,
          banco_status: noBancoItem ? noBancoItem.status : null,
        };

        recebidasWidePay.push(item);

        if (!noBancoItem) {
          faltandoNoBanco.push(item);
        }

        if (!resumoPorMes[mes]) resumoPorMes[mes] = { wp_total: 0, wp_qtd: 0, sys_total: 0, sys_qtd: 0, faltando: 0 };
        resumoPorMes[mes].wp_total += recebido;
        resumoPorMes[mes].wp_qtd++;
        if (noBancoItem) {
          const sysVal = parseFloat(noBancoItem.valor_recebido) > 0 ? parseFloat(noBancoItem.valor_recebido) : parseFloat(noBancoItem.amount);
          resumoPorMes[mes].sys_total += sysVal;
          resumoPorMes[mes].sys_qtd++;
        } else {
          resumoPorMes[mes].faltando++;
        }
      }

      // Formatar resumo
      const resumoFormatado = Object.entries(resumoPorMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, d]) => ({
          mes,
          widepay_recebido: Math.round(d.wp_total * 100) / 100,
          widepay_qtd: d.wp_qtd,
          sistema_recebido: Math.round(d.sys_total * 100) / 100,
          sistema_qtd: d.sys_qtd,
          faltando_no_banco: d.faltando,
          diferenca: Math.round((d.wp_total - d.sys_total) * 100) / 100,
        }));

      res.json({
        total_recebidas_widepay: recebidasWidePay.length,
        total_faltando_no_banco: faltandoNoBanco.length,
        resumo_por_mes: resumoFormatado,
        faltando_no_banco: faltandoNoBanco,
        todas_recebidas: recebidasWidePay,
      });
    } catch (err: any) {
      console.error('Erro ao investigar:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}