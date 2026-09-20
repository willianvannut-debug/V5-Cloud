// lib/audit.ts

import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com a chave de serviço (Admin)
// Isso é essencial para rodar no backend (app/api/...) com segurança total
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface AuditLogParams {
  empresaId?: string | null;
  operadorEmail: string;
  acao: string;
  entidadeTipo: string;
  entidadeId?: string | null;
  detalhes?: Record<string, any>;
  ip?: string;
}

export async function registrarLog({
  empresaId = null,
  operadorEmail,
  acao,
  entidadeTipo,
  entidadeId = null,
  detalhes = {},
  ip = '127.0.0.1'
}: AuditLogParams) {
  try {
    const { error } = await supabaseAdmin.from('auditoria_logs').insert({
      empresa_id: empresaId,
      operador_email: operadorEmail,
      acao: acao.toUpperCase(),
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      detalhes: detalhes, // Agora recebe o objeto JSON diretamente
      ip: ip
    });

    if (error) {
      console.error('[Audit Error] Falha ao registrar log no Supabase:', error.message);
    }
  } catch (err) {
    console.error('[Audit Error] Erro inesperado ao tentar salvar auditoria:', err);
  }
}