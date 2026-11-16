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
  FileText,
  RefreshCw,
  Loader2,
  Eye,
  Search,
  Filter,
  Pencil,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
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

const formatDateInput = (d: string) => {
  if (!d) return '';
  return typeof d === 'string' ? d.substring(0, 10) : '';
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:    { label: 'Pendente',   color: 'text-yellow-400',  bg: 'bg-yellow-400/10', icon: <Clock className="w-3 h-3" /> },
  RECEIVED:   { label: 'Paga',       color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <CheckCircle2 className="w-3 h-3" /> },
  CONFIRMED:  { label: 'Confirmada', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <CheckCircle2 className="w-3 h-3" /> },
  OVERDUE:    { label: 'Vencida',    color: 'text-red-400',     bg: 'bg-red-400/10', icon: <AlertTriangle className="w-3 h-3" /> },
  CANCELLED:  { label: 'Cancelada',  color: 'text-zinc-500',    bg: 'bg-zinc-500/10', icon: <XCircle className="w-3 h-3" /> },
};

interface Fatura {
  id: string;
  gateway_id?: string;
  customer_name?: string;
  customer_document?: string;
  customer_email?: string;
  customer_phone?: string;
  amount: string | number;
  billing_type?: string;
  due_date?: string;
  paid_date?: string;
  status: string;
  description?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  invoice_url?: string;
}

