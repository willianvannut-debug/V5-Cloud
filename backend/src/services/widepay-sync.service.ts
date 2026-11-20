// ============================================================
// V5 Fibra - Serviço de Sincronização Wide Pay → Sistema
// Extraído de sync.routes.ts para ser reutilizável também
// pelo job automático (cron) além da rota manual.
// ============================================================

import { Pool } from 'pg';
import { WidePayClient } from './widepay.client';

export interface SyncResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  carnes: { carnesEncontrados: number; parcelasProcessadas: number };
  errorDetails?: string[];
  message: string;
}

// Helper: buscar credenciais do Wide Pay no banco
export async function getWidePayCredentials(
  db: Pool,
  empresaId: string
): Promise<{ walletId: string; walletToken: string } | null> {
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
export async function getWidePayClient(db: Pool, empresaId: string): Promise<WidePayClient | null> {
  const creds = await getWidePayCredentials(db, empresaId);
  if (!creds) return null;
  return new WidePayClient(creds);
}

// Helper: chamada direta à API do Wide Pay (para endpoints que o client não tem)
export async function widePayRequest(
  walletId: string,
  walletToken: string,
  endpoint: string,
  data: Record<string, string> = {}
): Promise<any> {
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
// syncWidePayForEmpresa — sincroniza TUDO (cobranças + carnês)
// de uma empresa específica com a tabela FATURAS.
// Usado pela rota manual (POST /api/financial/sync/widepay)
// e pelo job automático (WidePaySyncJob).
// ============================================================
export async function syncWidePayForEmpresa(db: Pool, empresaId: string): Promise<SyncResult> {
  const creds = await getWidePayCredentials(db, empresaId);
  if (!creds) {
    throw new Error('Wide Pay não configurado. Vá em Gateway e configure suas credenciais.');
  }

  const widepay = new WidePayClient(creds);

  console.log(`[Sync] (${empresaId}) Iniciando sincronização COMPLETA com Wide Pay (cobranças + carnês)...`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errorCount = 0;
  const errorDetails: string[] = [];
  const processedIds = new Set<number>();

  // ============================================================
  // PARTE 1: COBRANÇAS
  // ============================================================
  const latestResult = await widepay.consultarCobranca();
  const latestCobrancas = latestResult.cobrancas || [];

  for (const cob of latestCobrancas) {
    const result = await processCobranca(cob, empresaId, db, 'cobranca');
    processedIds.add(parseInt(cob.id));
    if (result === 'inserted') inserted++;
    else if (result === 'updated') updated++;
    else if (result === 'skipped') skipped++;
    else { errorCount++; errorDetails.push(`Cobrança #${cob.id}`); }
  }

  let maxId = 0;
  let minIdFromLatest = 999999999;
  for (const cob of latestCobrancas) {
    const cobId = parseInt(cob.id);
    if (cobId > maxId) maxId = cobId;
    if (cobId < minIdFromLatest) minIdFromLatest = cobId;
  }

  const BATCH_SIZE = 50;
  let emptyBatches = 0;
  const MAX_EMPTY_BATCHES = 5;

  let currentMaxId = minIdFromLatest - 1;
  if (currentMaxId > 0) {
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

      if (foundInBatch === 0) emptyBatches++;
      else emptyBatches = 0;
    }
  }

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

  // ============================================================
  // PARTE 2: CARNÊS
  // ============================================================
  let carnesFound = 0;
  let parcelasFound = 0;

  async function processarCarnes(carnes: any[]) {
    for (const carne of carnes) {
      carnesFound++;
      const carneId = String(carne.id);
      const parcelas = carne.cobrancas || [];
      if (parcelas.length === 0) continue;

      for (const parcela of parcelas) {
        const parcelaId = parseInt(parcela.id);
        if (processedIds.has(parcelaId)) {
          skipped++;
          continue;
        }

        parcelasFound++;

        const cobEnriquecida: any = {
          ...parcela,
          cliente: parcela.cliente || carne.cliente || 'Cliente Wide Pay',
          cpf: parcela.cpf || carne.cpf || '',
          cnpj: parcela.cnpj || carne.cnpj || '',
          email: parcela.email || carne.email || '',
          telefone: parcela.telefone || carne.telefone || '',
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
    const carnesResult = await widePayRequest(
      creds.walletId, creds.walletToken,
      '/recebimentos/carnes/consultar',
      {}
    );

    const carnes = carnesResult.carnes || [];

    if (carnes.length > 0) {
      await processarCarnes(carnes);

      let maxCarneId = 0;
      let minCarneId = 999999999;
      for (const c of carnes) {
        const cid = parseInt(c.id);
        if (cid > maxCarneId) maxCarneId = cid;
        if (cid < minCarneId) minCarneId = cid;
      }

      const processedCarneIds = new Set(carnes.map((c: any) => parseInt(c.id)));

      for (let id = minCarneId - 1; id >= Math.max(1, minCarneId - 50); id--) {
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
        } catch (e) { /* carnê não existe */ }
      }

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
    console.error(`[Sync] (${empresaId}) Erro ao buscar carnês:`, carnesErr.message);
    errorDetails.push(`Carnês: ${carnesErr.message}`);
  }

  const totalProcessed = inserted + updated + skipped + errorCount;
  console.log(`[Sync] (${empresaId}) Concluído: ${inserted} novas, ${updated} atualizadas, ${skipped} sem alteração, ${errorCount} erros. Carnês: ${carnesFound}, parcelas: ${parcelasFound}.`);

  return {
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
  };
}
