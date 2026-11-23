// lib/faturas-status.ts
// As faturas são gravadas pelo financeiro com o status do gateway (Asaas: PENDING, OVERDUE, RECEIVED...).
// O app do cliente e as notificações trabalham com: pendente | vencida | paga | cancelada.

export type StatusCliente = 'pendente' | 'vencida' | 'paga' | 'cancelada';

const PAGAS = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'PAID', 'PAGA', 'PAGO'];
const CANCELADAS = ['CANCELLED', 'CANCELED', 'REFUNDED', 'DELETED', 'CANCELADA', 'ESTORNADA'];
const VENCIDAS = ['OVERDUE', 'VENCIDA'];

/** Status do banco que significam "ainda falta pagar" (para filtros no Supabase). */
export const STATUS_EM_ABERTO = ['PENDING', 'OVERDUE', 'pendente', 'vencida', 'AWAITING_RISK_ANALYSIS'];

export function statusParaCliente(status: string | null | undefined, vencimento?: string | null): StatusCliente {
  const s = String(status || '').toUpperCase().trim();
  if (PAGAS.includes(s)) return 'paga';
  if (CANCELADAS.includes(s)) return 'cancelada';
  if (VENCIDAS.includes(s)) return 'vencida';
  if (vencimento) {
    const hoje = new Date().toISOString().slice(0, 10);
    if (String(vencimento).slice(0, 10) < hoje) return 'vencida';
  }
  return 'pendente';
}

export const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '');
