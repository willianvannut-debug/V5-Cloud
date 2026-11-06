// ============================================
// V5 Fibra - Formatadores
// ============================================

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Remove máscara do CPF
 */
export function unmaskCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Formata valor em reais: R$ 99,90
 * Aceita number ou string (banco armazena como TEXT)
 */
export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata data: 23/10/2026
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

/**
 * Formata velocidade (campo TEXT do banco, ex: "300 Mbps")
 * Se já tiver unidade, retorna como está. Se for só número, adiciona Mbps.
 */
export function formatSpeed(speed: string | number): string {
  if (typeof speed === 'string') {
    if (/[a-zA-Z]/.test(speed)) return speed;
    const num = parseFloat(speed);
    if (isNaN(num)) return speed;
    if (num >= 1000) return `${(num / 1000).toFixed(0)} Gbps`;
    return `${num} Mbps`;
  }
  if (speed >= 1000) {
    return `${(speed / 1000).toFixed(0)} Gbps`;
  }
  return `${speed} Mbps`;
}

/**
 * Retorna label e cor do status da fatura
 */
export function getFaturaStatusInfo(status: string): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'paga':
      return { label: 'Paga', color: '#10B981' };
    case 'pendente':
      return { label: 'Pendente', color: '#F59E0B' };
    case 'vencida':
      return { label: 'Vencida', color: '#EF4444' };
    case 'cancelada':
      return { label: 'Cancelada', color: '#6B7280' };
    default:
      return { label: status, color: '#6B7280' };
  }
}

/**
 * Retorna label e cor do status do ticket
 */
export function getTicketStatusInfo(status: string): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'aberto':
      return { label: 'Aberto', color: '#3B82F6' };
    case 'em_andamento':
      return { label: 'Em andamento', color: '#F59E0B' };
    case 'resolvido':
      return { label: 'Resolvido', color: '#10B981' };
    case 'fechado':
      return { label: 'Fechado', color: '#6B7280' };
    default:
      return { label: status, color: '#6B7280' };
  }
}

/**
 * Retorna label e cor do status da conexão
 */
export function getConnectionStatusInfo(status: string): {
  label: string;
  color: string;
} {
  switch (status) {
    case 'ativo':
      return { label: 'Ativo', color: '#10B981' };
    case 'bloqueado':
      return { label: 'Bloqueado', color: '#EF4444' };
    case 'suspenso':
      return { label: 'Suspenso', color: '#F59E0B' };
    case 'cancelado':
      return { label: 'Cancelado', color: '#6B7280' };
    default:
      return { label: status, color: '#6B7280' };
  }
}
