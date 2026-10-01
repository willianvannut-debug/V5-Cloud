//app/api/admin/tickets/route.ts

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
  if (operador.role !== 'superadmin') return null; // só admin pode acessar

  return operador;
}

// Listar todos os tickets (admin)
export async function GET() {
  try {
    const admin = await getOperadorAdminLogado();

    if (!admin) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Acesso negado.' },
        { status: 403 }
      );
    }

    const { data: tickets, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .select('*')
      .order('criado_at', { ascending: false });

    if (error) throw error;

    // Busca nome dos operadores donos dos tickets, pra exibir no painel
    const userIds = [...new Set((tickets || []).map(t => t.user_id))];
    let nomesPorId: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: operadores } = await supabaseAdmin
        .from('operadores')
        .select('id, nome, email')
        .in('id', userIds);

      (operadores || []).forEach(op => {
        nomesPorId[op.id] = op.nome || op.email;
      });
    }

    const ticketsComNome = (tickets || []).map(t => ({
      ...t,
      cliente_nome: nomesPorId[t.user_id] || 'Desconhecido'
    }));

    return NextResponse.json({ sucesso: true, tickets: ticketsComNome });
  } catch (err: any) {
    console.error('Erro ao buscar tickets (admin):', err);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro ao buscar tickets.' },
      { status: 500 }
    );
  }
}