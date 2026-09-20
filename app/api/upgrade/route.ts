//app/api/webhook/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { empresaId, plano } = body;

    const planoLimpo = String(plano || 'pro').toLowerCase().trim();
    console.log(`🔍 [API UPGRADE] UUID da Empresa Recebido: ${empresaId} | Plano: "${planoLimpo}"`);

    // Validação rígida: se não veio o UUID exato, a API barra para não atualizar errado
    if (!empresaId || empresaId === 'null' || empresaId === 'undefined') {
      console.error("❌ [API UPGRADE] Erro: ID da empresa não foi enviado na requisição.");
      return NextResponse.json({ 
        sucesso: false, 
        mensagem: 'O ID UUID da empresa é obrigatório.' 
      }, { status: 400 });
    }

    // Executa o update usando rigorosamente a coluna 'id' (uuid)
    console.log(`⚡ [API UPGRADE] Atualizando a empresa com ID [${empresaId}] para o plano [${planoLimpo}]...`);
    const { data: dadosUpdate, error: errorUpdate } = await supabaseAdmin
      .from('empresas')
      .update({ plano: planoLimpo })
      .eq('id', empresaId) // <-- Aqui usamos o UUID exato da sua tabela!
      .select();

    if (errorUpdate) {
      console.error("❌ [API UPGRADE] Erro no Supabase:", errorUpdate.message);
      return NextResponse.json({ sucesso: false, mensagem: errorUpdate.message }, { status: 500 });
    }

    if (!dadosUpdate || dadosUpdate.length === 0) {
      console.warn(`⚠️ [API UPGRADE] Nenhuma empresa encontrada com o ID: ${empresaId}`);
      return NextResponse.json({ sucesso: false, mensagem: 'Empresa não encontrada.' }, { status: 404 });
    }

    console.log("✅ [API UPGRADE] SUCESSO! Plano atualizado na empresa correta:", dadosUpdate);
    return NextResponse.json({ sucesso: true, dados: dadosUpdate });

  } catch (err: any) {
    console.error("❌ [API UPGRADE] Erro interno:", err);
    return NextResponse.json({ sucesso: false, mensagem: err.message || 'Erro interno' }, { status: 500 });
  }
}