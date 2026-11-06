// ============================================================
// V5 Fibra - Dashboard Routes (Visão Geral)
// backend/src/routes/dashboard.routes.ts
// ============================================================

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function dashboardRoutes(db: Pool): Router {
  const router = Router();

  // ============================================================
  // GET /api/dashboard/overview — dados completos do dashboard
  // ============================================================
  router.get('/overview', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      // Último dia do mês: primeiro dia do próximo mês
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const firstDayNextMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      const today = now.toISOString().split('T')[0];

      // ---- CLIENTES ----
      const clientesRes = await db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'ativo') as ativos,
          COUNT(*) FILTER (WHERE status = 'bloqueado') as bloqueados,
          COUNT(*) FILTER (WHERE status = 'cancelado') as cancelados,
          COUNT(*) as total
        FROM clientes WHERE empresa_id = $1`,
        [tenantId]
      );
      const clientes = clientesRes.rows[0];

      // ---- LEADS ----
      const leadsRes = await db.query(
        `SELECT
          COUNT(*) as total_mes,
          COUNT(*) FILTER (WHERE status = 'convertido') as convertidos_mes,
          COUNT(*) FILTER (WHERE status = 'pendente' OR status = 'em_atendimento') as em_atendimento
        FROM leads WHERE empresa_id = $1 AND created_at >= $2`,
        [tenantId, firstDayOfMonth]
      );
      const leads = leadsRes.rows[0];

      // Total de leads geral
      const leadsTotal = await db.query(
        `SELECT COUNT(*) as total FROM leads WHERE empresa_id = $1`,
        [tenantId]
      );

      // ---- FINANCEIRO DO MÊS (apenas mês atual, excluindo CANCELADAS) ----
      const financeiroRes = await db.query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status != 'CANCELLED'), 0) as faturamento_mes,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')), 0) as recebido_mes,
          COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) as pendente_mes,
          COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0) as inadimplencia_mes,
          COUNT(*) FILTER (WHERE status != 'CANCELLED') as total_faturas,
          COUNT(*) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')) as faturas_pagas,
          COUNT(*) FILTER (WHERE status = 'PENDING') as faturas_pendentes,
          COUNT(*) FILTER (WHERE status = 'OVERDUE') as faturas_vencidas
        FROM faturas WHERE empresa_id = $1 AND due_date >= $2 AND due_date < $3`,
        [tenantId, firstDayOfMonth, firstDayNextMonth]
      );
      const financeiro = financeiroRes.rows[0];

      // ---- CONTRATOS ATIVOS ----
      const contratosRes = await db.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'active') as ativos,
          COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as receita_mensal
        FROM contracts WHERE tenant_id = $1`,
        [tenantId]
      );
      const contratos = contratosRes.rows[0];

      // ---- FATURAMENTO ÚLTIMOS 6 MESES (excluindo CANCELADAS) ----
      const faturamento6meses = await db.query(
        `SELECT
          TO_CHAR(due_date, 'YYYY-MM') as mes,
          TO_CHAR(due_date, 'Mon/YY') as mes_label,
          COALESCE(SUM(amount) FILTER (WHERE status != 'CANCELLED'), 0)::numeric as total,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')), 0)::numeric as recebido,
          COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0)::numeric as vencido
        FROM faturas
        WHERE empresa_id = $1
          AND due_date >= (CURRENT_DATE - INTERVAL '6 months')
          AND status != 'CANCELLED'
        GROUP BY TO_CHAR(due_date, 'YYYY-MM'), TO_CHAR(due_date, 'Mon/YY')
        ORDER BY mes ASC`,
        [tenantId]
      );

      // LOG para debug — aparece no terminal quando o dashboard carrega
      console.log('=== GRAFICO FATURAMENTO (dados enviados ao frontend) ===');
      const graficoConvertido = faturamento6meses.rows.map((row: any) => {
        const item = {
          mes: row.mes,
          mes_label: row.mes_label,
          total: parseFloat(row.total) || 0,
          recebido: parseFloat(row.recebido) || 0,
          vencido: parseFloat(row.vencido) || 0,
        };
        console.log(`  ${item.mes_label}: total=${item.total}, recebido=${item.recebido}, vencido=${item.vencido}`);
        return item;
      });
      console.log(`  Total de meses: ${graficoConvertido.length}`);
      console.log('=======================================================');

      // ---- FATURAS PENDENTES/VENCIDAS (últimas 10) ----
      const faturasPendentes = await db.query(
        `SELECT
          f.id,
          COALESCE(f.customer_name, c.nome, 'Cliente') as customer_name,
          COALESCE(f.customer_document, c.cpf, c.cnpj, '') as customer_document,
          f.amount,
          f.due_date,
          f.status,
          f.billing_type
        FROM faturas f
        LEFT JOIN clientes c ON c.id = f.cliente_id
        WHERE f.empresa_id = $1 AND f.status IN ('PENDING', 'OVERDUE')
        ORDER BY f.due_date ASC
        LIMIT 10`,
        [tenantId]
      );

      // ---- ÚLTIMOS LEADS (últimos 10) ----
      const ultimosLeads = await db.query(
        `SELECT id, nome, whatsapp, plano_escolhido, status, created_at
        FROM leads
        WHERE empresa_id = $1
        ORDER BY created_at DESC
        LIMIT 10`,
        [tenantId]
      );

      // ---- FATURAMENTO HOJE ----
      const faturamentoHoje = await db.query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')), 0) as recebido_hoje,
          COUNT(*) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')) as qtd_recebido_hoje
        FROM faturas
        WHERE empresa_id = $1 AND paid_date = $2`,
        [tenantId, today]
      );

      // ---- TICKETS ABERTOS ----
      let ticketsAbertos = 0;
      try {
        const ticketsRes = await db.query(
          `SELECT COUNT(*) as total FROM tickets_ajuda WHERE empresa_id = $1 AND status NOT IN ('fechado', 'resolvido')`,
          [tenantId]
        );
        ticketsAbertos = parseInt(ticketsRes.rows[0].total) || 0;
      } catch (e) {
        // tabela pode não ter empresa_id, ignorar
      }

      res.json({
        clientes: {
          ativos: parseInt(clientes.ativos) || 0,
          bloqueados: parseInt(clientes.bloqueados) || 0,
          cancelados: parseInt(clientes.cancelados) || 0,
          total: parseInt(clientes.total) || 0,
        },
        leads: {
          totalMes: parseInt(leads.total_mes) || 0,
          convertidosMes: parseInt(leads.convertidos_mes) || 0,
          emAtendimento: parseInt(leads.em_atendimento) || 0,
          totalGeral: parseInt(leadsTotal.rows[0].total) || 0,
        },
        financeiro: {
          faturamentoMes: parseFloat(financeiro.faturamento_mes) || 0,
          recebidoMes: parseFloat(financeiro.recebido_mes) || 0,
          pendenteMes: parseFloat(financeiro.pendente_mes) || 0,
          inadimplenciaMes: parseFloat(financeiro.inadimplencia_mes) || 0,
          totalFaturas: parseInt(financeiro.total_faturas) || 0,
          faturasPagas: parseInt(financeiro.faturas_pagas) || 0,
          faturasPendentes: parseInt(financeiro.faturas_pendentes) || 0,
          faturasVencidas: parseInt(financeiro.faturas_vencidas) || 0,
        },
        contratos: {
          ativos: parseInt(contratos.ativos) || 0,
          receitaMensal: parseFloat(contratos.receita_mensal) || 0,
        },
        recebidoHoje: {
          valor: parseFloat(faturamentoHoje.rows[0].recebido_hoje) || 0,
          quantidade: parseInt(faturamentoHoje.rows[0].qtd_recebido_hoje) || 0,
        },
        ticketsAbertos,
        graficoFaturamento: graficoConvertido,
        faturasPendentes: faturasPendentes.rows,
        ultimosLeads: ultimosLeads.rows,
      });
    } catch (err: any) {
      console.error('Erro no dashboard:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ============================================================
  // GET /api/dashboard/financial-panel — Painel Financeiro completo
  // Retorna TUDO pré-calculado em SQL (sem cálculo no frontend)
  // ============================================================
  router.get('/financial-panel', async (req: Request, res: Response) => {
    try {
      const tenantId = req.empresaId!;
      if (!tenantId) return res.status(400).json({ error: 'Tenant não informado' });

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const firstDayNextMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      // ---- RESUMO GERAL (todas as faturas, excluindo canceladas nos totais principais) ----
      const resumoRes = await db.query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) as total_pending,
          COUNT(*) FILTER (WHERE status = 'PENDING') as count_pending,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')), 0) as total_received,
          COUNT(*) FILTER (WHERE status IN ('RECEIVED', 'CONFIRMED')) as count_received,
          COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0) as total_overdue,
          COUNT(*) FILTER (WHERE status = 'OVERDUE') as count_overdue,
          COALESCE(SUM(amount) FILTER (WHERE status = 'CANCELLED'), 0) as total_cancelled,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as count_cancelled,
          COALESCE(SUM(amount) FILTER (WHERE status != 'CANCELLED'), 0) as total_geral,
          COUNT(*) FILTER (WHERE status != 'CANCELLED') as count_geral
        FROM faturas WHERE empresa_id = $1`,
        [tenantId]
      );
      const resumo = resumoRes.rows[0];

      // ---- MÊS ATUAL ----
      // Total faturado no mês (por vencimento)
      const mesRes = await db.query(
        `SELECT
          COALESCE(SUM(amount) FILTER (WHERE status != 'CANCELLED'), 0) as total_mes,
          COUNT(*) FILTER (WHERE status != 'CANCELLED') as count_mes
        FROM faturas WHERE empresa_id = $1 AND due_date >= $2 AND due_date < $3`,
        [tenantId, firstDayOfMonth, firstDayNextMonth]
      );
      // Recebido no mês (por data de PAGAMENTO)
      // Mostra o valor que o cliente PAGOU (amount da fatura)
      const recebidoMesRes = await db.query(
        `SELECT
          COALESCE(SUM(amount), 0) as recebido_mes,
          COUNT(*) as count_recebido_mes
        FROM faturas
        WHERE empresa_id = $1
          AND paid_date >= $2 AND paid_date < $3
          AND status IN ('RECEIVED', 'CONFIRMED')`,
        [tenantId, firstDayOfMonth, firstDayNextMonth]
      );
      const mes = mesRes.rows[0];
      const recebidoMesData = recebidoMesRes.rows[0];

      // ---- GRÁFICO ÚLTIMOS 6 MESES ----
      // Query 1: Total faturado por mês (agrupado por VENCIMENTO)
      const faturadoRes = await db.query(
        `SELECT
          TO_CHAR(due_date, 'YYYY-MM') as mes,
          COALESCE(SUM(amount), 0) as total
        FROM faturas
        WHERE empresa_id = $1
          AND due_date >= (CURRENT_DATE - INTERVAL '6 months')
          AND status != 'CANCELLED'
        GROUP BY TO_CHAR(due_date, 'YYYY-MM')
        ORDER BY mes ASC`,
        [tenantId]
      );

      // Query 2: Valor que o cliente PAGOU por mês (agrupado por DATA DE PAGAMENTO)
      // Usa amount = valor original da fatura (o que o cliente pagou)
      const recebidoRes = await db.query(
        `SELECT
          TO_CHAR(paid_date, 'YYYY-MM') as mes,
          COALESCE(SUM(amount), 0) as recebido
        FROM faturas
        WHERE empresa_id = $1
          AND paid_date IS NOT NULL
          AND paid_date >= (CURRENT_DATE - INTERVAL '6 months')
          AND status IN ('RECEIVED', 'CONFIRMED')
        GROUP BY TO_CHAR(paid_date, 'YYYY-MM')
        ORDER BY mes ASC`,
        [tenantId]
      );

      // Montar array dos últimos 6 meses (incluindo meses sem dados = 0)
      const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const faturadoMap: Record<string, number> = {};
      faturadoRes.rows.forEach((row: any) => {
        faturadoMap[row.mes] = parseFloat(row.total) || 0;
      });
      const recebidoMap: Record<string, number> = {};
      recebidoRes.rows.forEach((row: any) => {
        recebidoMap[row.mes] = parseFloat(row.recebido) || 0;
      });

      const grafico: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${mesesNomes[d.getMonth()]}/${d.getFullYear()}`;
        grafico.push({
          mes: key,
          mes_label: label,
          total: faturadoMap[key] || 0,
          recebido: recebidoMap[key] || 0,
        });
      }

      // LOG para debug
      console.log('=== PAINEL FINANCEIRO - GRÁFICO ===');
      grafico.forEach((g: any) => {
        console.log(`  ${g.mes_label}: faturado=${g.total}, recebido(caiu na conta)=${g.recebido}`);
      });
      console.log('====================================');

      // ---- ÚLTIMAS 10 FATURAS (todas, exceto canceladas) ----
      const ultimasRes = await db.query(
        `SELECT
          id, customer_name, customer_document, amount, due_date,
          status, billing_type, boleto_url, invoice_url, description
        FROM faturas
        WHERE empresa_id = $1 AND status != 'CANCELLED'
        ORDER BY due_date DESC
        LIMIT 10`,
        [tenantId]
      );

      res.json({
        totalPending: parseFloat(resumo.total_pending) || 0,
        countPending: parseInt(resumo.count_pending) || 0,
        totalReceived: parseFloat(resumo.total_received) || 0,
        countReceived: parseInt(resumo.count_received) || 0,
        totalOverdue: parseFloat(resumo.total_overdue) || 0,
        countOverdue: parseInt(resumo.count_overdue) || 0,
        totalCancelled: parseFloat(resumo.total_cancelled) || 0,
        countCancelled: parseInt(resumo.count_cancelled) || 0,
        totalGeral: parseFloat(resumo.total_geral) || 0,
        countGeral: parseInt(resumo.count_geral) || 0,
        totalMes: parseFloat(mes.total_mes) || 0,
        countMes: parseInt(mes.count_mes) || 0,
        recebidoMes: parseFloat(recebidoMesData.recebido_mes) || 0,
        countRecebidoMes: parseInt(recebidoMesData.count_recebido_mes) || 0,
        faturamentoMensal: grafico,
        ultimasFaturas: ultimasRes.rows.map((r: any) => ({
          ...r,
          amount: parseFloat(r.amount) || 0,
        })),
      });
    } catch (err: any) {
      console.error('Erro no financial-panel:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}