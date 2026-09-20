// ================================================================================
// 🔒 ROTA DE LEADS - SUPABASE (BLINDADA + SUPORTE A COOKIE E BEARER TOKEN + LOGS)
// Arquivo: app/api/leads/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_SECRET = process.env.API_SECRET;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

function sanitizarTexto(str: any): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

/**
 * ✅ Função auxiliar para registrar LOGS
 */
async function registrarLog(
  email: string,
  acao: string,
  nivel: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO',
  mensagem: string,
  request: NextRequest,
  detalhes?: Record<string, any>
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    console.log('📝 Tentando registrar log:', acao); // DEBUG

    const { error } = await supabase.from('logs_sistema').insert([
      {
        nivel,
        acao: acao.toUpperCase(),
        entidade: 'leads',
        mensagem,
        operador_email: email || 'sistema',
        ip,
        user_agent: userAgent,
        detalhes: detalhes || {},
        timestamp: new Date().toISOString(),
        criado_em: new Date().toISOString(),
      }
    ]);

    if (error) {
      console.error('❌ ERRO ao inserir log no Supabase:', error);
    } else {
      console.log('✅ Log registrado com sucesso:', acao); // DEBUG
    }
  } catch (erro) {
    console.error('❌ Erro ao registrar log:', erro);
    // Não falha a requisição se o log falhar
  }
}

