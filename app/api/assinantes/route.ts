// app/api/assinantes/route.ts
// GET + POST de assinantes/clientes com verificação de limite por plano.
// O limite conta apenas clientes com status = 'ativo'.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { verificarLimite } from '@/lib/verificarLimite';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

async function getEmpresaId(request: NextRequest): Promise<string | null> {
  const cookie = request.cookies.get('v5_session');
  if (!cookie?.value) return null;
  try {
    const { payload } = await jwtVerify(cookie.value, JWT_SECRET);
    return (payload.empresaId as string) || null;
  } catch {
    return null;
  }
}

// GET - Lista assinantes da empresa
export async function GET(request: NextRequest) {
  try {
    const empresaId = await getEmpresaId(request);
    if (!empresaId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // filtro opcional: ativo, inativo, etc.

    let query = supabase
      .from('clientes')
      .select('id, nome, email, cpf_cnpj, telefone, status, plano_nome, criado_em')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ sucesso: true, data: data || [] });
  } catch (error: any) {
    console.error('Erro ao listar assinantes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Cadastrar novo assinante (com verificação de limite)
export async function POST(request: NextRequest) {
  try {
    const empresaId = await getEmpresaId(request);
    if (!empresaId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // ✅ Verificar limite de assinantes ativos do plano
    const limite = await verificarLimite(empresaId, 'max_assinantes');
    if (!limite.permitido) {
      return NextResponse.json({ sucesso: false, error: limite.mensagem }, { status: 403 });
    }

    const body = await request.json();
    const { nome, email, cpf_cnpj, telefone, endereco, plano_nome, pppoe_usuario, pppoe_senha } = body;

    if (!nome || !cpf_cnpj) {
      return NextResponse.json(
        { sucesso: false, error: 'Nome e CPF/CNPJ são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        empresa_id: empresaId,
        nome,
        email: email || null,
        cpf_cnpj,
        telefone: telefone || null,
        endereco: endereco || null,
        plano_nome: plano_nome || null,
        pppoe_usuario: pppoe_usuario || null,
        pppoe_senha: pppoe_senha || null,
        status: 'ativo',
        criado_em: new Date().toISOString(),
      }])
      .select('id, nome, email, status')
      .single();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar assinante:', error);
    return NextResponse.json({ sucesso: false, error: error.message }, { status: 500 });
  }
}
