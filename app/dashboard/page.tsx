'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Activity,
  Clock,
  Ban,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Headphones,
} from 'lucide-react';

// ============================================================
// Tipos
// ============================================================
interface DashboardData {
  clientes: {
    ativos: number;
    bloqueados: number;
    cancelados: number;
    total: number;
  };
  leads: {
    totalMes: number;
    convertidosMes: number;
    emAtendimento: number;
    totalGeral: number;
  };
  financeiro: {
    faturamentoMes: number;
    recebidoMes: number;
    pendenteMes: number;
    inadimplenciaMes: number;
    totalFaturas: number;
    faturasPagas: number;
    faturasPendentes: number;
    faturasVencidas: number;
  };
  contratos: {
    ativos: number;
    receitaMensal: number;
  };
  recebidoHoje: {
    valor: number;
    quantidade: number;
  };
  ticketsAbertos: number;
  graficoFaturamento: Array<{
    mes: string;
    mes_label: string;
    total: number;
    recebido: number;
    vencido: number;
  }>;
  faturasPendentes: Array<{
    id: string;
    customer_name: string;
    customer_document: string;
    amount: number;
    due_date: string;
    status: string;
    billing_type: string;
  }>;
  ultimosLeads: Array<{
    id: string;
    nome: string;
    whatsapp: string;
    plano_escolhido: string;
    status: string;
    created_at: string;
  }>;
}

