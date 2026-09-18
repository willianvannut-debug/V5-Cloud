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
    
    // 1. Busca os dados atualizados do operador no banco
    const { data: operador, error: errOp } = await supabaseAdmin
      .from('operadores')
      .select('id, nome, email, role, empresa_id')
      .eq('email', payload.email)
      .single();

    if (errOp || !operador) {
      return NextResponse.json({ sucesso: false, mensagem: 'Operador não encontrado.' }, { status: 404 });
    }

    // 2. Busca os dados completos da empresa vinculada
    let empresaData = null;
    if (operador.empresa_id) {
      const { data: empresa, error: errEmp } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .eq('id', operador.empresa_id)
        .single();

      if (!errEmp) {
        empresaData = empresa;
      }
    }

    return NextResponse.json({
      sucesso: true,
      operador: {
        nome: operador.nome,
        email: operador.email,
        role: operador.role,
        empresaId: operador.empresa_id,
        empresa: empresaData ? {
          id: empresaData.id,
          nome_empresa: empresaData.nome_empresa,
          codigo_convite: empresaData.codigo_convite,
          endereco: empresaData.endereco,
          plano: empresaData.plano || 'essencial'
        } : null
      },
      empresa: empresaData ? {
        id: empresaData.id,
        nomeEmpresa: empresaData.nome_empresa,
        codigoConvite: empresaData.codigo_convite,
        endereco: empresaData.endereco,
        plano: String(empresaData.plano || 'essencial').toLowerCase().trim() // 🚀 Incluído o plano real aqui!
      } : null
    });

  } catch (err) {
    console.error("Erro na API /me:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Sessão inválida.' }, { status: 401 });
  }
}