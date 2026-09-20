//app/api/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SETTINGS_FILE = path.join(process.cwd(), 'data_settings.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

async function getUsuarioLogado(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return {
        email: String(payload.email || 'sistema@v5.com'),
        id: String(payload.sub || payload.id || payload.operador_id || '00000000-0000-0000-0000-000000000000'),
        empresaId: String(payload.empresa_id || payload.empresaId || '')
      };
    }
  } catch (e) {
    // Ignora erro do token se não existir
  }
  
  return {
    email: 'willianvannut@gmail.com',
    id: '00000000-0000-0000-0000-000000000000',
    empresaId: ''
  };
}

export async function GET(request: NextRequest) {
  try {
    let settingsData: any = {};

    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      settingsData = JSON.parse(data);
    }

    if (supabase) {
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('id, plano, nome_empresa, endereco')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!empresaError && empresaData) {
        settingsData.id = empresaData.id;
        if (empresaData.plano) {
          settingsData.planoAtivo = String(empresaData.plano).toLowerCase().trim();
        }
        if (empresaData.nome_empresa) {
          settingsData.nomeProvedor = empresaData.nome_empresa;
        }
        if (empresaData.endereco && empresaData.endereco !== 'Não informado') {
          settingsData.cidadeEmpresa = empresaData.endereco;
        }
      }

      const { data: ctosSupabase, error } = await supabase.from('ctos').select('*');
      
      if (!error && ctosSupabase && ctosSupabase.length > 0) {
        settingsData.ctos = ctosSupabase;
      }
    }

    return NextResponse.json(settingsData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error("Erro na API GET /api/settings:", error);
    return NextResponse.json(null, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const usuarioLogado = await getUsuarioLogado(request);
    
    let empresaIdAlvo = body.empresaId || body.id || usuarioLogado.empresaId || null;
    const operadorEmail = body.operadorEmail || usuarioLogado.email;
    const operadorId = usuarioLogado.id;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    if (supabase && !empresaIdAlvo) {
      const { data: ultimaEmpresa } = await supabase
        .from('empresas')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (ultimaEmpresa) {
        empresaIdAlvo = ultimaEmpresa.id;
      }
    }

    let dadosAntigos: any = { nome_empresa: '', endereco: '' };

    if (supabase && empresaIdAlvo) {
      // 🚀 1. CAPTURAR O ESTADO ANTERIOR DA EMPRESA
      const { data: empresaAntes } = await supabase
        .from('empresas')
        .select('nome_empresa, endereco')
        .eq('id', empresaIdAlvo)
        .maybeSingle();

      if (empresaAntes) {
        dadosAntigos = empresaAntes;
      }

      // 🚀 2. EXECUTAR A ATUALIZAÇÃO NO SUPABASE
      const { error: updateError } = await supabase
        .from('empresas')
        .update({
          nome_empresa: body.nomeProvedor,
          endereco: body.cidadeEmpresa
        })
        .eq('id', empresaIdAlvo);

      if (updateError) {
        console.error("❌ Erro ao atualizar tabela empresas no Supabase:", updateError.message);
        return NextResponse.json({ success: false, error: updateError.message }, { status: 400 });
      }
    }

    // Gravação segura no ficheiro local
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(body, null, 2), 'utf-8');

    // 🔍 3. DETEÇÃO EXCLUSIVA DE MUDANÇAS REAIS (Sem métricas fixas desnecessárias)
    const mudancas: string[] = [];
    
    const nomeAntigo = String(dadosAntigos?.nome_empresa || '').trim();
    const nomeNovo = String(body.nomeProvedor || '').trim();
    if (nomeAntigo !== nomeNovo) {
      mudancas.push(`Nome da Empresa: "${nomeAntigo || 'Vazio'}" ➔ "${nomeNovo || 'Vazio'}"`);
    }

    const enderecoAntigo = String(dadosAntigos?.endereco || '').trim();
    const enderecoNovo = String(body.cidadeEmpresa || '').trim();
    if (enderecoAntigo !== enderecoNovo) {
      mudancas.push(`Endereço/Localidade: "${enderecoAntigo || 'Vazio'}" ➔ "${enderecoNovo || 'Vazio'}"`);
    }

    // Se nenhuma alteração relevante foi feita nos campos principais
    if (mudancas.length === 0) {
      return NextResponse.json({ success: true }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const mensagemDetalhada = `Configurações alteradas por [${operadorEmail}] ➔ ${mudancas.join(' | ')}`;

    // 🚀 4. REGISTA O LOG APENAS COM O QUE FOI EFETIVAMENTE ALTERADO
    await logger.info(
      'ATUALIZAR_CONFIGURACOES',
      'sistema',
      mensagemDetalhada,
      { 
        empresaId: empresaIdAlvo,
        operadorId: operadorId,
        operadorEmail: operadorEmail,
        ip,
        auditoria: {
          responsavel: operadorEmail,
          operadorId: operadorId,
          antes: dadosAntigos,
          depois: {
            nome_empresa: body.nomeProvedor,
            endereco: body.cidadeEmpresa
          },
          alteracoesRealizadas: mudancas
        }
      }
    );

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error("❌ Erro crítico na API POST /api/settings:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}