// ================================================================================
// 📋 CONFIGURAÇÃO DE PLANOS E LIMITES - V5 CLOUD
// lib/planLimites.ts
// ================================================================================

export const PLANOS: Record<string, any> = {
  essencial: {
    nome: 'Essencial',
    leads_base: 80,
    leads_bonus: 30,
    max_leads: 110,
    max_ctos: 150,
    max_vendedores: 1,
    max_tecnicos: 2,
    preco_excedente: 1.50, 
  },
  pro: {
    nome: 'Pro',
    leads_base: 300,
    leads_bonus: 60,
    max_leads: 360,
    max_ctos: 600,
    max_vendedores: 3,
    max_tecnicos: 10,
    preco_excedente: 1.50, 
  },
  scale: {
    nome: 'Scale',
    leads_base: 500,
    leads_bonus: 90,
    max_leads: 590,
    max_ctos: 15000,
    max_vendedores: 10,
    max_tecnicos: 30,
    preco_excedente: 1.50, 
  },
  enterprise: {
    nome: 'Enterprise',
    nome_exibicao: 'Sob Consulta',
    max_leads: 'CUSTOMIZADO',
    max_ctos: 999999,
    max_vendedores: 999999,
    max_tecnicos: 999999,
    preco_excedente: 0,
  }
};

/**
 * ✅ Função que pega o plano vindo do Supabase e retorna os limites correspondentes de forma segura
 */
export function obterLimitesDaEmpresa(planoDoBanco?: string) {
  const chave = (planoDoBanco || 'essencial').toLowerCase().trim();
  return PLANOS[chave] || PLANOS['essencial'];
}