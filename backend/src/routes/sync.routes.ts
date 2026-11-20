// ============================================================
// V5 Fibra - Rotas: Sincronização Wide Pay → Sistema
// Puxa TODAS as cobranças E carnês do Wide Pay
// Sincroniza com a tabela FATURAS
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import {
  getWidePayCredentials,
  getWidePayClient,
  widePayRequest,
  syncWidePayForEmpresa,
} from '../services/widepay-sync.service';

export function syncRoutes(db: Pool): Router {
  const router = Router();

  // ============================================================
  // POST /api/financial/sync/widepay — sincronizar TUDO
  // Puxa cobranças + carnês do Wide Pay
  // (lógica compartilhada com o job automático em sync.job.ts)
  // ============================================================
  router.post('/widepay', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) {
        return res.status(400).json({ error: 'x-tenant-id é obrigatório' });
      }

      const resultado = await syncWidePayForEmpresa(db, empresaId);
      res.json(resultado);
    } catch (err: any) {
      console.error('[Sync] Erro na sincronização:', err);
      const status = /não configurado/i.test(err.message) ? 400 : 500;
      res.status(status).json({ error: err.message || 'Erro ao sincronizar' });
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
      const widepay = await getWidePayClient(db, empresaId);
      if (!widepay) {
        return res.status(400).json({ error: 'Wide Pay não configurado' });
      }

      const result = await widepay.consultarCobranca();

      const creds = await getWidePayCredentials(db, empresaId);
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
  // GET /api/financial/sync/investigar — comparação DETALHADA
  // Mostra CADA cobrança recebida do Wide Pay e se existe no sistema
  // ============================================================
  router.get('/investigar', async (req: Request, res: Response) => {
    try {
      const empresaId = req.empresaId!;
      if (!empresaId) return res.status(400).json({ error: 'Tenant não informado' });

      const creds = await getWidePayCredentials(db, empresaId);
      if (!creds) return res.status(400).json({ error: 'Wide Pay não configurado' });

      const widepay = await getWidePayClient(db, empresaId);
      if (!widepay) return res.status(400).json({ error: 'Wide Pay client error' });

      const cobResult = await widepay.consultarCobranca();
      const cobData = cobResult?.data || cobResult;
      const cobrancas = cobData?.cobrancas || [];

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
