// lib/verificarLimite.ts
// Utilitário central para checar limites de plano antes de inserir qualquer recurso.
// Usado pelas rotas: operadores, técnicos, servidores, assinantes.

import { createClient } from '@supabase/supabase-js';
import { PLANOS } from '@/lib/planLimites';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RecursoLimitado = 'max_tecnicos' | 'max_vendedores' | 'max_servidores' | 'max_assinantes';

const LABEL: Record<RecursoLimitado, string> = {
  max_tecnicos: 'técnico(s)',
  max_vendedores: 'vendedor(es)',
  max_servidores: 'servidor(es) MikroTik',
  max_assinantes: 'assinante(s)',
};

const TABELA: Record<RecursoLimitado, { tabela: string; filtro?: Record<string, string> }> = {
  max_tecnicos:   { tabela: 'operadores',       filtro: { role: 'tecnico' } },
  max_vendedores: { tabela: 'operadores',       filtro: { role: 'vendedor' } },
  max_servidores: { tabela: 'mikrotik_servers', filtro: {} },
  // ativo + bloqueado = cliente ainda no provedor (bloqueado = inadimplente, não cancelado)
  max_assinantes: { tabela: 'clientes',         filtro: {} },
};

/**
 * Verifica se a empresa pode criar mais um recurso do tipo informado.
 *
 * @returns `{ permitido: true }` ou `{ permitido: false, mensagem: string }`
 */
export async function verificarLimite(
  empresaId: string,
  recurso: RecursoLimitado
): Promise<{ permitido: boolean; mensagem?: string }> {
  // 1. Busca o plano da empresa
  const { data: empresa, error: erroEmpresa } = await supabase
    .from('empresas')
    .select('plano')
    .eq('id', empresaId)
    .single();

  if (erroEmpresa || !empresa) {
    return { permitido: false, mensagem: 'Empresa não encontrada.' };
  }

  const planoAtual = (empresa.plano || 'essencial').toLowerCase().trim();
  const limites = PLANOS[planoAtual] || PLANOS['essencial'];
  const limite: number = limites[recurso] ?? 0;

  // Enterprise sem limite numérico
  if (typeof limite !== 'number') return { permitido: true };

  // 2. Conta quantos já existem
  const { tabela, filtro = {} } = TABELA[recurso];

  let query = supabase
    .from(tabela)
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', empresaId);

  for (const [coluna, valor] of Object.entries(filtro)) {
    query = query.eq(coluna, valor);
  }

  // Para assinantes: contar ativo + bloqueado, excluir cancelados
  if (recurso === 'max_assinantes') {
    query = query.neq('status', 'cancelado');
  }

  const { count, error: erroContagem } = await query;

  if (erroContagem) {
    return { permitido: false, mensagem: 'Erro ao verificar limite.' };
  }

  const total = count ?? 0;

  if (total >= limite) {
    return {
      permitido: false,
      mensagem: `Limite atingido! Seu plano ${planoAtual} permite apenas ${limite} ${LABEL[recurso]}. Faça upgrade para adicionar mais.`,
    };
  }

  return { permitido: true };
}
