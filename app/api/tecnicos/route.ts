// ================================================================================
// ROTA DE TÉCNICOS - GET + POST
// Caminho: app/api/tecnicos/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { PLANOS } from '@/lib/planLimites';

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
// GET - Listar técnicos (busca na tabela operadores onde role = 'tecnico')
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
// POST - Criar técnico (mantém a lógica original com validação de plano)
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

    // Buscar plano da empresa
    const { data: dadosEmpresa, error: erroEmpresa } = await supabase
      .from('empresas')
      .select('plano')
      .eq('id', empresaIdAlvo)
      .single();

    if (erroEmpresa || !dadosEmpresa) {
      return NextResponse.json({ error: 'Empresa não encontrada no sistema.' }, { status: 404 });
    }

    const planoAtual = (dadosEmpresa.plano || 'essencial').toLowerCase().trim();
    const limiteTecnicos = PLANOS[planoAtual]?.max_tecnicos || 2;

    // Contar técnicos da empresa (na tabela operadores)
    const { count, error: erroContagem } = await supabase
      .from('operadores')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaIdAlvo)
      .eq('role', 'tecnico');

    const totalTecnicos = count || 0;

    if (totalTecnicos >= limiteTecnicos) {
      return NextResponse.json(
        { error: `Limite atingido! Seu plano permite apenas ${limiteTecnicos} técnico(s).` }, 
        { status: 403 }
      );
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