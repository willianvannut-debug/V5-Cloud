import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SETTINGS_FILE = path.join(process.cwd(), 'data_settings.json');

// Inicializa o cliente do Supabase com as suas variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function GET(request: NextRequest) {
  try {
    let settingsData: any = {};

    // 1. Pega as configurações básicas do arquivo local (Nome da V5 Telecom, Planos, etc)
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      settingsData = JSON.parse(data);
    }

    if (supabase) {
      // 2. Busca o plano real direto da tabela 'empresas' no Supabase
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('plano, nome_empresa, endereco')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!empresaError && empresaData) {
        if (empresaData.plano) {
          // 🚀 Garante que o plano ativo real do banco seja retornado ao frontend
          settingsData.planoAtivo = String(empresaData.plano).toLowerCase().trim();
        }
        if (empresaData.nome_empresa) {
          settingsData.nomeProvedor = empresaData.nome_empresa;
        }
        if (empresaData.endereco && empresaData.endereco !== 'Não informado') {
          settingsData.cidadeEmpresa = empresaData.endereco;
        }
      }

      // 3. Busca as CTOs REAIS direto do banco de dados do Supabase!
      const { data: ctosSupabase, error } = await supabase.from('ctos').select('*');
      
      if (!error && ctosSupabase && ctosSupabase.length > 0) {
        // Substitui qualquer CTO antiga do arquivo local pelas CTOs oficiais da nuvem
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
    
    // Salva as configurações gerais no arquivo local
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(body, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error("Erro na API POST /api/settings:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}