// ============================================================
// Helpers
// ============================================================
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  // "AAAA-MM-DD" sem passar por new Date (evita voltar 1 dia no fuso de Brasília)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [a, m, d] = dateStr.split('-');
    return `${d}/${m}/${a}`;
  }
  return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
    OVERDUE: { label: 'Vencida', color: 'bg-red-500/20 text-red-400' },
    RECEIVED: { label: 'Paga', color: 'bg-emerald-500/20 text-emerald-400' },
    CONFIRMED: { label: 'Confirmada', color: 'bg-emerald-500/20 text-emerald-400' },
    pendente: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
    em_atendimento: { label: 'Atendimento', color: 'bg-blue-500/20 text-blue-400' },
    convertido: { label: 'Convertido', color: 'bg-emerald-500/20 text-emerald-400' },
    perdido: { label: 'Perdido', color: 'bg-red-500/20 text-red-400' },
  };
  const s = map[status] || map[String(status || '').toLowerCase()] || { label: status || '-', color: 'bg-zinc-500/20 text-zinc-400' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${s.color}`}>
      {s.label}
    </span>
  );
}

// ============================================================
// Barra do gráfico simples (sem dependências externas)
// ============================================================
function SimpleBarChart({ data }: { data: DashboardData['graficoFaturamento'] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 font-mono text-sm">
        Sem dados de faturamento
      </div>
    );
  }
  const maxVal = Math.max(...data.map((d) => Number(d.total) || 0), 1);

  return (
    <div className="flex items-end gap-2 h-48 px-2">
      {data.map((item, i) => {
        const totalH = ((Number(item.total) || 0) / maxVal) * 100;
        const recebidoH = ((Number(item.recebido) || 0) / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col items-center justify-end h-40 relative">
              {/* Barra total */}
              <div
                className="w-full bg-zinc-700/50 rounded-t relative"
                style={{ height: `${totalH}%`, minHeight: totalH > 0 ? '4px' : '0' }}
              >
                {/* Barra recebido sobreposta */}
                <div
                  className="absolute bottom-0 left-0 w-full bg-emerald-500/70 rounded-t"
                  style={{ height: `${totalH > 0 ? (recebidoH / totalH) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
              {item.mes_label}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {formatCurrency(Number(item.total) || 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Componente Principal
// ============================================================
export default function VisaoGeralPage() {
  const { operador, empresa } = useAuth() as any;
  // ID REAL da empresa (vem do login), e não o v5_tenant_id antigo do navegador
  const empresaId = operador?.empresaId || operador?.empresa_id || empresa?.id;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (empresaId) fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function fetchDashboard() {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/overview', {
        headers: { 'x-empresa-id': String(empresaId) },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar dashboard');
      if (json.avisos?.length) console.warn('[Dashboard] tabelas com problema:', json.avisos);
      const d = json.data;

      // Garantir que todos os objetos existem
      setData({
        clientes: d?.clientes || { ativos: 0, bloqueados: 0, cancelados: 0, total: 0 },
        leads: d?.leads || { totalMes: 0, convertidosMes: 0, emAtendimento: 0, totalGeral: 0 },
        financeiro: d?.financeiro || { faturamentoMes: 0, recebidoMes: 0, pendenteMes: 0, inadimplenciaMes: 0, totalFaturas: 0, faturasPagas: 0, faturasPendentes: 0, faturasVencidas: 0 },
        contratos: d?.contratos || { ativos: 0, receitaMensal: 0 },
        recebidoHoje: d?.recebidoHoje || { valor: 0, quantidade: 0 },
        ticketsAbertos: d?.ticketsAbertos || 0,
        graficoFaturamento: d?.graficoFaturamento || [],
        faturasPendentes: d?.faturasPendentes || [],
        ultimosLeads: d?.ultimosLeads || [],
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 font-mono text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const taxaInadimplencia =
    data.financeiro.faturamentoMes > 0
      ? ((data.financeiro.inadimplenciaMes / data.financeiro.faturamentoMes) * 100).toFixed(1)
      : '0';

  const taxaConversao =
    data.leads.totalMes > 0
      ? ((data.leads.convertidosMes / data.leads.totalMes) * 100).toFixed(1)
      : '0';

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">Visão Geral</h1>
          <p className="text-zinc-500 text-sm font-mono mt-1">
            Resumo completo do seu provedor
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-mono transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* ============================================================ */}
      {/* ROW 1 — Financeiro destaque */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recebido Hoje */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Recebido Hoje
                </p>
                <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {formatCurrency(data.recebidoHoje.valor)}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {data.recebidoHoje.quantidade} pagamento(s)
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faturamento do Mês */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Faturamento Mês
                </p>
                <p className="text-2xl font-bold text-white font-mono mt-1">
                  {formatCurrency(data.financeiro.faturamentoMes)}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {data.financeiro.totalFaturas} faturas emitidas
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recebido no Mês */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Recebido no Mês
                </p>
                <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {formatCurrency(data.financeiro.recebidoMes)}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {data.financeiro.faturasPagas} faturas pagas
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inadimplência */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Inadimplência
                </p>
                <p className="text-2xl font-bold text-red-400 font-mono mt-1">
                  {formatCurrency(data.financeiro.inadimplenciaMes)}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {data.financeiro.faturasVencidas} vencidas ({taxaInadimplencia}%)
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* ROW 2 — Clientes e Leads */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Clientes Ativos */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Clientes Ativos
                </p>
                <p className="text-2xl font-bold text-white font-mono mt-1">
                  {data.clientes.ativos}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  de {data.clientes.total} total
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clientes Bloqueados */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Bloqueados
                </p>
                <p className="text-2xl font-bold text-yellow-400 font-mono mt-1">
                  {data.clientes.bloqueados}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  clientes bloqueados
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Ban className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads do Mês */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Leads do Mês
                </p>
                <p className="text-2xl font-bold text-white font-mono mt-1">
                  {data.leads.totalMes}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {data.leads.totalGeral} total geral
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <UserPlus className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Convertidos */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Leads Convertidos
                </p>
                <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                  {data.leads.convertidosMes}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  taxa de {taxaConversao}% no mês
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* ROW 3 — Mini cards extras */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contratos Ativos */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Contratos Ativos
                </p>
                <p className="text-2xl font-bold text-white font-mono mt-1">
                  {data.contratos.ativos}
                </p>
                <p className="text-xs text-emerald-400 font-mono mt-1">
                  {formatCurrency(data.contratos.receitaMensal)}/mês em receita recorrente
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <FileText className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faturas Pendentes */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Faturas Pendentes
                </p>
                <p className="text-2xl font-bold text-yellow-400 font-mono mt-1">
                  {data.financeiro.faturasPendentes}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {formatCurrency(data.financeiro.pendenteMes)} a receber
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Abertos */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Tickets Abertos
                </p>
                <p className="text-2xl font-bold text-white font-mono mt-1">
                  {data.ticketsAbertos}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  suporte pendente
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Headphones className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* ROW 4 — Gráfico de Faturamento */}
      {/* ============================================================ */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white font-mono text-lg">
            Faturamento — Últimos 6 Meses
          </CardTitle>
          <CardDescription className="font-mono text-zinc-500">
            <span className="inline-block w-3 h-3 bg-zinc-700/50 rounded mr-1" /> Total
            <span className="inline-block w-3 h-3 bg-emerald-500/70 rounded ml-3 mr-1" /> Recebido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart data={data.graficoFaturamento} />
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* ROW 5 — Tabelas lado a lado */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Faturas Pendentes / Vencidas */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white font-mono text-lg">
              Faturas Pendentes / Vencidas
            </CardTitle>
            <CardDescription className="font-mono text-zinc-500">
              Próximas a vencer ou já vencidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.faturasPendentes.length === 0 ? (
              <p className="text-zinc-500 font-mono text-sm py-4 text-center">
                Nenhuma fatura pendente 🎉
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-zinc-500 font-mono text-xs py-2 pr-2">
                        Cliente
                      </th>
                      <th className="text-right text-zinc-500 font-mono text-xs py-2 pr-2">
                        Valor
                      </th>
                      <th className="text-center text-zinc-500 font-mono text-xs py-2 pr-2">
                        Vencimento
                      </th>
                      <th className="text-center text-zinc-500 font-mono text-xs py-2">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.faturasPendentes.map((f) => (
                      <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2 pr-2 text-white font-mono text-xs truncate max-w-[150px]">
                          {f.customer_name || '-'}
                        </td>
                        <td className="py-2 pr-2 text-right text-white font-mono text-xs">
                          {formatCurrency(Number(f.amount))}
                        </td>
                        <td className="py-2 pr-2 text-center text-zinc-400 font-mono text-xs">
                          {formatDate(f.due_date)}
                        </td>
                        <td className="py-2 text-center">{statusBadge(f.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Leads */}
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white font-mono text-lg">Últimos Leads</CardTitle>
            <CardDescription className="font-mono text-zinc-500">
              Leads mais recentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.ultimosLeads.length === 0 ? (
              <p className="text-zinc-500 font-mono text-sm py-4 text-center">
                Nenhum lead registrado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-zinc-500 font-mono text-xs py-2 pr-2">
                        Nome
                      </th>
                      <th className="text-left text-zinc-500 font-mono text-xs py-2 pr-2">
                        Plano
                      </th>
                      <th className="text-center text-zinc-500 font-mono text-xs py-2 pr-2">
                        Data
                      </th>
                      <th className="text-center text-zinc-500 font-mono text-xs py-2">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ultimosLeads.map((l) => (
                      <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2 pr-2 text-white font-mono text-xs truncate max-w-[150px]">
                          {l.nome || '-'}
                        </td>
                        <td className="py-2 pr-2 text-zinc-400 font-mono text-xs">
                          {l.plano_escolhido || '-'}
                        </td>
                        <td className="py-2 pr-2 text-center text-zinc-400 font-mono text-xs">
                          {formatDate(l.created_at)}
                        </td>
                        <td className="py-2 text-center">{statusBadge(l.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}