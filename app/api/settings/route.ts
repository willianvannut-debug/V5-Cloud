import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { registrarLog } from '@/lib/audit';

const SETTINGS_FILE = path.join(process.cwd(), 'data_settings.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(body, null, 2), 'utf-8');
    
    let empresaIdAlvo = body.empresaId || body.id || null;
    const emailOperador = body.operadorEmail || body.email || 'willianvannut@gmail.com';

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

    if (supabase && empresaIdAlvo) {
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

    await registrarLog({
      empresaId: empresaIdAlvo,
      operadorEmail: emailOperador,
      acao: 'ATUALIZAR_CONFIGURACOES',
      entidadeTipo: 'configuracao',
      entidadeId: empresaIdAlvo,
      detalhes: { 
        provedor: body.nomeProvedor || 'V5 Telecom',
        cidade: body.cidadeEmpresa || 'Não informada'
      }
    });

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