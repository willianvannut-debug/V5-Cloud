import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;

    if (!token) {
      return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // 1. Descobre qual é a empresa do operador logado (gerente)
    const { data: operadorLogado, error: errOp } = await supabaseAdmin
      .from('operadores')
      .select('empresa_id')
      .eq('email', payload.email)
      .single();

    if (errOp || !operadorLogado || !operadorLogado.empresa_id) {
      return NextResponse.json({ sucesso: false, mensagem: 'Empresa não encontrada para este operador.' }, { status: 404 });
    }

    // 2. Busca todos os operadores vinculados a essa mesma empresa
    const { data: operadoresEmpresa, error: errEmpresa } = await supabaseAdmin
      .from('operadores')
      .select('id, nome, email, role, criado_em')
      .eq('empresa_id', operadorLogado.empresa_id);

    // 🔍 Log de diagnóstico para vermos no terminal o que o banco está retornando
    console.log("🔍 OPERADORES ENCONTRADOS NO BANCO:", operadoresEmpresa);

    if (errEmpresa) {
      console.error("Erro na consulta do Supabase:", errEmpresa);
      return NextResponse.json({ sucesso: false, mensagem: 'Erro ao buscar operadores.' }, { status: 500 });
    }

    return NextResponse.json({
      sucesso: true,
      operadores: operadoresEmpresa || []
    });

  } catch (err) {
    console.error("Erro na API /api/operators:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno no servidor.' }, { status: 500 });
  }
}