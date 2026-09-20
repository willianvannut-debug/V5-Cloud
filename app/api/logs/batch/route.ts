// app/api/logs/batch/route.ts
// Endpoint para enviar múltiplos logs em lote

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/logs/batch
 * Recebe múltiplos logs e salva no Supabase em lote
 */
export async function POST(request: Request) {
  try {
    const { logs } = await request.json();
    
    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Nenhum log para processar' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    // Formata todos os logs
    const logsFormatados = logs.map((log: any) => ({
      nivel: log.nivel,
      acao: log.acao,
      entidade: log.entidade,
      mensagem: log.mensagem,
      operador_email: log.operadorEmail || null,
      operador_id: log.operadorId || null,
      empresa_id: log.empresaId || null,
      entidade_id: log.entidadeId || null,
      ip,
      user_agent: userAgent,
      detalhes: log.detalhes || {},
      timestamp: log.timestamp || new Date().toISOString(),
      criado_em: new Date().toISOString(),
    }));

    // Salva em lote
    const { data, error } = await supabaseAdmin
      .from('logs_sistema')
      .insert(logsFormatados)
      .select();

    if (error) {
      console.error('Erro ao salvar logs em lote:', error);
      return NextResponse.json(
        { sucesso: false, mensagem: 'Erro ao salvar logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      quantidade: data?.length || logsFormatados.length,
    });
  } catch (erro: any) {
    console.error('Erro no endpoint de logs batch:', erro);
    return NextResponse.json(
      { sucesso: false, mensagem: erro.message },
      { status: 500 }
    );
  }
}
