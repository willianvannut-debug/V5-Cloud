// lib/planos-v5.ts
// TABELA ÚNICA de preços da assinatura do V5 Cloud.
// A página de Preços usa para MOSTRAR e o /api/checkout usa para COBRAR.
// Para mudar um preço, mude só aqui.

export const PLANOS_V5 = {
  essencial: { nome: 'Plano Essencial V5 Cloud', mensal: 29700, anual: 280000 },
  pro: { nome: 'Plano Pro V5 Cloud', mensal: 59700, anual: 570000 },
  scale: { nome: 'Plano Scale V5 Cloud', mensal: 99700, anual: 950000 },
} as const; // valores em centavos

export type ChavePlano = keyof typeof PLANOS_V5;
export type Intervalo = 'month' | 'year';

export function ehChavePlano(v: unknown): v is ChavePlano {
  return typeof v === 'string' && v in PLANOS_V5;
}

export function precoEmCentavos(chave: ChavePlano, intervalo: Intervalo): number {
  return intervalo === 'year' ? PLANOS_V5[chave].anual : PLANOS_V5[chave].mensal;
}

// 29700 -> "297" ; 280000 -> "2.800" ; 29750 -> "297,50"
export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}