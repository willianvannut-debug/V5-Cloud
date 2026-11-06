'use client';

// ============================================================
// V5 Fibra - Pagina: Painel Financeiro
// Menu: Financeiro -> Painel Financeiro
// Estilo: V5 Dark Theme (Tailwind + Card components)
// Arquivo: app/dashboard/financeiro/page.tsx
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  FileText,
  RefreshCw,
  Loader2,
  Eye,
  ArrowUpRight,
  Calendar,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { api } from '@/lib/api';

// --- Helpers ---
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatDate = (d: string) => {
  if (!d) return '--';
  const dateStr = typeof d === 'string' ? d.substring(0, 10) : '';
  if (!dateStr || dateStr.length < 10) return '--';
  const [y, m, day] = dateStr.split('-');
  return `${day}/${m}/${y}`;
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:    { label: 'Pendente',   color: 'text-yellow-400',  bg: 'bg-yellow-400/10', icon: <Clock className="w-3 h-3" /> },
  RECEIVED:   { label: 'Paga',       color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <CheckCircle2 className="w-3 h-3" /> },
  CONFIRMED:  { label: 'Confirmada', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <CheckCircle2 className="w-3 h-3" /> },
  OVERDUE:    { label: 'Vencida',    color: 'text-red-400',     bg: 'bg-red-400/10', icon: <AlertTriangle className="w-3 h-3" /> },
  CANCELLED:  { label: 'Cancelada',  color: 'text-zinc-500',    bg: 'bg-zinc-500/10', icon: <XCircle className="w-3 h-3" /> },
};

interface FaturamentoMes {
  mes: string;
  mes_label: string;
  total: number;
  recebido: number;
  pendente: number;
  vencido: number;
}

interface DashboardData {
  totalPending: number;
  countPending: number;
  totalReceived: number;
  countReceived: number;
  totalOverdue: number;
  countOverdue: number;
  totalCancelled: number;
  countCancelled: number;
  totalGeral: number;
  countGeral: number;
  totalMes: number;
  countMes: number;
  recebidoMes: number;
  countRecebidoMes: number;
  faturamentoMensal: FaturamentoMes[];
  ultimasFaturas: any[];
}

