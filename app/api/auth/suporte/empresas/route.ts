//app/api/auth/suporte/empresas/route.ts

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
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ sucesso: false, mensagem: 'Acesso negado.' }, { status: 403 });
    }

    // Busca todas as empresas cadastradas
    const { data: empresas, error } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_empresa, endereco, codigo_convite, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, empresas });
  } catch (err) {
    return NextResponse.json({ sucesso: false, mensagem: 'Erro na requisição.' }, { status: 500 });
  }
}