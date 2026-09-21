// ================================================================================
// 🔒 ROTA DE TÉCNICOS - SUPABASE (CRIAÇÃO COM VALIDAÇÃO DE LIMITES REAL)
// app/api/tecnicos/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { PLANOS } from '@/lib/planLimites';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_SECRET = process.env.API_SECRET;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

// Função para validar a sessão (igual a que usamos nos leads)
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

export async function POST(request: NextRequest) {
  try {
    // 1. Verifica se quem está a chamar a API está autenticado
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const empresaIdAlvo = body.empresa_id || auth.empresaIdSessao;

    if (!empresaIdAlvo) {
      return NextResponse.json({ error: 'ID da empresa não encontrado na sessão.' }, { status: 400 });
    }

    // 2. Buscar o PLANO REAL da empresa no banco de dados
    const { data: dadosEmpresa, error: erroEmpresa } = await supabase
      .from('empresas')
      .select('plano')
      .eq('id', empresaIdAlvo)
      .single();

    if (erroEmpresa || !dadosEmpresa) {
      return NextResponse.json({ error: 'Empresa não encontrada no sistema.' }, { status: 404 });
    }

    const planoAtual = (dadosEmpresa.plano || 'essencial').toLowerCase().trim();
    const limiteTecnicos = PLANOS[planoAtual]?.max_tecnicos || 2; // Puxa o limite dinâmico

    // 3. Contar quantos técnicos REAIS essa empresa já tem cadastrados
    // (Nota: Ajusta o nome da tabela se os teus técnicos ficarem em 'usuarios' com perfil='TECNICO')
    const tabelaTecnicos = 'tecnicos'; // Ou 'usuarios' dependendo do teu banco
    
    let queryContagem = supabase.from(tabelaTecnicos).select('*', { count: 'exact', head: true }).eq('empresa_id', empresaIdAlvo);
    
    // Descomenta a linha abaixo se usares a tabela "usuarios" genérica para separar só os técnicos
    // queryContagem = queryContagem.eq('perfil', 'TECNICO');

    const { count, error: erroContagem } = await queryContagem;

    const totalTecnicosNoBanco = count || 0;

    // 4. Bloqueia se atingiu o limite do plano
    if (totalTecnicosNoBanco >= limiteTecnicos) {
      return NextResponse.json(
        { error: `Limite atingido! O teu plano (${PLANOS[planoAtual]?.nome}) permite apenas ${limiteTecnicos} técnico(s).` }, 
        { status: 403 }
      );
    }

    // 5. Se passou, SALVA O TÉCNICO NO BANCO DE DADOS
    const novoTecnico = {
      empresa_id: empresaIdAlvo,
      nome: body.nome,
      email: body.email,
      telefone: body.telefone,
      // Se usares a tabela 'usuarios', adiciona: perfil: 'TECNICO',
    };

    const { error: insertError } = await supabase
      .from(tabelaTecnicos)
      .insert([novoTecnico]);

    if (insertError) {
      console.error("Erro ao inserir técnico no Supabase:", insertError);
      return NextResponse.json({ error: "Erro ao cadastrar técnico no banco de dados." }, { status: 400 });
    }

    return NextResponse.json({ sucesso: "Técnico cadastrado com sucesso!" }, { status: 201 });

  } catch (error) {
    console.error("Erro interno no servidor (API Técnicos):", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}