// ============================================================
// Componente Principal
// ============================================================
export default function PainelFinanceiroPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Usa o endpoint dedicado que retorna TUDO pre-calculado
      const res = await api.get<any>('/financial/dashboard/financial-panel');

      // Extrair dados (compativel com axios wrapper ou fetch direto)
      const raw = res?.data || res;
      const d = raw?.totalPending !== undefined ? raw
              : raw?.data?.totalPending !== undefined ? raw.data
              : raw;

      if (!d || d.error) {
        setError(d?.error || 'Erro ao carregar dados');
        setLoading(false);
        return;
      }

      setData({
        totalPending: d.totalPending || 0,
        countPending: d.countPending || 0,
        totalReceived: d.totalReceived || 0,
        countReceived: d.countReceived || 0,
        totalOverdue: d.totalOverdue || 0,
        countOverdue: d.countOverdue || 0,
        totalCancelled: d.totalCancelled || 0,
        countCancelled: d.countCancelled || 0,
        totalGeral: d.totalGeral || 0,
        countGeral: d.countGeral || 0,
        totalMes: d.totalMes || 0,
        countMes: d.countMes || 0,
        recebidoMes: d.recebidoMes || 0,
        countRecebidoMes: d.countRecebidoMes || 0,
        faturamentoMensal: Array.isArray(d.faturamentoMensal) ? d.faturamentoMensal : [],
        ultimasFaturas: Array.isArray(d.ultimasFaturas) ? d.ultimasFaturas : [],
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dashboard');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const mesesNomes = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mesAtualNome = mesesNomes[new Date().getMonth()];
  const anoAtual = new Date().getFullYear();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-zinc-500">Carregando painel financeiro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-bold text-zinc-50 uppercase tracking-wide">Painel Financeiro</h1>
            <p className="text-xs font-mono text-zinc-500">Visao geral das financas do provedor</p>
          </div>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-mono font-bold uppercase text-xs transition-all border border-zinc-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Cards Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pendentes */}
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900 hover:border-yellow-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Clock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Pendentes</span>
                </div>
                <p className="text-2xl font-mono font-bold text-yellow-400">{formatCurrency(data.totalPending)}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">{data.countPending} faturas aguardando</p>
              </CardContent>
            </Card>

            {/* Recebidos */}
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900 hover:border-emerald-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Recebidos</span>
                </div>
                <p className="text-2xl font-mono font-bold text-emerald-400">{formatCurrency(data.totalReceived)}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">{data.countReceived} faturas pagas</p>
              </CardContent>
            </Card>

            {/* Vencidos */}
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900 hover:border-red-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Vencidos</span>
                </div>
                <p className="text-2xl font-mono font-bold text-red-400">{formatCurrency(data.totalOverdue)}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">{data.countOverdue} faturas vencidas</p>
              </CardContent>
            </Card>

            {/* Mes Atual */}
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900 hover:border-blue-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{mesAtualNome}</span>
                </div>
                <p className="text-2xl font-mono font-bold text-blue-400">{formatCurrency(data.totalMes)}</p>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">{data.countMes} faturas no mes</p>
              </CardContent>
            </Card>
          </div>

          {/* Resumo do Mes + Grafico */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Resumo do Mes Atual */}
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
              <CardHeader className="border-b border-zinc-900/85 pb-4">
                <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Resumo {mesAtualNome}/{anoAtual}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-400">Total Faturado</span>
                  <span className="text-sm font-mono font-bold text-zinc-200">{formatCurrency(data.totalMes)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Recebido
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(data.recebidoMes)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-yellow-400" /> A Receber
                  </span>
                  <span className="text-sm font-mono font-bold text-yellow-400">{formatCurrency(data.totalMes - data.recebidoMes)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                    <PieChart className="w-3 h-3 text-blue-400" /> Taxa de Recebimento
                  </span>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {data.totalMes > 0 ? ((data.recebidoMes / data.totalMes) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Faturamento Mensal (ultimos 6 meses) */}
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
              <CardHeader className="border-b border-zinc-900/85 pb-4">
                <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Faturamento Mensal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {data.faturamentoMensal.length > 0 ? (
                  <div className="space-y-3">
                    {data.faturamentoMensal.map((item, idx) => {
                      const maxVal = Math.max(...data.faturamentoMensal.map(m => Math.max(m.total, m.recebido)), 1);
                      const pctTotal = (item.total / maxVal) * 100;
                      const pctRecebido = (item.recebido / maxVal) * 100;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-zinc-500 w-24">{item.mes_label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-emerald-400">{formatCurrency(item.recebido)}</span>
                              <span className="text-[10px] font-mono text-zinc-600">/ {formatCurrency(item.total)}</span>
                            </div>
                          </div>
                          <div className="relative h-4 bg-zinc-800/50 rounded-full overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-zinc-700/50 rounded-full transition-all"
                              style={{ width: `${pctTotal}%` }}
                            />
                            <div
                              className="absolute inset-y-0 left-0 bg-emerald-500/60 rounded-full transition-all"
                              style={{ width: `${pctRecebido}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-zinc-800/50">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" />
                        <span className="text-[10px] font-mono text-zinc-500">Recebido</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-zinc-700/50" />
                        <span className="text-[10px] font-mono text-zinc-500">Total</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs font-mono text-zinc-500">Sem dados de faturamento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ultimas Faturas */}
          <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
            <CardHeader className="border-b border-zinc-900/85 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Ultimas Faturas
                </CardTitle>
                <a
                  href="/dashboard/financeiro/faturas"
                  className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase flex items-center gap-1 transition-colors"
                >
                  Ver Todas <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.ultimasFaturas.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs font-mono text-zinc-500">Nenhuma fatura encontrada</p>
                  <p className="text-[10px] font-mono text-zinc-600 mt-1">
                    As cobrancas sao geradas na aba financeira de cada cliente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-900/50">
                        <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Cliente</th>
                        <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Valor</th>
                        <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Vencimento</th>
                        <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Status</th>
                        <th className="text-right px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ultimasFaturas.map((inv: any) => {
                        const st = statusConfig[inv.status] || statusConfig.PENDING;
                        return (
                          <tr key={inv.id} className="border-b border-zinc-900/30 hover:bg-zinc-800/20 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-xs font-mono text-zinc-200">{inv.customer_name || inv.description || '--'}</p>
                              <p className="text-[10px] font-mono text-zinc-500">{inv.customer_document || ''}</p>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-zinc-200">
                              {formatCurrency(parseFloat(inv.amount) || 0)}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                              {formatDate(inv.due_date || '')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${st.color} ${st.bg}`}>
                                {st.icon} {st.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(inv.boleto_url || inv.invoice_url) && (
                                <a
                                  href={inv.boleto_url || inv.invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200 inline-flex"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rodape com totais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Total Geral Faturado</p>
                  <p className="text-lg font-mono font-bold text-zinc-200">{formatCurrency(data.totalGeral)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Total de Faturas</p>
                  <p className="text-lg font-mono font-bold text-zinc-200">{data.countGeral}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <XCircle className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Canceladas</p>
                  <p className="text-lg font-mono font-bold text-zinc-200">{formatCurrency(data.totalCancelled)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}