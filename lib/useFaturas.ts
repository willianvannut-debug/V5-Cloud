'use client';

// ============================================================
// V5 Fibra - Hook: useFaturas
// Responsável por toda a comunicação com a API de faturas.
// Busca, filtra, pagina e executa ações nas faturas.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

// --- Tipos ---

// Status possíveis de uma fatura
export type InvoiceStatus =
  | 'PENDING'       // Aguardando pagamento
  | 'RECEIVED'      // Paga (confirmada)
  | 'CONFIRMED'     // Paga (confirmada pelo banco)
  | 'OVERDUE'       // Vencida
  | 'REFUNDED'      // Estornada
  | 'CANCELLED'     // Cancelada
  | 'CHARGEBACK';   // Contestada pelo cliente

// Tipos de cobrança
export type BillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';

// Uma fatura individual
export interface Invoice {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_document: string;
  contract_id?: string;
  asaas_payment_id?: string;
  billing_type: BillingType;
  amount: number;
  net_amount?: number;
  status: InvoiceStatus;
  due_date: string;
  paid_date?: string;
  description?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  boleto_url?: string;
  boleto_barcode?: string;
  competence_date?: string;
  created_at: string;
}

// Filtros que o usuário pode aplicar
export interface InvoiceFilters {
  status?: InvoiceStatus | '';
  billingType?: BillingType | '';
  startDate?: string;
  endDate?: string;
  search?: string;
  page: number;
  limit: number;
}

// Resposta da API com paginação
export interface InvoicesResponse {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: {
    totalPending: number;
    totalReceived: number;
    totalOverdue: number;
    countPending: number;
    countReceived: number;
    countOverdue: number;
  };
}

// Resumo mensal (cards do topo - reinicia todo dia 1)
export interface MonthlySummary {
  totalPending: number;
  countPending: number;
  totalReceived: number;
  countReceived: number;
  totalCancelled: number;
  countCancelled: number;
}

// --- Hook ---

export function useFaturas() {
  // Estado das faturas
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado do resumo geral (vem da API)
  const [summary, setSummary] = useState({
    totalPending: 0,
    totalReceived: 0,
    totalOverdue: 0,
    countPending: 0,
    countReceived: 0,
    countOverdue: 0,
  });

  // Estado do resumo MENSAL (cards do topo - só mês atual)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({
    totalPending: 0,
    countPending: 0,
    totalReceived: 0,
    countReceived: 0,
    totalCancelled: 0,
    countCancelled: 0,
  });

  // Calcular primeiro e último dia do mês atual
  const getMonthRange = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-11
    const lastDay = new Date(y, m + 1, 0); // último dia do mês
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      startDate: `${y}-${pad(m + 1)}-01`,
      endDate: `${y}-${pad(m + 1)}-${pad(lastDay.getDate())}`,
    };
  };

  // Filtros atuais — já inicia com o mês atual
  const { startDate: mesIni, endDate: mesFim } = getMonthRange();
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: '',
    billingType: '',
    startDate: mesIni,
    endDate: mesFim,
    search: '',
    page: 1,
    limit: 20,
  });

  // Buscar resumo do mês atual (separado dos filtros da tabela)
  const fetchMonthlySummary = useCallback(async () => {
    const { startDate, endDate } = getMonthRange();
    try {
      const res = await api.get<any>(
        `/financial/invoices?startDate=${startDate}&endDate=${endDate}&limit=500`
      );
      const raw = res?.data || res;
      const list: Invoice[] = Array.isArray(raw) ? raw : (raw?.data || []);

      let totalPending = 0, countPending = 0;
      let totalReceived = 0, countReceived = 0;
      let totalCancelled = 0, countCancelled = 0;

      for (const inv of list) {
        const amount = typeof inv.amount === 'number' ? inv.amount : parseFloat(String(inv.amount)) || 0;

        if (inv.status === 'PENDING' || inv.status === 'OVERDUE') {
          totalPending += amount;
          countPending++;
        } else if (inv.status === 'RECEIVED' || inv.status === 'CONFIRMED') {
          totalReceived += amount;
          countReceived++;
        } else if (inv.status === 'CANCELLED') {
          totalCancelled += amount;
          countCancelled++;
        }
      }

      setMonthlySummary({ totalPending, countPending, totalReceived, countReceived, totalCancelled, countCancelled });
    } catch (err) {
      // Silently fail - cards ficam zerados
      console.error('Erro ao buscar resumo mensal:', err);
    }
  }, []);

  // Buscar faturas na API com os filtros atuais
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Montar query string com os filtros
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.billingType) params.append('billingType', filters.billingType);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    params.append('page', String(filters.page));
    params.append('limit', String(filters.limit));

    const res = await api.get<InvoicesResponse>(`/financial/invoices?${params.toString()}`);

    if (res.data) {
      setInvoices(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      if (res.data.summary) setSummary(res.data.summary);
    }
    if (res.error) setError(res.error);

    setLoading(false);
  }, [filters]);

  // Recarregar sempre que os filtros mudarem
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Buscar resumo mensal na primeira carga e ao atualizar
  useEffect(() => {
    fetchMonthlySummary();
  }, [fetchMonthlySummary]);

  // Atualizar um filtro específico (volta pra página 1)
  const updateFilter = (field: keyof InvoiceFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  // Mudar de página
  const goToPage = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  // Cancelar uma fatura
  const cancelInvoice = async (invoiceId: string) => {
    const res = await api.post(`/financial/invoices/${invoiceId}/cancel`);
    if (!res.error) {
      await fetchInvoices();
      await fetchMonthlySummary();
    }
    return res;
  };

  // Gerar segunda via (nova data de vencimento)
  const generateSecondCopy = async (invoiceId: string, newDueDate: string) => {
    const res = await api.post(`/financial/invoices/${invoiceId}/second-copy`, { newDueDate });
    if (!res.error) {
      await fetchInvoices();
      await fetchMonthlySummary();
    }
    return res;
  };

  // Buscar QR Code PIX de uma fatura
  const getPixQrCode = async (invoiceId: string) => {
    return api.get<{ qrCode: string; copyPaste: string }>(`/financial/invoices/pix/${invoiceId}/qrcode`);
  };

  // Atualizar tudo (tabela + resumo mensal)
  const refreshAll = async () => {
    await Promise.all([fetchInvoices(), fetchMonthlySummary()]);
  };

  return {
    invoices,
    total,
    totalPages,
    loading,
    error,
    summary,
    monthlySummary,
    filters,
    updateFilter,
    goToPage,
    cancelInvoice,
    generateSecondCopy,
    getPixQrCode,
    refresh: refreshAll,
  };
}
