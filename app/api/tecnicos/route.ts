// ================================================================================
// ROTA DE TÉCNICOS - GET + POST
// Caminho: app/api/tecnicos/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { verificarLimite } from '@/lib/verificarLimite';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_SECRET = process.env.API_SECRET;
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

async function validarAutorizacao(request: NextRequest): Promise<{
  autorizado: boolean;
  empresaIdSessao?: string;
}> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (API_SECRET && token === API_SECRET) {
    return { autorizado: true };
  }

  const cookieSessao = request.cookies.get('v5_session');
  if (cookieSessao?.value) {
    try {
      const { payload } = await jwtVerify(cookieSessao.value, JWT_SECRET);
      return {
        autorizado: true,
        empresaIdSessao: payload.empresaId as string
      };
    } catch (e) {
      console.error('Erro ao verificar JWT:', e);
    }
  }

  return { autorizado: false };
}

// ============================================================
// GET - Listar técnicos
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado || !auth.empresaIdSessao) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('operadores')
      .select('id, nome, email, criado_em')
      .eq('empresa_id', auth.empresaIdSessao)
      .eq('role', 'tecnico')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar técnicos:', error);
      return NextResponse.json({ error: 'Erro ao buscar técnicos' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ============================================================
// POST - Criar técnico (com verificarLimite centralizado)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const empresaIdAlvo = body.empresa_id || auth.empresaIdSessao;

    if (!empresaIdAlvo) {
      return NextResponse.json({ error: 'ID da empresa não encontrado na sessão.' }, { status: 400 });
    }

    // ✅ Verificação de limite centralizada
    const limite = await verificarLimite(empresaIdAlvo, 'max_tecnicos');
    if (!limite.permitido) {
      return NextResponse.json({ error: limite.mensagem }, { status: 403 });
    }

    // Criar operador com role tecnico
    const bcrypt = await import('bcryptjs');
    const senhaHash = await bcrypt.hash(body.senha || '123456', 10);

    const { error: insertError } = await supabase
      .from('operadores')
      .insert([{
        empresa_id: empresaIdAlvo,
        nome: body.nome,
        email: body.email,
        senha_hash: senhaHash,
        role: 'tecnico',
      }]);

    if (insertError) {
      console.error("Erro ao inserir técnico:", insertError);
      return NextResponse.json({ error: "Erro ao cadastrar técnico." }, { status: 400 });
    }

    return NextResponse.json({ sucesso: "Técnico cadastrado com sucesso!" }, { status: 201 });

  } catch (error) {
    console.error("Erro interno:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
