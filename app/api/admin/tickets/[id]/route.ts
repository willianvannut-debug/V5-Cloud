//app/api/admin/tickets/[id]/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
     process.env.JWT_SECRET_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getOperadorAdminLogado() {
  const cookieStore = await cookies();
  const token = cookieStore.get('v5_session')?.value;
  if (!token) return null;

  const { payload } = await jwtVerify(token, JWT_SECRET);

  const { data: operador, error } = await supabaseAdmin
    .from('operadores')
    .select('id, nome, email, role')
    .eq('email', payload.email)
    .single();

  if (error || !operador) return null;
  if (operador.role !== 'superadmin') return null;

  return operador;
}

// Atualizar status e/ou responder um ticket
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getOperadorAdminLogado();

    if (!admin) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Acesso negado.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { status, resposta } = await request.json();

    const camposAtualizados: Record<string, any> = {};

    if (status) {
      camposAtualizados.status = status;
    }

    if (resposta !== undefined) {
      camposAtualizados.resposta = resposta;
      camposAtualizados.respondido_em = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .update(camposAtualizados)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, ticket: data });
  } catch (err: any) {
    console.error('Erro ao atualizar ticket:', err);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro ao atualizar ticket.' },
      { status: 500 }
    );
  }
}