// ================================================================================
// 📋 CONFIGURAÇÃO DE PLANOS E LIMITES - V5 CLOUD
// lib/planLimites.ts
// ================================================================================

export const PLANOS: Record<string, any> = {
  essencial: {
    nome: 'Essencial',
    max_assinantes: 300,
    leads_base: 70,
    leads_bonus: 30,
    max_leads: 100,
    max_vendedores: 1,
    max_vendedores_campo: 2,
    max_tecnicos: 2,
    max_servidores: 1,
    preco_excedente: 1.50, 
  },
  pro: {
    nome: 'Pro',
    max_assinantes: 1000,
    leads_base: 150,
    leads_bonus: 60,
    max_leads: 210,
    max_vendedores: 10,
    max_vendedores_campo: 10,
    max_tecnicos: 10,
    max_servidores: 3,
    preco_excedente: 1.50,  
  },
  scale: {
    nome: 'Scale',
    max_assinantes: 3000,
    leads_base: 500,
    leads_bonus: 100,
    max_leads: 600,
    max_vendedores: 25,
    max_vendedores_campo: 25,
    max_tecnicos: 30,
    max_servidores: 10,
    preco_excedente: 1.50, 
  },
  enterprise: {
    nome: 'Enterprise',
    nome_exibicao: 'Sob Consulta',
    max_leads: 'CUSTOMIZADO',
    max_vendedores: 500,
    max_vendedores_campo: 500,
    max_tecnicos: 500,
    max_servidores: 500,
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