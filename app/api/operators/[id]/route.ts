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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const operadorId = resolvedParams.id;

    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;

    if (!token) {
      return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    // 1. Confere se o operador logado é gerente da empresa
    const { data: operadorLogado, error: errOp } = await supabaseAdmin
      .from('operadores')
      .select('empresa_id, role')
      .eq('email', payload.email)
      .single();

    if (errOp || !operadorLogado || operadorLogado.role !== 'gerente') {
      return NextResponse.json({ sucesso: false, mensagem: 'Apenas gerentes podem remover colaboradores.' }, { status: 403 });
    }

    // 2. Confere se o funcionário a ser apagado pertence à mesma empresa
    const { data: alvo, error: errAlvo } = await supabaseAdmin
      .from('operadores')
      .select('empresa_id, role')
      .eq('id', operadorId)
      .single();

    if (errAlvo || !alvo || alvo.empresa_id !== operadorLogado.empresa_id) {
      return NextResponse.json({ sucesso: false, mensagem: 'Colaborador não encontrado.' }, { status: 404 });
    }

    // Impede que o gerente delete a si mesmo por engano
    if (alvo.role === 'gerente') {
      return NextResponse.json({ sucesso: false, mensagem: 'Você não pode remover a conta do gerente principal por aqui.' }, { status: 400 });
    }

    // 3. Deleta o registro definitivamente do Supabase
    const { error: errDelete } = await supabaseAdmin
      .from('operadores')
      .delete()
      .eq('id', operadorId);

    if (errDelete) {
      console.error("Erro ao deletar no Supabase:", errDelete);
      return NextResponse.json({ sucesso: false, mensagem: 'Erro ao remover colaborador do banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, mensagem: 'Colaborador removido com sucesso!' });

  } catch (err) {
    console.error("Erro na API DELETE /api/operators/[id]:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno no servidor.' }, { status: 500 });
  }
}