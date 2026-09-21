//app/api/empresa/atualizar-plano/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos a SERVICE_ROLE_KEY para ignorar as regras de bloqueio do RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { empresaId, plano } = await req.json();

    if (!empresaId || !plano) {
      return NextResponse.json({ sucesso: false, erro: 'Dados incompletos.' }, { status: 400 });
    }

    // Atualiza a coluna plano da empresa
    const { error } = await supabaseAdmin
      .from('empresas')
      .update({ plano: plano.toLowerCase().trim() })
      .eq('id', empresaId);

    if (error) {
      return NextResponse.json({ sucesso: false, erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
    
  } catch (error: any) {
    console.error("Erro na API de atualizar plano:", error);
    return NextResponse.json({ sucesso: false, erro: 'Erro interno no servidor.' }, { status: 500 });
  }
}