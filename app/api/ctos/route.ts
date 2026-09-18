import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { registrarLog } from '../../../lib/audit';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Cliente Supabase Admin para garantir que a API consegue gravar e ler dados
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

// Função auxiliar para pegar o usuário logado a partir do cookie (JWT)
async function getUsuarioLogado() {
  const cookieStore = await cookies();
  const token = cookieStore.get('v5_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload; // Retorna { email, role, empresaId }
  } catch (e) {
    return null;
  }
}

// 🟢 POST: CRIAR NOVA CTO
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const usuario = await getUsuarioLogado();

  if (!usuario || !usuario.empresaId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado ou sem empresa vinculada' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nome, latitude, longitude, portas } = body; 

    // 1. Insere a CTO no banco de dados vinculada à empresa do usuário
    const { data: novaCto, error } = await supabaseAdmin
      .from('ctos')
      .insert([
        { 
          nome, 
          latitude, 
          longitude, 
          portas, 
          empresa_id: usuario.empresaId 
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // 2. DISPARA A AUDITORIA DINÂMICA
    await registrarLog({
      empresaId: usuario.empresaId as string,
      operadorEmail: usuario.email as string,
      acao: 'CRIAR_CTO',
      entidadeTipo: 'cto',
      entidadeId: novaCto.id, // ID real gerado pelo banco
      detalhes: { nome: novaCto.nome, portas: novaCto.portas },
      ip
    });

    return NextResponse.json({ sucesso: true, cto: novaCto });
  } catch (error: any) {
    console.error("Erro ao criar CTO:", error);
    return NextResponse.json({ sucesso: false, erro: 'Erro interno ao criar CTO' }, { status: 500 });
  }
}

// 🔴 DELETE: EXCLUIR CTO
export async function DELETE(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const usuario = await getUsuarioLogado();

  if (!usuario || !usuario.empresaId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Pega o ID da CTO que veio na URL (ex: /api/ctos?id=123)
    const { searchParams } = new URL(request.url);
    const idCto = searchParams.get('id');

    if (!idCto) {
      return NextResponse.json({ sucesso: false, erro: 'ID da CTO não informado' }, { status: 400 });
    }

    // Opcional: Busca os dados da CTO antes de apagar para guardar no log como backup visual
    const { data: ctoAntiga } = await supabaseAdmin
      .from('ctos')
      .select('*')
      .eq('id', idCto)
      .eq('empresa_id', usuario.empresaId)
      .single();

    // 1. Apaga a CTO do banco (garantindo que pertence à mesma empresa do operador)
    const { error } = await supabaseAdmin
      .from('ctos')
      .delete()
      .eq('id', idCto)
      .eq('empresa_id', usuario.empresaId);

    if (error) throw error;

    // 2. DISPARA A AUDITORIA DINÂMICA
    await registrarLog({
      empresaId: usuario.empresaId as string,
      operadorEmail: usuario.email as string,
      acao: 'EXCLUIR_CTO',
      entidadeTipo: 'cto',
      entidadeId: idCto,
      detalhes: { cto_removida: ctoAntiga || 'Dados não encontrados' }, // Salva o payload antigo
      ip
    });

    return NextResponse.json({ sucesso: true, mensagem: 'CTO removida com sucesso' });
  } catch (error: any) {
    console.error("Erro ao excluir CTO:", error);
    return NextResponse.json({ sucesso: false, erro: 'Erro interno ao excluir CTO' }, { status: 500 });
  }
}