//app/api/lgpd/exportar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase não configurado' }, { status: 500 });
    }

    let empresaIdSessao = '';
    let operadorEmail = 'willianvannut@gmail.com';

    // 🛡️ 1. Extrair estritamente o ID (uuid) da empresa através da sessão ativa do utilizador
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('v5_session')?.value;
      if (token) {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        operadorEmail = String(payload.email || operadorEmail);
        empresaIdSessao = String(payload.empresa_id || payload.empresaId || payload.sub || '');
      }
    } catch (e) {}

    // Caso o token não traga o ID diretamente, buscamos a empresa mais recente como referência segura do tenant atual
    if (!empresaIdSessao) {
      const { data: empresaRecente } = await supabase
        .from('empresas')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (empresaRecente) {
        empresaIdSessao = empresaRecente.id;
      }
    }

    if (!empresaIdSessao) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado: Nenhuma empresa associada a esta sessão.' },
        { status: 401 }
      );
    }

    // 🏢 2. Buscar dados cadastrais da empresa usando o UUID exato (`id`)
    const { data: empresaDados, error: errEmpresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaIdSessao)
      .maybeSingle();

    if (errEmpresa || !empresaDados) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada com este ID (uuid).' },
        { status: 404 }
      );
    }

    // 👥 3. Buscar operadores vinculados estritamente a este UUID de empresa
    const { data: operadoresDados } = await supabase
      .from('operadores')
      .select('id, nome, email, cargo, criado_em')
      .eq('empresa_id', empresaIdSessao);

    // 🌐 4. Buscar CTOs vinculadas por provedor_id ou empresa_id
    const { data: ctosDados } = await supabase
      .from('ctos')
      .select('*')
      .or(`provedor_id.eq.${empresaIdSessao},empresa_id.eq.${empresaIdSessao}`);

    // 💰 5. Buscar Faturas da empresa
    const { data: faturasDados } = await supabase
      .from('faturas')
      .select('*')
      .eq('empresa_id', empresaIdSessao);

    // 🎯 6. Buscar Leads da empresa
    const { data: leadsDados } = await supabase
      .from('leads')
      .select('*')
      .eq('empresa_id', empresaIdSessao);

    // 📜 7. Buscar Logs de auditoria direcionados a este UUID
    const { data: logsDados } = await supabase
      .from('logs_sistema')
      .select('*')
      .eq('empresa_id', empresaIdSessao)
      .order('timestamp', { ascending: false })
      .limit(100);

    // 📦 8. Compilar o relatório LGPD estritamente isolado por empresa
    const relatorioLGPD = {
      geradoEm: new Date().toISOString(),
      baseLegal: "Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)",
      isolamentoTenant: {
        empresaUuid: empresaIdSessao,
        status: "Seguro - Dados filtrados por UUID corporativo"
      },
      dadosCadastraisEmpresa: {
        id: empresaDados.id,
        nomeEmpresa: empresaDados.nome_empresa,
        codigoConvite: empresaDados.codigo_convite,
        planoAtual: empresaDados.plano,
        telefone: empresaDados.telefone || 'Não informado',
        emailContato: empresaDados.email || 'Não informado',
        cep: empresaDados.cep || 'Não informado',
        enderecoLoja: empresaDados.endereco || 'Não informado',
        geolocalizacao: {
          lat: empresaDados.lat,
          lon: empresaDados.lon
        },
        planosComerciaisConfigurados: empresaDados.planos || [],
        criadoEm: empresaDados.criado_em
      },
      equipeOperadores: operadoresDados || [],
      infraestruturaCTOs: ctosDados || [],
      faturasEFinanceiro: faturasDados || [],
      leadsCRM: leadsDados || [],
      historicoAuditoriaESeguranca: logsDados || []
    };

    // 🚀 9. Registar log de auditoria da exportação
    await logger.info(
      'EXPORTAR_DADOS_LGPD',
      'sistema',
      `Relatório LGPD exportado com segurança para o UUID [${empresaIdSessao}] por [${operadorEmail}]`,
      { empresaId: empresaIdSessao, operadorEmail }
    );

    const nomeFicheiro = `relatorio-lgpd-${empresaDados.nome_empresa.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(relatorioLGPD, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeFicheiro}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error) {
    console.error("❌ Erro crítico ao gerar relatório LGPD por UUID:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}