// ============================================================
// Modal de Editar Fatura
// ============================================================
function EditModal({
  fatura,
  onClose,
  onSave,
  saving,
}: {
  fatura: Fatura;
  onClose: () => void;
  onSave: (id: string, data: any) => void;
  saving: boolean;
}) {
  const [dueDate, setDueDate] = useState(formatDateInput(fatura.due_date || ''));
  const [amount, setAmount] = useState(String(parseFloat(String(fatura.amount)) || 0));
  const [description, setDescription] = useState(fatura.description || '');

  const isPending = fatura.status === 'PENDING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header do modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-mono font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Pencil className="w-4 h-4 text-emerald-400" />
            {isPending ? 'Editar Fatura' : 'Detalhes da Fatura'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Cliente (somente leitura) */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Cliente</label>
            <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs font-mono text-zinc-300">
              {fatura.customer_name || '--'}
            </div>
          </div>

          {/* Documento (somente leitura) */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">CPF / CNPJ</label>
            <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs font-mono text-zinc-300">
              {fatura.customer_document || '--'}
            </div>
          </div>

          {/* Status (somente leitura) */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Status</label>
            <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
              {(() => {
                const st = statusConfig[fatura.status] || statusConfig.PENDING;
                return (
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase ${st.color}`}>
                    {st.icon} {st.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Valor (R$)</label>
            {isPending ? (
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            ) : (
              <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs font-mono text-zinc-300">
                {formatCurrency(parseFloat(String(fatura.amount)) || 0)}
              </div>
            )}
          </div>

          {/* Vencimento */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Vencimento</label>
            {isPending ? (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            ) : (
              <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs font-mono text-zinc-300">
                {formatDate(fatura.due_date || '')}
              </div>
            )}
          </div>

          {/* Descricao */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Descricao</label>
            {isPending ? (
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="Descricao da fatura"
              />
            ) : (
              <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs font-mono text-zinc-300">
                {fatura.description || '--'}
              </div>
            )}
          </div>

          {/* Links do boleto / pix */}
          {(fatura.boleto_url || fatura.pix_copy_paste || fatura.invoice_url) && (
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <label className="text-[10px] font-mono uppercase text-zinc-500 block">Links</label>
              {fatura.boleto_url && (
                <a
                  href={fatura.boleto_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Ver Boleto
                </a>
              )}
              {fatura.invoice_url && (
                <a
                  href={fatura.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Link da Fatura
                </a>
              )}
              {fatura.pix_copy_paste && (
                <button
                  onClick={() => { navigator.clipboard.writeText(fatura.pix_copy_paste || ''); }}
                  className="flex items-center gap-2 text-xs font-mono text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copiar Pix Copia e Cola
                </button>
              )}
            </div>
          )}

          {/* Data de pagamento (se paga) */}
          {fatura.paid_date && (
            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">Data do Pagamento</label>
              <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs font-mono text-emerald-400">
                {formatDate(fatura.paid_date)}
              </div>
            </div>
          )}
        </div>

        {/* Footer do modal */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-mono text-xs transition-colors border border-zinc-700"
          >
            Fechar
          </button>
          {isPending && (
            <button
              onClick={() => onSave(fatura.id, { due_date: dueDate, amount: parseFloat(amount), description })}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Componente Principal
// ============================================================
export default function PainelFinanceiroPage() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editFatura, setEditFatura] = useState<Fatura | null>(null);
  const [saving, setSaving] = useState(false);

  // Paginacao
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchFaturas = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.get<any>('/financial/invoices?limit=500');
      const raw = res?.data || res;
      const list = Array.isArray(raw) ? raw : (raw?.invoices || raw?.data || []);
      setFaturas(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar faturas');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFaturas();
  }, [fetchFaturas]);

  // Salvar edicao
  const handleSave = async (id: string, data: any) => {
    setSaving(true);
    try {
      await api.put(`/financial/invoices/${id}`, data);
      await fetchFaturas();
      setEditFatura(null);
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.message || 'Tente novamente'));
    }
    setSaving(false);
  };

  // Filtros
  const filtered = faturas.filter((f) => {
    // Filtro status
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;

    // Filtro busca
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (f.customer_name || '').toLowerCase();
      const doc = (f.customer_document || '').toLowerCase();
      const desc = (f.description || '').toLowerCase();
      if (!name.includes(q) && !doc.includes(q) && !desc.includes(q)) return false;
    }

    return true;
  });

  // Paginacao
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  // Contagens por status
  const counts = {
    ALL: faturas.length,
    PENDING: faturas.filter(f => f.status === 'PENDING').length,
    RECEIVED: faturas.filter(f => f.status === 'RECEIVED' || f.status === 'CONFIRMED').length,
    OVERDUE: faturas.filter(f => f.status === 'OVERDUE').length,
    CANCELLED: faturas.filter(f => f.status === 'CANCELLED').length,
  };

  // Reset page ao filtrar
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-zinc-500">Carregando faturas...</p>
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
            <p className="text-xs font-mono text-zinc-500">Todas as faturas do provedor</p>
          </div>
        </div>
        <button
          onClick={fetchFaturas}
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

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou descricao..."
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
          />
        </div>

        {/* Filtro status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" />
          {[
            { key: 'ALL', label: 'Todas', color: 'zinc' },
            { key: 'PENDING', label: 'Pendentes', color: 'yellow' },
            { key: 'RECEIVED', label: 'Pagas', color: 'emerald' },
            { key: 'OVERDUE', label: 'Vencidas', color: 'red' },
            { key: 'CANCELLED', label: 'Canceladas', color: 'zinc' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all border ${
                statusFilter === s.key
                  ? s.color === 'yellow' ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                  : s.color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : s.color === 'red' ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'bg-zinc-700/30 border-zinc-600/30 text-zinc-300'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {s.label} ({counts[s.key as keyof typeof counts] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Faturas */}
      <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Faturas ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs font-mono text-zinc-500">Nenhuma fatura encontrada</p>
              {search && (
                <p className="text-[10px] font-mono text-zinc-600 mt-1">
                  Tente buscar por outro termo
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-900/50">
                      <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Cliente</th>
                      <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Valor</th>
                      <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Vencimento</th>
                      <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Pagamento</th>
                      <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Tipo</th>
                      <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Status</th>
                      <th className="text-right px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((inv: Fatura) => {
                      const st = statusConfig[inv.status] || statusConfig.PENDING;
                      const tipo = inv.billing_type === 'PIX' ? 'PIX'
                                 : inv.billing_type === 'BOLETO' ? 'Boleto'
                                 : inv.billing_type || '--';
                      return (
                        <tr key={inv.id} className="border-b border-zinc-900/30 hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-mono text-zinc-200">{inv.customer_name || inv.description || '--'}</p>
                            <p className="text-[10px] font-mono text-zinc-500">{inv.customer_document || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-zinc-200">
                            {formatCurrency(parseFloat(String(inv.amount)) || 0)}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                            {formatDate(inv.due_date || '')}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                            {inv.paid_date ? (
                              <span className="text-emerald-400">{formatDate(inv.paid_date)}</span>
                            ) : (
                              <span className="text-zinc-600">--</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                              tipo === 'PIX' ? 'text-purple-400 bg-purple-400/10' : 'text-blue-400 bg-blue-400/10'
                            }`}>
                              {tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${st.color} ${st.bg}`}>
                              {st.icon} {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Botao editar / ver detalhes */}
                              <button
                                onClick={() => setEditFatura(inv)}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-emerald-400"
                                title={inv.status === 'PENDING' ? 'Editar' : 'Ver detalhes'}
                              >
                                {inv.status === 'PENDING' ? (
                                  <Pencil className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Link boleto / fatura */}
                              {(inv.boleto_url || inv.invoice_url) && (
                                <a
                                  href={inv.boleto_url || inv.invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-blue-400"
                                  title="Ver boleto"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Copiar pix */}
                              {inv.pix_copy_paste && (
                                <button
                                  onClick={() => { navigator.clipboard.writeText(inv.pix_copy_paste || ''); }}
                                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-purple-400"
                                  title="Copiar Pix"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginacao */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-900/50">
                  <p className="text-[10px] font-mono text-zinc-500">
                    Mostrando {((safePage - 1) * perPage) + 1}-{Math.min(safePage * perPage, filtered.length)} de {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, safePage - 1))}
                      disabled={safePage <= 1}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage >= totalPages}
                      className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de edicao */}
      {editFatura && (
        <EditModal
          fatura={editFatura}
          onClose={() => setEditFatura(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}