// Validação dupla: Aceita Bearer Token (API_SECRET) OU Cookie HttpOnly (v5_session)
async function validarAutorizacao(request: NextRequest): Promise<{ 
  autorizado: boolean; 
  empresaIdSessao?: string;
  emailOperador?: string;
}> {
  // 1. Tenta validar via Bearer Token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (API_SECRET && token === API_SECRET) {
    return { autorizado: true };
  }

  // 2. Tenta validar via Cookie de Sessão JWT (v5_session)
  const cookieSessao = request.cookies.get('v5_session');
  if (cookieSessao?.value) {
    try {
      const { payload } = await jwtVerify(cookieSessao.value, JWT_SECRET);
      return { 
        autorizado: true, 
        empresaIdSessao: payload.empresaId as string,
        emailOperador: payload.email as string
      };
    } catch (e) {
      console.error('Erro ao verificar JWT na API de leads:', e);
    }
  }

  return { autorizado: false };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      // ✅ Log de acesso não autorizado
      await registrarLog('desconhecido', 'ACESSO_LEADS_NAO_AUTORIZADO', 'WARNING',
        'Tentativa de acesso não autorizado à lista de leads',
        request,
        { metodo: 'GET' }
      );

      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id') || auth.empresaIdSessao;

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data: leads, error } = await query;

    if (error) throw error;

    const leadsMapeados = (leads || []).map((l: any) => {
      const temCobertura = l.cto_atendimento || l.cto || (l.perfil !== 'SEM COBERTURA' && l.perfil !== 'NAO');
      
      return {
        ...l,
        telefone: l.whatsapp || '',
        endereco: l.numero || '',
        status: temCobertura ? 'COM COBERTURA' : 'SEM COBERTURA',
        etapa_funil: l.perfil || 'NOVO',
        cto: l.cto_atendimento || l.cto || 'CTO-01',
        lat: l.lat !== null && l.lat !== undefined ? Number(l.lat) : undefined,
        lon: l.lon !== null && l.lon !== undefined ? Number(l.lon) : undefined,
      };
    });

    // ⚠️ Removido: Log de leitura simples NÃO é obrigatório pela LGPD
    // await registrarLog(auth.emailOperador || 'sistema', 'LEADS_LISTADOS', 'INFO', ...);

    return NextResponse.json(leadsMapeados, { status: 200 });
  } catch (error: any) {
    console.error('❌ ERRO (GET):', error.message);

    // ✅ Log de erro
    await registrarLog('sistema', 'ERRO_LISTAR_LEADS', 'ERROR',
      `Erro ao listar leads: ${error.message}`,
      request,
      { erro: error.message }
    );

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      // ✅ Log de acesso não autorizado
      await registrarLog('desconhecido', 'ACESSO_CRIAR_LEAD_NAO_AUTORIZADO', 'WARNING',
        'Tentativa de criar lead sem autorização',
        request,
        { metodo: 'POST' }
      );

      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const empresaIdAlvo = body.empresa_id || auth.empresaIdSessao;

    // ✅ Se for limpar tudo
    if (body.limparTudo) {
      let deleteQuery = supabase.from('leads').delete().not('id', 'is', null);
      if (empresaIdAlvo) {
        deleteQuery = deleteQuery.eq('empresa_id', empresaIdAlvo);
      }
      const { error } = await deleteQuery;
      if (error) throw error;

      // ✅ Log de limpeza
      await registrarLog(auth.emailOperador || 'sistema', 'LEADS_LIMPOS', 'WARNING',
        'Todos os leads foram removidos',
        request,
        { empresaId: empresaIdAlvo }
      );

      return NextResponse.json({ success: true, leads: [] });
    }

    const novoLeadBanco = {
      empresa_id: empresaIdAlvo || null,
      nome: sanitizarTexto(body.nome || 'Cliente'),
      whatsapp: sanitizarTexto(body.telefone || body.whatsapp || ''),
      cep: sanitizarTexto(body.cep || ''),
      numero: sanitizarTexto(body.endereco || body.numero || ''),
      perfil: sanitizarTexto(body.etapa_funil || body.perfil || 'NOVO'),
      lat: body.lat ? Number(body.lat) : null,
      lon: body.lon ? Number(body.lon) : null,
    };

    const { error: insertError } = await supabase
      .from('leads')
      .insert([novoLeadBanco]);

    if (insertError) {
      console.error('❌ ERRO AO INSERIR:', insertError);

      // ✅ Log de erro ao criar lead
      await registrarLog(auth.emailOperador || 'sistema', 'ERRO_CRIAR_LEAD', 'ERROR',
        `Falha ao criar novo lead: ${novoLeadBanco.nome}`,
        request,
        { 
          leadNome: novoLeadBanco.nome,
          cep: novoLeadBanco.cep,
          erro: insertError.message
        }
      );

      return NextResponse.json({ success: false, error: insertError.message }, { status: 400 });
    }

    let fetchQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (empresaIdAlvo) {
      fetchQuery = fetchQuery.eq('empresa_id', empresaIdAlvo);
    }
    const { data: leadsAtualizados } = await fetchQuery;

    const leadsMapeados = (leadsAtualizados || []).map((l: any) => ({
      ...l,
      telefone: l.whatsapp || '',
      endereco: l.numero || '',
      status: 'COM COBERTURA',
      etapa_funil: l.perfil || 'NOVO',
      lat: l.lat !== null && l.lat !== undefined ? Number(l.lat) : undefined,
      lon: l.lon !== null && l.lon !== undefined ? Number(l.lon) : undefined,
    }));

    // ✅ Log de sucesso ao criar lead
    await registrarLog(auth.emailOperador || 'sistema', 'LEAD_CRIADO', 'SUCCESS',
      `Novo lead criado: ${novoLeadBanco.nome}`,
      request,
      {
        leadNome: novoLeadBanco.nome,
        cep: novoLeadBanco.cep,
        telefone: novoLeadBanco.whatsapp,
        empresaId: empresaIdAlvo
      }
    );

    return NextResponse.json({ success: true, leads: leadsMapeados }, { status: 201 });
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO NO POST:', error.message);

    // ✅ Log de erro crítico
    await registrarLog('sistema', 'ERRO_CRITICO_CRIAR_LEAD', 'ERROR',
      `Erro crítico ao criar lead: ${error.message}`,
      request,
      { erro: error.message, stack: error.stack?.slice(0, 200) }
    );

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      // ✅ Log de acesso não autorizado
      await registrarLog('desconhecido', 'ACESSO_ATUALIZAR_LEAD_NAO_AUTORIZADO', 'WARNING',
        'Tentativa de atualizar lead sem autorização',
        request,
        { metodo: 'PUT' }
      );

      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const empresaIdAlvo = body.empresa_id || auth.empresaIdSessao;

    if (body.id) {
      // Busca o lead anterior para comparação
      const { data: leadAnterior } = await supabase
        .from('leads')
        .select('*')
        .eq('id', body.id)
        .single();

      const dadosAtualizados: any = {};
      if (body.etapa_funil || body.perfil) dadosAtualizados.perfil = sanitizarTexto(body.etapa_funil || body.perfil);
      if (body.telefone || body.whatsapp) dadosAtualizados.whatsapp = sanitizarTexto(body.telefone || body.whatsapp);
      if (body.endereco || body.numero) dadosAtualizados.numero = sanitizarTexto(body.endereco || body.numero);

      await supabase.from('leads').update(dadosAtualizados).eq('id', body.id);

      // ✅ Log de atualização
      await registrarLog(auth.emailOperador || 'sistema', 'LEAD_ATUALIZADO', 'INFO',
        `Lead atualizado: ${leadAnterior?.nome}`,
        request,
        {
          leadId: body.id,
          leadNome: leadAnterior?.nome,
          etapaAnterior: leadAnterior?.perfil,
          etapaNova: body.etapa_funil || body.perfil,
          alteracoes: dadosAtualizados
        }
      );
    }

    let fetchQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (empresaIdAlvo) {
      fetchQuery = fetchQuery.eq('empresa_id', empresaIdAlvo);
    }
    const { data: leadsAtualizados } = await fetchQuery;

    const leadsMapeados = (leadsAtualizados || []).map((l: any) => ({
      ...l,
      telefone: l.whatsapp || '',
      endereco: l.numero || '',
      status: 'COM COBERTURA',
      etapa_funil: l.perfil || 'NOVO',
      lat: l.lat !== null && l.lat !== undefined ? Number(l.lat) : undefined,
      lon: l.lon !== null && l.lon !== undefined ? Number(l.lon) : undefined,
    }));

    return NextResponse.json({ success: true, leads: leadsMapeados }, { status: 200 });
  } catch (error: any) {
    console.error('❌ ERRO NO PUT:', error.message);

    // ✅ Log de erro
    await registrarLog('sistema', 'ERRO_ATUALIZAR_LEAD', 'ERROR',
      `Erro ao atualizar lead: ${error.message}`,
      request,
      { erro: error.message }
    );

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Método não permitido' }, { status: 405 });
}