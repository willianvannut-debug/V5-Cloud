// ============================================
// V5 Fibra - Tipos do App
// ============================================

export interface Cliente {
  id: string;
  empresa_id: string;
  tipo_pessoa: string | null;
  nome: string;
  cpf: string;
  rg: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  status: string;
  dia_vencimento: number | null;
  senha: string | null;
  created_at: string;
}

export interface Fatura {
  id: string;
  cliente_id: string;
  empresa_id: string;
  valor: string; // TEXT no banco
  status: string;
  data_vencimento: string;
  data_pagamento: string | null;
  data: string | null;
  mes: string | null;
  metodo: string | null;
  plano: string | null;
  identificador: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contrato {
  id: string;
  cliente_id: string;
  empresa_id: string;
  plano_id: string;
  data_inicio: string;
  data_vencimento: string | null;
  fidelidade_meses: number | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plano {
  id: string;
  empresa_id: string;
  nome: string;
  preco: string; // TEXT no banco
  velocidade: string; // TEXT no banco (ex: "300 Mbps")
  created_at: string;
}

export interface TicketAjuda {
  id: string;
  user_id: string;
  assunto: string;
  categoria: string;
  mensagem: string;
  prioridade: string | null;
  status: string;
  resposta: string | null;
  respondido_em: string | null;
  criado_at: string;
}

export interface Empresa {
  id: string;
  nome: string;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
}

// Contrato com plano join
export interface ContratoComPlano extends Contrato {
  plano: Plano;
}

// Sessão do usuário autenticado
export interface UserSession {
  cliente: Cliente;
  empresa: Empresa;
  token: string;
}
