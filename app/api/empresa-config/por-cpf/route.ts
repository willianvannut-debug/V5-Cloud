// ================================================================================
// API EMPRESA POR CPF - Busca empresa do cliente pelo CPF
// Caminho: app/api/empresa-config/por-cpf/route.ts
// Endpoint PÚBLICO - usado pelo app do cliente
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Headers CORS para permitir chamadas do app mobile (Expo Web dev)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Responder preflight OPTIONS (CORS)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/empresa-config/por-cpf  body: { cpf: "701.573.921-63" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cpf = body.cpf?.trim();

    if (!cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400, headers: corsHeaders });
    }

    // Normalizar CPF - tentar com e sem máscara
    const cpfLimpo = cpf.replace(/\D/g, '');
    const cpfMascara = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

    // Buscar cliente pelo CPF (tenta com máscara, depois sem)
    let cliente = null;
    const r1 = await supabase.from('clientes').select('empresa_id').eq('cpf', cpfMascara).single();
    if (r1.data) {
      cliente = r1.data;
    } else {
      const r2 = await supabase.from('clientes').select('empresa_id').eq('cpf', cpfLimpo).single();
      if (r2.data) {
        cliente = r2.data;
      } else {
        const r3 = await supabase.from('clientes').select('empresa_id').eq('cpf', cpf).single();
        cliente = r3.data;
      }
    }

    if (!cliente) {
      return NextResponse.json(
        { error: 'CPF não encontrado no sistema' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Buscar dados da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome_empresa, logo_url, cor_primaria, cor_secundaria, telefone_suporte')
      .eq('id', cliente.empresa_id)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      empresa_id: empresa.id,
      nome: empresa.nome_empresa,
      logo_url: empresa.logo_url || null,
      cor_primaria: empresa.cor_primaria || '#6366F1',
      cor_secundaria: empresa.cor_secundaria || '#818CF8',
      telefone_suporte: empresa.telefone_suporte || null,
    }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500, headers: corsHeaders });
  }
}
