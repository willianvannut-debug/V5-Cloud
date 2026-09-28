//app/api/tickets/route.ts

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

async function getOperadorLogado() {
  const cookieStore = await cookies();
  const token = cookieStore.get('v5_session')?.value;

  if (!token) return null;

  const { payload } = await jwtVerify(token, JWT_SECRET);

  const { data: operador, error } = await supabaseAdmin
    .from('operadores')
    .select('id, email')
    .eq('email', payload.email)
    .single();

  if (error || !operador) return null;

  return operador;
}

// Criar novo ticket
export async function POST(request: Request) {
  try {
    const operador = await getOperadorLogado();

    if (!operador) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Você precisa estar autenticado para enviar um ticket.' },
        { status: 401 }
      );
    }

    const { assunto, mensagem, categoria } = await request.json();

    if (!assunto || !mensagem) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Assunto e mensagem são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .insert([
        {
          user_id: operador.id,
          assunto,
          mensagem,
          categoria: categoria || 'outro',
          status: 'aberto'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sucesso: true, ticket: data });
  } catch (err: any) {
    console.error('Erro ao criar ticket:', err);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro ao enviar ticket: ' + err.message },
      { status: 500 }
    );
  }
}

// Listar tickets do operador logado
export async function GET() {
  try {
    const operador = await getOperadorLogado();

    if (!operador) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Não autenticado.' },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .select('*')
      .eq('user_id', operador.id)
      .order('criado_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sucesso: true, tickets: data });
  } catch (err: any) {
    console.error('Erro ao buscar tickets:', err);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro ao buscar tickets.' },
      { status: 500 }
    );
  }
}