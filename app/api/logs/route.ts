// app/api/logs/route.ts
// Endpoint que recebe logs e salva no Supabase

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * POST /api/logs
 * Recebe um log individual e salva no Supabase
 */
export async function POST(request: Request) {
  try {
    const logData = await request.json();
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    // Estrutura o log para salvar no Supabase
    const logFormatado = {
      nivel: logData.nivel,
      acao: logData.acao,
      entidade: logData.entidade,
      mensagem: logData.mensagem,
      operador_email: logData.operadorEmail || null,
      operador_id: logData.operadorId || null,
      empresa_id: logData.empresaId || null,
      entidade_id: logData.entidadeId || null,
      ip,
      user_agent: userAgent,
      detalhes: logData.detalhes || {},
      timestamp: logData.timestamp || new Date().toISOString(),
      criado_em: new Date().toISOString(),
    };

    // Salva no Supabase
    const { data, error } = await supabaseAdmin
      .from('logs_sistema')
      .insert([logFormatado])
      .select();

    if (error) {
      console.error('Erro ao salvar log no Supabase:', error);
      return NextResponse.json(
        { sucesso: false, mensagem: 'Erro ao salvar log' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sucesso: true, id: data?.[0]?.id });
  } catch (erro: any) {
    console.error('Erro no endpoint de logs:', erro);
    return NextResponse.json(
      { sucesso: false, mensagem: erro.message },
      { status: 500 }
    );
  }
}
