'use client';

// ============================================================
// V5 Fibra - Página: Contas a Pagar
// Menu: Financeiro > Contas a Pagar
// Estilo: V5 Dark Theme (Tailwind + Card components)
// ============================================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Save,
  Loader2,
  Check,
  Info,
  Trash2,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Edit3,
  X,
  CheckCircle,
  XCircle,
  TrendingDown,
  CreditCard,
  FileText,
  Building,
  Zap,
  Wallet,
  Receipt,
} from 'lucide-react';
import { api } from '@/lib/api';

// --- Tipos ---
interface Bill {
  id: string;
  description: string;
  category: string;
  supplier: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'partial';
  payment_method: string | null;
  notes: string | null;
  recurring: boolean;
  recurring_interval: string | null;
  paid_amount: number;
}

interface Payment {
  id: string;
  bill_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

interface Summary {
  pending: { total: number; count: number };
  paid: { total: number; count: number };
  overdue: { total: number; count: number };
  upcoming: { total: number; count: number };
  by_category: { category: string; total: number; paid_total: number; count: number }[];
}

// --- Categorias ---
const CATEGORIES = [
  { value: 'fornecedor', label: 'Fornecedor Internet', icon: Zap },
  { value: 'aluguel', label: 'Aluguel', icon: Building },
  { value: 'salario', label: 'Salários', icon: Wallet },
  { value: 'energia', label: 'Energia Elétrica', icon: Zap },
  { value: 'equipamento', label: 'Equipamentos', icon: CreditCard },
  { value: 'imposto', label: 'Impostos / Taxas', icon: FileText },
  { value: 'manutencao', label: 'Manutenção', icon: Edit3 },
  { value: 'veiculo', label: 'Veículo / Combustível', icon: TrendingDown },
  { value: 'outros', label: 'Outros', icon: Receipt },
];

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'debito_auto', label: 'Débito Automático' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  paid: { label: 'Pago', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  overdue: { label: 'Vencido', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  partial: { label: 'Parcial', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  cancelled: { label: 'Cancelado', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' },
};

// Máscara de moeda brasileira
const formatInputCurrency = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  if (!numbers) return '';
  // Converte para centavos
  const cents = parseInt(numbers, 10);
  // Formata como moeda BR
  const formatted = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
};

const parseCurrencyToNumber = (value: string): number => {
  if (!value) return 0;
  // Remove pontos e troca vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ContasPagarPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Filtros
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [searchText, setSearchText] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBill, setHistoryBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Form
  const [form, setForm] = useState({
    description: '',
    category: 'outros',
    supplier: '',
    amount: '',
    due_date: '',
    payment_method: '',
    notes: '',
    recurring: false,
    recurring_interval: 'monthly',
  });

  const [payForm, setPayForm] = useState({
    paid_date: new Date().toISOString().split('T')[0],
    payment_method: 'pix',
    amount: '',
    notes: '',
  });

  // Carregar dados
  const loadData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);

      const [billsRes, summaryRes] = await Promise.all([
        api.get<any>(`/financial/bills?${params.toString()}`),
        api.get<any>(`/financial/bills/summary?month=${filterMonth}&year=${filterYear}`),
      ]);

      // Defensive unwrapping
      const rawBills = billsRes.data || billsRes;
      const billsData = rawBills?.bills ? rawBills.bills : rawBills?.data?.bills ? rawBills.data.bills : [];
      setBills(Array.isArray(billsData) ? billsData : []);

      const rawSummary = summaryRes.data || summaryRes;
      const summaryData = rawSummary?.pending ? rawSummary : rawSummary?.data?.pending ? rawSummary.data : null;
      if (summaryData) {
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Erro ao carregar contas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterCategory, filterMonth, filterYear]);

  // Salvar conta
  const handleSave = async () => {
    if (!form.description || !form.amount || parseCurrencyToNumber(form.amount) <= 0 || !form.due_date) return;

    try {
      setSaving(true);

      const payload = {
        description: form.description,
        category: form.category,
        supplier: form.supplier || null,
        amount: parseCurrencyToNumber(form.amount),
        due_date: form.due_date,
        payment_method: form.payment_method || null,
        notes: form.notes || null,
        recurring: form.recurring,
        recurring_interval: form.recurring ? form.recurring_interval : null,
      };

      if (editingBill) {
        await api.put(`/financial/bills/${editingBill.id}`, payload);
      } else {
        await api.post('/financial/bills', payload);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setShowModal(false);
      setEditingBill(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  // Registrar pagamento parcial
  const handlePay = async () => {
    if (!payingBill) return;
    const payAmount = parseCurrencyToNumber(payForm.amount);
    if (payAmount <= 0) return;

    try {
      setSaving(true);
      await api.post(`/financial/bills/${payingBill.id}/payments`, {
        amount: payAmount,
        payment_date: payForm.paid_date,
        payment_method: payForm.payment_method,
        notes: payForm.notes || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setShowPayModal(false);
      setPayingBill(null);
      loadData();
    } catch (err) {
      console.error('Erro ao pagar:', err);
    } finally {
      setSaving(false);
    }
  };

  // Carregar histórico de pagamentos
  const loadPayments = async (bill: Bill) => {
    setHistoryBill(bill);
    setShowHistoryModal(true);
    setLoadingPayments(true);
    try {
      const res = await api.get<any>(`/financial/bills/${bill.id}/payments`);
      const raw = res.data || res;
      const data = raw?.payments ? raw.payments : raw?.data?.payments ? raw.data.payments : [];
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar pagamentos:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Excluir conta
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    try {
      await api.delete(`/financial/bills/${id}`);
      loadData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // Abrir edição
  const openEdit = (bill: Bill) => {
    setEditingBill(bill);
    setForm({
      description: bill.description,
      category: bill.category,
      supplier: bill.supplier || '',
      amount: formatInputCurrency(String(Math.round(parseFloat(String(bill.amount)) * 100))),
      due_date: bill.due_date?.split('T')[0] || '',
      payment_method: bill.payment_method || '',
      notes: bill.notes || '',
      recurring: bill.recurring,
      recurring_interval: bill.recurring_interval || 'monthly',
    });
    setShowModal(true);
  };

  // Abrir pagamento
  const openPay = (bill: Bill) => {
    const billAmount = parseFloat(String(bill.amount)) || 0;
    const paidAmount = parseFloat(String(bill.paid_amount)) || 0;
    const remaining = billAmount - paidAmount;
    setPayingBill(bill);
    setPayForm({
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: bill.payment_method || 'pix',
      amount: formatInputCurrency(String(Math.round(remaining * 100))),
      notes: '',
    });
    setShowPayModal(true);
  };

  const resetForm = () => {
    setForm({
      description: '',
      category: 'outros',
      supplier: '',
      amount: '',
      due_date: '',
      payment_method: '',
      notes: '',
      recurring: false,
      recurring_interval: 'monthly',
    });
  };

  // Formatar valor
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Formatar data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };

  // Filtrar por busca
  const filteredBills = bills.filter(b => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      b.description.toLowerCase().includes(s) ||
      (b.supplier && b.supplier.toLowerCase().includes(s)) ||
      (b.notes && b.notes.toLowerCase().includes(s))
    );
  });

  // Categoria label
  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat)?.label || cat;
  };

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
            <Receipt className="w-5 h-5 text-emerald-400" />
            Contas a Pagar
          </h1>
          <p className="text-zinc-500 text-xs font-mono mt-1">
            Controle de despesas e contas do provedor
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingBill(null); setShowModal(true); }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      {/* Status cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-400" />
                <p className="text-[10px] uppercase font-mono tracking-wide text-zinc-500">Pendente</p>
              </div>
              <p className="text-xl font-mono font-bold text-yellow-400">{formatCurrency(summary.pending.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600">{summary.pending.count} conta(s)</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-[10px] uppercase font-mono tracking-wide text-zinc-500">Vencido</p>
              </div>
              <p className="text-xl font-mono font-bold text-red-400">{formatCurrency(summary.overdue.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600">{summary.overdue.count} conta(s)</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <p className="text-[10px] uppercase font-mono tracking-wide text-zinc-500">Pago</p>
              </div>
              <p className="text-xl font-mono font-bold text-emerald-400">{formatCurrency(summary.paid.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600">{summary.paid.count} conta(s)</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-400" />
                <p className="text-[10px] uppercase font-mono tracking-wide text-zinc-500">Próx. 7 dias</p>
              </div>
              <p className="text-xl font-mono font-bold text-blue-400">{formatCurrency(summary.upcoming.total)}</p>
              <p className="text-[10px] font-mono text-zinc-600">{summary.upcoming.count} conta(s)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gastos por Categoria */}
      {summary && summary.by_category && summary.by_category.length > 0 && (
        <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
          <CardHeader className="border-b border-zinc-900/85 pb-3">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {summary.by_category.map((cat, i) => {
                const totalAll = summary.by_category.reduce((acc, c) => acc + c.total, 0);
                const pct = totalAll > 0 ? (cat.total / totalAll) * 100 : 0;
                const paidPct = cat.total > 0 ? (cat.paid_total / cat.total) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] font-mono text-zinc-400">{getCategoryLabel(cat.category)}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-emerald-400">{formatCurrency(cat.paid_total)} pago</span>
                        <span className="text-[9px] font-mono text-zinc-600">/</span>
                        <span className="text-xs font-mono text-zinc-300">{formatCurrency(cat.total)} total</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden relative">
                        {/* Barra vermelha/laranja — total */}
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                        {/* Barra verde — pago (cresce por cima) */}
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all"
                          style={{ width: `${(paidPct / 100) * pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 w-10 text-right">{paidPct.toFixed(0)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legenda */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800/50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
                <span className="text-[9px] font-mono text-zinc-500">Total a pagar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
                <span className="text-[9px] font-mono text-zinc-500">Já pago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar descrição, fornecedor..."
                className="w-full pl-10 pr-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">Todos Status</option>
              <option value="pending">Pendente</option>
              <option value="partial">Parcial</option>
              <option value="overdue">Vencido</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>

            {/* Categoria */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">Todas Categorias</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {/* Mês */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={String(i + 1)}>{m}</option>
              ))}
            </select>

            {/* Ano */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contas */}
      <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
        <CardHeader className="border-b border-zinc-900/85 pb-3">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Contas ({filteredBills.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBills.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 font-mono text-xs">
              Nenhuma conta encontrada para o período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/50">
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500">Vencimento</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500">Descrição</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500">Categoria</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500">Fornecedor</th>
                    <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-wider text-zinc-500">Valor</th>
                    <th className="px-4 py-3 text-center text-[10px] font-mono uppercase tracking-wider text-zinc-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill) => {
                    const sc = STATUS_CONFIG[bill.status] || STATUS_CONFIG.pending;
                    return (
                      <tr key={bill.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-mono ${bill.status === 'overdue' ? 'text-red-400' : 'text-zinc-300'}`}>
                            {formatDate(bill.due_date)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-zinc-200">{bill.description}</p>
                          {bill.recurring && (
                            <span className="text-[9px] font-mono text-blue-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> Recorrente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono text-zinc-400">{getCategoryLabel(bill.category)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-zinc-400">{bill.supplier || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const total = parseFloat(String(bill.amount)) || 0;
                            const paid = parseFloat(String(bill.paid_amount)) || 0;
                            const remaining = total - paid;
                            const paidPct = total > 0 ? (paid / total) * 100 : 0;
                            return (
                              <div>
                                <span className={`text-sm font-mono font-bold ${bill.status === 'paid' ? 'text-emerald-400' : bill.status === 'overdue' ? 'text-red-400' : 'text-zinc-200'}`}>
                                  {formatCurrency(total)}
                                </span>
                                {paid > 0 && (
                                  <>
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1 relative">
                                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                                    </div>
                                    <p className="text-[9px] font-mono text-emerald-400 mt-0.5">
                                      {formatCurrency(paid)} pago {remaining > 0 && `· falta ${formatCurrency(remaining)}`}
                                    </p>
                                  </>
                                )}
                                {bill.paid_date && bill.status === 'paid' && (
                                  <p className="text-[9px] font-mono text-zinc-600">Quitado em {formatDate(bill.paid_date)}</p>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                              <button
                                onClick={() => openPay(bill)}
                                className="p-1.5 rounded-md hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                title="Registrar pagamento"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            {(parseFloat(String(bill.paid_amount)) || 0) > 0 && (
                              <button
                                onClick={() => loadPayments(bill)}
                                className="p-1.5 rounded-md hover:bg-purple-500/20 text-purple-400 transition-colors"
                                title="Histórico de pagamentos"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(bill)}
                              className="p-1.5 rounded-md hover:bg-blue-500/20 text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(bill.id)}
                              className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Info */}
      <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <span className="text-blue-400 text-xs font-mono">
          Cadastre todas as despesas do seu provedor para ter controle total dos gastos.
          As contas vencidas são marcadas automaticamente. Use o botão ✓ para registrar o pagamento.
        </span>
      </div>

      {/* Toast de sucesso */}
      {saved && (
        <div className="fixed bottom-6 right-6 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl flex items-center gap-2 font-mono text-xs shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          Salvo com sucesso!
        </div>
      )}

      {/* ==================== MODAL NOVA/EDITAR CONTA ==================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-sm font-mono font-bold text-zinc-200">
                {editingBill ? 'Editar Conta' : 'Nova Conta a Pagar'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingBill(null); }} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Descrição */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Descrição *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Pagamento link dedicado Vivo"
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Categoria + Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Valor (R$) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: formatInputCurrency(e.target.value) })}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Fornecedor + Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Fornecedor</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Nome do fornecedor"
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Vencimento *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Forma de Pagamento</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">Selecione...</option>
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Anotações opcionais..."
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {/* Recorrente */}
              <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
                <button
                  onClick={() => setForm({ ...form, recurring: !form.recurring })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.recurring ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.recurring ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs font-mono text-zinc-300">Conta recorrente</span>
                {form.recurring && (
                  <select
                    value={form.recurring_interval}
                    onChange={(e) => setForm({ ...form, recurring_interval: e.target.value })}
                    className="ml-auto px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-300"
                  >
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800">
              <button
                onClick={() => { setShowModal(false); setEditingBill(null); }}
                className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description || !form.amount || !form.due_date}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingBill ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL REGISTRAR PAGAMENTO ==================== */}
      {showPayModal && payingBill && (() => {
        const billAmount = parseFloat(String(payingBill.amount)) || 0;
        const paidAmount = parseFloat(String(payingBill.paid_amount)) || 0;
        const remaining = billAmount - paidAmount;
        const paidPercent = billAmount > 0 ? Math.min((paidAmount / billAmount) * 100, 100) : 0;

        return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-sm font-mono font-bold text-zinc-200">Registrar Pagamento</h3>
              <button onClick={() => { setShowPayModal(false); setPayingBill(null); }} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Info da conta com progresso */}
              <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50 space-y-2">
                <p className="text-xs font-mono text-zinc-300 font-medium">{payingBill.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Total da conta</span>
                  <span className="text-sm font-mono font-bold text-zinc-200">{formatCurrency(billAmount)}</span>
                </div>
                {/* Barra de progresso */}
                <div className="w-full h-2 bg-zinc-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paidPercent}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400">Pago: {formatCurrency(paidAmount)}</span>
                  <span className="text-orange-400">Falta: {formatCurrency(remaining)}</span>
                </div>
              </div>

              {/* Valor do pagamento */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Valor deste pagamento (R$) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: formatInputCurrency(e.target.value) })}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-sm font-mono text-emerald-400 font-bold placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] font-mono text-zinc-600 mt-1">Máximo: {formatCurrency(remaining)}</p>
              </div>

              {/* Data + Forma lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Data</label>
                  <input
                    type="date"
                    value={payForm.paid_date}
                    onChange={(e) => setPayForm({ ...payForm, paid_date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Forma</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">Observação (opcional)</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Ex: Pagamento parcial via PIX"
                  className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800">
              <button
                onClick={() => { setShowPayModal(false); setPayingBill(null); }}
                className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePay}
                disabled={saving || parseCurrencyToNumber(payForm.amount) <= 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Registrar Pagamento
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ==================== MODAL HISTÓRICO DE PAGAMENTOS ==================== */}
      {showHistoryModal && historyBill && (() => {
        const billAmount = parseFloat(String(historyBill.amount)) || 0;
        const paidAmount = parseFloat(String(historyBill.paid_amount)) || 0;
        const remaining = billAmount - paidAmount;
        const paidPercent = billAmount > 0 ? Math.min((paidAmount / billAmount) * 100, 100) : 0;

        return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-sm font-mono font-bold text-zinc-200 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Histórico de Pagamentos
              </h3>
              <button onClick={() => { setShowHistoryModal(false); setHistoryBill(null); setPayments([]); }} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Info da conta */}
              <div className="p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-zinc-300 font-medium">{historyBill.description}</p>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${STATUS_CONFIG[historyBill.status]?.bg || ''} ${STATUS_CONFIG[historyBill.status]?.color || ''}`}>
                    {STATUS_CONFIG[historyBill.status]?.label || historyBill.status}
                  </span>
                </div>
                {/* Barra de progresso */}
                <div className="w-full h-3 bg-zinc-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paidPercent}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400">Pago: {formatCurrency(paidAmount)} ({paidPercent.toFixed(0)}%)</span>
                  <span className="text-zinc-400">Total: {formatCurrency(billAmount)}</span>
                  {remaining > 0 && <span className="text-orange-400">Falta: {formatCurrency(remaining)}</span>}
                </div>
              </div>

              {/* Lista de pagamentos */}
              {loadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs font-mono text-zinc-500">Nenhum pagamento registrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p, idx) => {
                    const methodLabel = PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method || '-';
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-zinc-800/20 rounded-lg border border-zinc-800/30 hover:border-zinc-700/50 transition-colors">
                        {/* Número */}
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-mono font-bold text-emerald-400">{idx + 1}</span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(parseFloat(String(p.amount)))}</span>
                            <span className="text-[10px] font-mono text-zinc-500">{formatDate(p.payment_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-zinc-500">{methodLabel}</span>
                            {p.notes && <span className="text-[10px] font-mono text-zinc-600">· {p.notes}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Resumo */}
                  <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500">{payments.length} pagamento{payments.length !== 1 ? 's' : ''} registrado{payments.length !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Total pago: {formatCurrency(payments.reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-4 border-t border-zinc-800">
              {remaining > 0 && (
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryBill(null);
                    setPayments([]);
                    openPay(historyBill);
                  }}
                  className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Novo Pagamento
                </button>
              )}
              <button
                onClick={() => { setShowHistoryModal(false); setHistoryBill(null); setPayments([]); }}
                className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}