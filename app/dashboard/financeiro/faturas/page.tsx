'use client';

// ============================================================
// V5 Fibra - Página: Faturas
// Menu: Financeiro → Faturas
// Estilo: V5 Dark Theme (Tailwind + Card components)
// ============================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Eye,
  QrCode,
} from 'lucide-react';
import {
  useFaturas,
  Invoice,
  InvoiceStatus,
  BillingType,
} from '@/lib/useFaturas';

// --- Helpers ---
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) => {
  if (!d) return '—';
  // Suporta tanto "2026-11-05" quanto "2026-11-05T00:00:00.000Z"
  const dateStr = typeof d === 'string' ? d.substring(0, 10) : '';
  if (!dateStr || dateStr.length < 10) return '—';
  const [y, m, day] = dateStr.split('-');
  return `${day}/${m}/${y}`;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:    { label: 'Pendente',    color: 'text-yellow-400',  icon: <Clock className="w-3.5 h-3.5" /> },
  RECEIVED:   { label: 'Paga',        color: 'text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  CONFIRMED:  { label: 'Confirmada',  color: 'text-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  OVERDUE:    { label: 'Vencida',     color: 'text-red-400',     icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  REFUNDED:   { label: 'Estornada',   color: 'text-purple-400',  icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED:  { label: 'Cancelada',   color: 'text-zinc-500',    icon: <XCircle className="w-3.5 h-3.5" /> },
  CHARGEBACK: { label: 'Contestada',  color: 'text-red-400',     icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const billingConfig: Record<string, { label: string; icon: string }> = {
  BOLETO: { label: 'Boleto', icon: '🏦' },
  PIX: { label: 'PIX', icon: '⚡' },
  CREDIT_CARD: { label: 'Cartão', icon: '💳' },
  UNDEFINED: { label: '—', icon: '—' },
};

// ============================================================
// Componente Principal
// ============================================================
export default function FaturasPage() {
  const {
    invoices,
    total,
    totalPages,
    loading,
    error,
    summary,
    filters,
    updateFilter,
    goToPage,
    refresh,
  } = useFaturas();

  // Busca com debounce
  const [searchInput, setSearchInput] = useState('');
  const handleSearch = (value: string) => {
    setSearchInput(value);
    clearTimeout((window as any).__searchTimeout);
    (window as any).__searchTimeout = setTimeout(() => {
      updateFilter('search', value);
    }, 500);
  };


  // Modal PIX QR Code
  const [pixModal, setPixModal] = useState<{ open: boolean; qrCode: string; copyPaste: string; amount: number; customer: string }>({
    open: false, qrCode: '', copyPaste: '', amount: 0, customer: ''
  });


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-bold text-zinc-50 uppercase tracking-wide">Faturas</h1>
            <p className="text-xs font-mono text-zinc-500">Gerencie todas as cobranças dos seus clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-mono font-bold uppercase text-xs transition-all border border-zinc-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500">Pendentes</p>
                <p className="text-xl font-mono font-bold text-yellow-400">{formatCurrency(summary.totalPending)}</p>
                <p className="text-[10px] font-mono text-zinc-500">{summary.countPending} faturas</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500">Recebidos</p>
                <p className="text-xl font-mono font-bold text-emerald-400">{formatCurrency(summary.totalReceived)}</p>
                <p className="text-[10px] font-mono text-zinc-500">{summary.countReceived} faturas</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500">Vencidos</p>
                <p className="text-xl font-mono font-bold text-red-400">{formatCurrency(summary.totalOverdue)}</p>
                <p className="text-[10px] font-mono text-zinc-500">{summary.countOverdue} faturas</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por cliente, CPF/CNPJ ou valor..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="RECEIVED">Paga</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="OVERDUE">Vencida</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="REFUNDED">Estornada</option>
            </select>
            <select
              value={filters.billingType}
              onChange={(e) => updateFilter('billingType', e.target.value)}
              className="px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todos os tipos</option>
              <option value="BOLETO">Boleto</option>
              <option value="PIX">PIX</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              placeholder="De"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              placeholder="Até"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-zinc-900/40 backdrop-blur border border-zinc-900">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400">
            Lista de Faturas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-mono text-zinc-500">Nenhuma fatura encontrada</p>
              <p className="text-xs font-mono text-zinc-600 mt-1">
                {filters.status || filters.billingType || filters.search
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'As cobranças são geradas na aba financeira de cada cliente.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-900/50">
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Cliente</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Tipo</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Valor</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Vencimento</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Pagamento</th>
                    <th className="text-left px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Status</th>
                    <th className="text-right px-4 py-3 text-[10px] font-mono uppercase text-zinc-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const st = statusConfig[inv.status] || statusConfig.PENDING;
                    const bt = billingConfig[inv.billing_type] || billingConfig.UNDEFINED;
                    return (
                      <tr key={inv.id} className="border-b border-zinc-900/30 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-zinc-200">{inv.customer_name}</p>
                          <p className="text-[10px] font-mono text-zinc-500">{inv.customer_document}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-zinc-300">{bt.icon} {bt.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-zinc-200">{formatCurrency(inv.amount)}</td>
                        <td className="px-4 py-3 text-xs font-mono text-zinc-400">{formatDate(inv.due_date)}</td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {inv.paid_date ? (
                            <span className="text-emerald-400">{formatDate(inv.paid_date)}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase ${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {inv.billing_type === 'PIX' && inv.status === 'PENDING' && (
                              <button
                                onClick={() => {
                                  if (inv.pix_qr_code) {
                                    setPixModal({ open: true, qrCode: inv.pix_qr_code, copyPaste: inv.pix_copy_paste || '', amount: inv.amount, customer: inv.customer_name });
                                  }
                                }}
                                title="QR Code PIX"
                                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-emerald-400 hover:text-emerald-300"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {inv.billing_type === 'BOLETO' && inv.boleto_url && (
                              <a
                                href={inv.boleto_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver Boleto"
                                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {inv.pix_copy_paste && (
                              <button
                                onClick={() => copyToClipboard(inv.pix_copy_paste!)}
                                title="Copiar PIX"
                                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {inv.boleto_barcode && (
                              <button
                                onClick={() => copyToClipboard(inv.boleto_barcode!)}
                                title="Copiar código de barras"
                                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200"
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-900/50">
              <p className="text-[10px] font-mono text-zinc-500">
                Mostrando {invoices.length} de {total} — Página {filters.page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(filters.page - 1)}
                  disabled={filters.page <= 1}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToPage(filters.page + 1)}
                  disabled={filters.page >= totalPages}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* ============================================================ */}
      {/* MODAL: QR CODE PIX                                           */}
      {/* ============================================================ */}
      {pixModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-mono font-bold text-zinc-200 uppercase">QR Code PIX</h3>
              <button onClick={() => setPixModal(prev => ({ ...prev, open: false }))} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-xs font-mono text-zinc-400">{pixModal.customer}</p>
              <p className="text-lg font-mono font-bold text-emerald-400">{formatCurrency(pixModal.amount)}</p>

              {pixModal.qrCode && (
                <div className="bg-white p-4 rounded-xl inline-block">
                  <img src={`data:image/png;base64,${pixModal.qrCode}`} alt="QR Code PIX" className="w-48 h-48" />
                </div>
              )}

              {pixModal.copyPaste && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase text-zinc-500">PIX Copia e Cola</p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={pixModal.copyPaste}
                      className="flex-1 px-3 py-2 bg-black/50 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 font-mono truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(pixModal.copyPaste)}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-mono font-bold text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}