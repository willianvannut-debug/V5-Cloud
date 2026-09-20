// lib/verificarLimites.ts

import { PLANOS, TipoPlano } from './planLimites';

export async function verificarLimiteTecnicos(planoAtual: TipoPlano, totalTecnicosCadastrados: number) {
  const limiteMaximo = PLANOS[planoAtual].max_tecnicos;

  if (totalTecnicosCadastrados >= limiteMaximo) {
    return {
      bloqueado: true,
      mensagem: `Limite de ${limiteMaximo} técnicos atingido no plano ${planoAtual.toUpperCase()}. Faça o upgrade para expandir!`
    };
  }

  return { bloqueado: false };
}