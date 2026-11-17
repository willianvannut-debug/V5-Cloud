// app/api/servidores/route.ts
// GET + POST de servidores MikroTik com verificação de limite por plano.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmpresaDaSessao } from '@/lib/auth-server';
import { verificarLimite } from '@/lib/verificarLimite';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Lista servidores MikroTik da empresa
export async function GET(req: Request) {
  try {
    const sessao = await getEmpresaDaSessao(req);
    if (!sessao) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('mikrotik_servers')
      .select('id, name, status, ip_address, identity, version, model')
      .eq('empresa_id', sessao.empresaId)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Cadastrar novo servidor MikroTik (com verificação de limite)
export async function POST(req: Request) {
  try {
    const sessao = await getEmpresaDaSessao(req);
    if (!sessao) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // ✅ Verificar limite de servidores do plano
    const limite = await verificarLimite(sessao.empresaId, 'max_servidores');
    if (!limite.permitido) {
      return NextResponse.json({ success: false, error: limite.mensagem }, { status: 403 });
    }

    const body = await req.json();
    const { name, ip_address, port, username, password } = body;

    if (!name || !ip_address || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Preencha nome, IP, usuário e senha do servidor.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('mikrotik_servers')
      .insert([{
        empresa_id: sessao.empresaId,
        name,
        ip_address,
        port: port || 8728,
        username,
        password,
        status: 'offline',
      }])
      .select('id, name, ip_address, status')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar servidor:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
