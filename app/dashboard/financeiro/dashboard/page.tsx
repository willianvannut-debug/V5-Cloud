'use client';

// ============================================================
// V5 Fibra - Página: Dashboard Financeiro
// Menu: Financeiro → Dashboard
//
// Estrutura:
// 1. KPIs no topo (receita, pendente, inadimplência, ticket médio)
// 2. Gráfico de receita mensal (barras)
// 3. Receita por método de pagamento
// 4. Faturas próximas do vencimento (7 dias)
// 5. Top 10 devedores
// ============================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  Users,
  Receipt,
  CreditCard,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useDashboard } from '@/lib/useDashboard';

// ============================================================
// Helpers
// ============================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

const METHOD_LABELS: Record<string, string> = {
  BOLETO: 'Boleto',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão',
};

const methodConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  BOLETO:      { label: 'Boleto',  color: 'text-blue-400',    bg: 'bg-blue-500',    border: 'border-blue-500/30' },
  PIX:         { label: 'PIX',     color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' },
  CREDIT_CARD: { label: 'Cartão',  color: 'text-amber-400',   bg: 'bg-amber-500',   border: 'border-amber-500/30' },
};

const METHOD_SHADOW_COLORS: Record<string, string> = {
  BOLETO: 'rgba(59,130,246,0.4)',
  PIX: 'rgba(16,185,129,0.4)',
  CREDIT_CARD: 'rgba(245,158,11,0.4)',
};

// ============================================================
// Componente: Gráfico de barras (receita mensal)
// ============================================================

