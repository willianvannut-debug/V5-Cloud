'use client';

// ============================================================
// V5 Fibra - Página: Fluxo de Caixa
// Menu: Financeiro > Fluxo de Caixa
// Estilo: V5 Dark Theme (Tailwind + Card components)
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  Calendar,
  Filter,
  BarChart3,
  Activity,
  Wallet,
  Zap,
  Building,
  CreditCard,
  FileText,
  Edit3,
  Receipt,
} from 'lucide-react';
import { api } from '@/lib/api';

// --- Tipos ---
interface Summary {
  entradas: { total: number; count: number };
  saidas: { total: number; count: number };
  saldo: number;
  pend_receita: { total: number; count: number };
  pend_despesa: { total: number; count: number };
}

interface ChartDay {
  dia: number;
  entradas: number;
  saidas: number;
  saldo_acumulado: number;
}

interface Transaction {
  id: string;
  type: 'entrada' | 'saida';
  description: string;
  detail: string;
  amount: number;
  date: string;
  method: string;
  category: string;
}

interface MonthlyData {
  mes: number;
  entradas: number;
  saidas: number;
  saldo: number;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const CATEGORY_LABELS: Record<string, string> = {
  receita: 'Receita',
  fornecedor: 'Fornecedor Internet',
  aluguel: 'Aluguel',
  salario: 'Salários',
  energia: 'Energia Elétrica',
  equipamento: 'Equipamentos',
  imposto: 'Impostos / Taxas',
  manutencao: 'Manutenção',
  veiculo: 'Veículo / Combustível',
  outros: 'Outros',
};

const CATEGORY_ICONS: Record<string, any> = {
  receita: DollarSign,
  fornecedor: Zap,
  aluguel: Building,
  salario: Wallet,
  energia: Zap,
  equipamento: CreditCard,
  imposto: FileText,
  manutencao: Edit3,
  veiculo: TrendingDown,
  outros: Receipt,
};

export default function FluxoCaixaPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [chartData, setChartData] = useState<ChartDay[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState<'diario' | 'mensal'>('diario');

  // Carregar dados (cada chamada independente para não quebrar tudo)
  const loadData = async () => {
    try {
      setLoading(true);
      const params = `month=${filterMonth}&year=${filterYear}`;

      // Summary
      try {
        const summaryRes = await api.get<any>(`/financial/cashflow/summary?${params}`);
        const rawS = summaryRes.data || summaryRes;
        const sData = rawS?.entradas ? rawS : rawS?.data?.entradas ? rawS.data : null;
        if (sData) setSummary(sData);
      } catch (e) { console.error('Erro summary:', e); }

      // Chart
      try {
        const chartRes = await api.get<any>(`/financial/cashflow/chart?${params}`);
        const rawC = chartRes.data || chartRes;
        const cData = rawC?.days ? rawC.days : rawC?.data?.days ? rawC.data.days : [];
        setChartData(Array.isArray(cData) ? cData : []);
      } catch (e) { console.error('Erro chart:', e); }

      // Transactions
      try {
        const transRes = await api.get<any>(`/financial/cashflow/transactions?${params}&type=${filterType}`);
        const rawT = transRes.data || transRes;
        const tData = rawT?.transactions ? rawT.transactions : rawT?.data?.transactions ? rawT.data.transactions : [];
        setTransactions(Array.isArray(tData) ? tData : []);
      } catch (e) { console.error('Erro transactions:', e); }

      // Monthly
      try {
        const monthlyRes = await api.get<any>(`/financial/cashflow/monthly?year=${filterYear}`);
        const rawM = monthlyRes.data || monthlyRes;
        const mData = rawM?.months ? rawM.months : rawM?.data?.months ? rawM.data.months : [];
        setMonthlyData(Array.isArray(mData) ? mData : []);
      } catch (e) { console.error('Erro monthly:', e); }

    } catch (err) {
      console.error('Erro ao carregar fluxo de caixa:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterMonth, filterYear, filterType]);

  // Formatação
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Encontrar o valor máximo para escala do gráfico
  const chartMax = useMemo(() => {
    if (chartData.length === 0) return 1;
    let max = 0;
    chartData.forEach(d => {
      if (d.entradas > max) max = d.entradas;
      if (d.saidas > max) max = d.saidas;
    });
    return max || 1;
  }, [chartData]);

  // Máximo do gráfico mensal
  const monthlyMax = useMemo(() => {
    if (monthlyData.length === 0) return 1;
    let max = 0;
    monthlyData.forEach(d => {
      if (d.entradas > max) max = d.entradas;
      if (d.saidas > max) max = d.saidas;
    });
    return max || 1;
  }, [monthlyData]);

  // Saldo acumulado máximo/mínimo
  const saldoRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 1 };
    const vals = chartData.map(d => d.saldo_acumulado);
    return { min: Math.min(...vals, 0), max: Math.max(...vals, 1) };
  }, [chartData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Fluxo de Caixa
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-1">
            Visão geral das entradas e saídas financeiras
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-zinc-500" />

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={String(i + 1)}>{m}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">Todos</option>
              <option value="entrada">Só Entradas</option>
              <option value="saida">Só Saídas</option>
            </select>

            <div className="ml-auto flex items-center gap-1 bg-zinc-800/30 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('diario')}
                className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${viewMode === 'diario' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Diário
              </button>
              <button
                onClick={() => setViewMode('mensal')}
                className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${viewMode === 'mensal' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Mensal
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Entradas */}
          <Card className="bg-zinc-900/40 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Entradas</span>
              </div>
              <p className="text-lg font-mono font-bold text-emerald-400">{formatCurrency(summary.entradas.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600 mt-1">{summary.entradas.count} recebimento{summary.entradas.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          {/* Saídas */}
          <Card className="bg-zinc-900/40 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <ArrowDownCircle className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Saídas</span>
              </div>
              <p className="text-lg font-mono font-bold text-red-400">{formatCurrency(summary.saidas.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600 mt-1">{summary.saidas.count} pagamento{summary.saidas.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          {/* Saldo */}
          <Card className={`border-zinc-800 ${summary.saldo >= 0 ? 'bg-emerald-950/20' : 'bg-red-950/20'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${summary.saldo >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <DollarSign className={`w-4 h-4 ${summary.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">Saldo</span>
              </div>
              <p className={`text-lg font-mono font-bold ${summary.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(summary.saldo)}
              </p>
              <p className="text-[10px] font-mono text-zinc-600 mt-1">
                {summary.saldo >= 0 ? 'Positivo' : 'Negativo'}
              </p>
            </CardContent>
          </Card>

          {/* A Receber */}
          <Card className="bg-zinc-900/40 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">A Receber</span>
              </div>
              <p className="text-lg font-mono font-bold text-blue-400">{formatCurrency(summary.pend_receita.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600 mt-1">{summary.pend_receita.count} fatura{summary.pend_receita.count !== 1 ? 's' : ''} pendente{summary.pend_receita.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          {/* A Pagar */}
          <Card className="bg-zinc-900/40 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">A Pagar</span>
              </div>
              <p className="text-lg font-mono font-bold text-orange-400">{formatCurrency(summary.pend_despesa.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600 mt-1">{summary.pend_despesa.count} conta{summary.pend_despesa.count !== 1 ? 's' : ''} pendente{summary.pend_despesa.count !== 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono font-bold text-zinc-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            {viewMode === 'diario'
              ? `Fluxo Diário — ${MONTHS[parseInt(filterMonth) - 1]} ${filterYear}`
              : `Evolução Mensal — ${filterYear}`
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {viewMode === 'diario' ? (
            /* ===== GRÁFICO DIÁRIO ===== */
            <div className="space-y-3">
              {/* Legenda */}
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-zinc-400">Entradas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span className="text-zinc-400">Saídas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-400/30" />
                  <span className="text-zinc-400">Saldo acumulado</span>
                </div>
              </div>

              {/* Barras */}
              <div className="relative h-52 flex items-end gap-[2px]">
                {chartData.map((d) => {
                  const entradaH = chartMax > 0 ? (d.entradas / chartMax) * 100 : 0;
                  const saidaH = chartMax > 0 ? (d.saidas / chartMax) * 100 : 0;

                  return (
                    <div key={d.dia} className="flex-1 flex flex-col items-center gap-0.5 group relative" style={{ minWidth: 0 }}>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap left-1/2 -translate-x-1/2">
                        <p className="text-zinc-300 font-bold mb-1">Dia {d.dia}</p>
                        <p className="text-emerald-400">↑ {formatCurrency(d.entradas)}</p>
                        <p className="text-red-400">↓ {formatCurrency(d.saidas)}</p>
                        <p className={d.saldo_acumulado >= 0 ? 'text-blue-400' : 'text-orange-400'}>
                          Σ {formatCurrency(d.saldo_acumulado)}
                        </p>
                      </div>

                      {/* Barras */}
                      <div className="w-full flex gap-[1px] items-end" style={{ height: '180px' }}>
                        <div
                          className="flex-1 bg-emerald-500/70 rounded-t-sm transition-all hover:bg-emerald-500"
                          style={{ height: `${Math.max(entradaH, 1)}%` }}
                        />
                        <div
                          className="flex-1 bg-red-500/70 rounded-t-sm transition-all hover:bg-red-500"
                          style={{ height: `${Math.max(saidaH, 1)}%` }}
                        />
                      </div>

                      {/* Label dia */}
                      <span className="text-[7px] font-mono text-zinc-600">{d.dia}</span>
                    </div>
                  );
                })}
              </div>

              {/* Linha de saldo acumulado */}
              <div className="relative h-16 mt-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-px bg-zinc-800" />
                </div>
                <svg className="w-full h-full" viewBox={`0 0 ${chartData.length * 10} 60`} preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="rgb(96, 165, 250)"
                    strokeWidth="1.5"
                    points={chartData.map((d, i) => {
                      const range = saldoRange.max - saldoRange.min || 1;
                      const y = 55 - ((d.saldo_acumulado - saldoRange.min) / range) * 50;
                      return `${i * 10 + 5},${y}`;
                    }).join(' ')}
                  />
                </svg>
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-zinc-600">Saldo acumulado</span>
                  <span className={`font-bold ${(chartData[chartData.length - 1]?.saldo_acumulado || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {formatCurrency(chartData[chartData.length - 1]?.saldo_acumulado || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ===== GRÁFICO MENSAL ===== */
            <div className="space-y-3">
              {/* Legenda */}
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-zinc-400">Entradas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span className="text-zinc-400">Saídas</span>
                </div>
              </div>

              {/* Barras mensais */}
              <div className="space-y-2">
                {monthlyData.map((d) => {
                  const entradaW = monthlyMax > 0 ? (d.entradas / monthlyMax) * 100 : 0;
                  const saidaW = monthlyMax > 0 ? (d.saidas / monthlyMax) * 100 : 0;
                  const saldo = d.entradas - d.saidas;

                  return (
                    <div key={d.mes} className="group">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-zinc-500 w-8">{MONTHS_SHORT[d.mes - 1]}</span>
                        <div className="flex-1 space-y-1">
                          {/* Barra entrada */}
                          <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500/70 rounded-full transition-all"
                              style={{ width: `${Math.max(entradaW, 0.5)}%` }}
                            />
                          </div>
                          {/* Barra saída */}
                          <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500/70 rounded-full transition-all"
                              style={{ width: `${Math.max(saidaW, 0.5)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <span className={`text-[10px] font-mono font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
                          </span>
                        </div>
                      </div>
                      {/* Tooltip hover */}
                      <div className="hidden group-hover:flex items-center gap-4 ml-11 mt-1 text-[9px] font-mono">
                        <span className="text-emerald-400">↑ {formatCurrency(d.entradas)}</span>
                        <span className="text-red-400">↓ {formatCurrency(d.saidas)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Movimentações */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono font-bold text-zinc-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              Movimentações — {MONTHS[parseInt(filterMonth) - 1]}
            </CardTitle>
            <span className="text-[10px] font-mono text-zinc-500">{transactions.length} registro{transactions.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
              <p className="text-xs font-mono text-zinc-600">Nenhuma movimentação encontrada</p>
              <p className="text-[10px] font-mono text-zinc-700 mt-1">Registre pagamentos em Contas a Pagar ou receba faturas</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => {
                const isEntrada = t.type === 'entrada';
                const catLabel = CATEGORY_LABELS[t.category] || t.category;
                const CatIcon = CATEGORY_ICONS[t.category] || Receipt;
                const methodLabel = t.method === 'PIX' || t.method === 'pix' ? 'PIX'
                  : t.method === 'BOLETO' || t.method === 'boleto' ? 'Boleto'
                  : t.method === 'CREDIT_CARD' || t.method === 'cartao' ? 'Cartão'
                  : t.method === 'transferencia' ? 'Transferência'
                  : t.method === 'dinheiro' ? 'Dinheiro'
                  : t.method === 'debito_auto' ? 'Débito Auto'
                  : t.method || '-';

                return (
                  <div
                    key={`${t.type}-${t.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors group"
                  >
                    {/* Ícone tipo */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isEntrada ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      {isEntrada
                        ? <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                        : <ArrowDownCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>

                    {/* Descrição */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-zinc-200 truncate">{t.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.detail && <span className="text-[10px] font-mono text-zinc-500 truncate">{t.detail}</span>}
                        <span className="text-[9px] font-mono text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">{catLabel}</span>
                      </div>
                    </div>

                    {/* Método */}
                    <div className="hidden sm:block">
                      <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/30 px-2 py-0.5 rounded">{methodLabel}</span>
                    </div>

                    {/* Data */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-mono font-bold ${isEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isEntrada ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600">{formatShortDate(t.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo do período */}
      {summary && transactions.length > 0 && (
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Entradas</span>
                  <p className="text-sm font-mono font-bold text-emerald-400">+{formatCurrency(summary.entradas.total)}</p>
                </div>
                <div className="text-zinc-700">—</div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Saídas</span>
                  <p className="text-sm font-mono font-bold text-red-400">-{formatCurrency(summary.saidas.total)}</p>
                </div>
                <div className="text-zinc-700">=</div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Resultado</span>
                  <p className={`text-sm font-mono font-bold ${summary.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(summary.saldo)}
                  </p>
                </div>
              </div>
              {(summary.pend_receita.total > 0 || summary.pend_despesa.total > 0) && (
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  {summary.pend_receita.total > 0 && (
                    <span className="text-blue-400">Previsto receber: {formatCurrency(summary.pend_receita.total)}</span>
                  )}
                  {summary.pend_despesa.total > 0 && (
                    <span className="text-orange-400">Previsto pagar: {formatCurrency(summary.pend_despesa.total)}</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}