function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
        <p className="text-xs text-zinc-500 font-mono">Sem dados de receita ainda.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="flex items-end gap-2 h-48">
      {data.map((item, idx) => {
        const heightPct = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
        return (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="text-[9px] font-mono text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              {formatCurrencyShort(item.revenue)}
            </div>
            <div className="w-full relative" style={{ height: '160px' }}>
              <div
                className="absolute bottom-0 w-full bg-emerald-500/20 border border-emerald-500/30 rounded-t-lg hover:bg-emerald-500/30 transition-all"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              >
                <div
                  className="absolute bottom-0 w-full bg-emerald-500 rounded-t-lg"
                  style={{ height: '3px' }}
                />
              </div>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Componente principal: DashboardPage
// ============================================================

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard();

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" /> Dashboard Financeiro
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5 font-mono">Carregando dados...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardContent className="p-5 space-y-3">
                <div className="h-3 bg-zinc-800 rounded-lg animate-pulse w-2/5" />
                <div className="h-7 bg-zinc-800 rounded-lg animate-pulse w-3/5" />
                <div className="h-3 bg-zinc-800 rounded-lg animate-pulse w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardContent className="p-6">
                <div className="h-48 bg-zinc-800 rounded-lg animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const revenueByMonth = data?.revenueByMonth || [];
  const upcomingInvoices = data?.upcomingInvoices || [];
  const topDebtors = data?.topDebtors || [];
  const revenueByMethod = data?.revenueByMethod || [];

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" /> Dashboard Financeiro
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5 font-mono">
            Visão geral do seu faturamento e inadimplência.
          </p>
        </div>
        <button
          className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border border-zinc-700"
          onClick={refresh}
        >
          <TrendingUp className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* ============ ERROR ============ */}
      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* KPIs — 4 cards com os indicadores principais                 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Receita do mês */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Receita do Mês</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-emerald-400">
              {formatCurrencyShort(kpis?.monthlyRevenue || 0)}
            </p>
            {kpis?.monthlyRevenueChange !== undefined && kpis.monthlyRevenueChange !== 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                {kpis.monthlyRevenueChange > 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                )}
                <span className={`text-[10px] font-mono font-bold ${kpis.monthlyRevenueChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {kpis.monthlyRevenueChange > 0 ? '+' : ''}{Math.abs(kpis.monthlyRevenueChange).toFixed(1)}%
                </span>
                <span className="text-[10px] font-mono text-zinc-500">vs mês anterior</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pendente */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase text-zinc-500">A Receber</span>
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-amber-400">
              {formatCurrencyShort(kpis?.totalPending || 0)}
            </p>
            <p className="text-[10px] font-mono text-zinc-500 mt-1.5">Aguardando pagamento</p>
          </CardContent>
        </Card>

        {/* Inadimplência */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Inadimplência</span>
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-red-400">
              {formatCurrencyShort(kpis?.totalOverdue || 0)}
            </p>
            <p className="text-[10px] font-mono text-zinc-500 mt-1.5">
              {(kpis?.overdueRate || 0).toFixed(1)}% da base
            </p>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Ticket Médio</span>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Receipt className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-mono font-black text-blue-400">
              {formatCurrency(kpis?.averageTicket || 0)}
            </p>
            <p className="text-[10px] font-mono text-zinc-500 mt-1.5">
              {kpis?.activeCustomers || 0} clientes ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* GRÁFICO DE RECEITA + RECEITA POR MÉTODO                      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gráfico de barras — receita dos últimos meses */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur md:col-span-2">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
              </div>
              Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <RevenueChart data={revenueByMonth} />
          </CardContent>
        </Card>

        {/* Receita por método de pagamento */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              Por Método de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {revenueByMethod.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 font-mono">Sem dados ainda.</p>
              </div>
            ) : (
              revenueByMethod.map((method) => {
                const cfg = methodConfig[method.method] || { label: method.method, color: 'text-zinc-400', bg: 'bg-zinc-500', border: 'border-zinc-500/30' };
                const shadowColor = METHOD_SHADOW_COLORS[method.method] || 'rgba(161,161,170,0.4)';
                return (
                  <div key={method.method}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-mono font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs font-mono text-zinc-400">{formatCurrencyShort(method.total)}</span>
                    </div>
                    <div className="w-full bg-black rounded-full h-2.5 overflow-hidden border border-zinc-800">
                      <div
                        className={`h-full ${cfg.bg} rounded-full transition-all`}
                        style={{
                          width: `${method.percentage}%`,
                          boxShadow: `0 0 8px ${shadowColor}`,
                        }}
                      />
                    </div>
                    <p className="text-[9px] font-mono text-zinc-600 mt-1">
                      {method.count} cobranças ({method.percentage.toFixed(1)}%)
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* FATURAS PRÓXIMAS + TOP DEVEDORES                             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Faturas próximas do vencimento (7 dias) */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              Vencendo nos próximos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {upcomingInvoices.length === 0 ? (
              <div className="text-center py-10">
                <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 font-mono">Nenhuma fatura vencendo nos próximos 7 dias.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-5">Cliente</th>
                    <th className="text-left text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-3">Tipo</th>
                    <th className="text-right text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-3">Valor</th>
                    <th className="text-left text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-3">Venc.</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingInvoices.slice(0, 10).map((inv) => {
                    const cfg = methodConfig[inv.billing_type];
                    return (
                      <tr key={inv.id} className="border-b border-zinc-900/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 px-5 text-xs text-white font-mono">{inv.customer_name}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-mono font-bold ${cfg?.color || 'text-zinc-400'}`}>
                            {cfg?.label || inv.billing_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-white font-mono font-bold">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-zinc-400 font-mono">{formatDate(inv.due_date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Top Devedores */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              Top Devedores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topDebtors.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 font-mono">Nenhum cliente inadimplente.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-5">Cliente</th>
                    <th className="text-right text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-3">Valor</th>
                    <th className="text-right text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-3">Qtd</th>
                    <th className="text-left text-[10px] font-mono uppercase text-zinc-500 py-2.5 px-3">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {topDebtors.map((debtor) => (
                    <tr key={debtor.customer_id} className="border-b border-zinc-900/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-5 text-xs text-white font-mono">{debtor.customer_name}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-red-400 font-mono font-bold">
                        {formatCurrency(debtor.total_overdue)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-mono font-bold text-red-400">
                          {debtor.overdue_count}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-zinc-400 font-mono">
                        {formatDate(debtor.oldest_due_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}