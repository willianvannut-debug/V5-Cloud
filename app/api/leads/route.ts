// ================================================================================
// 🔒 ROTA DE LEADS - SUPABASE (BLINDADA + LOGS + USAGE-BASED PRICING STRIPE UNIFICADO)
// app/api/leads/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { PLANOS } from '@/lib/planLimites';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_SECRET = process.env.API_SECRET;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

const PRICE_ID_EXCEDENTE_UNICO = process.env.STRIPE_PRICE_EXCEDENTE_UNICO || 'price_1UHyoqQmvE3xCUG9IrneXps7';

function sanitizarTexto(str: any): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

function formatarLead(l: any) {
  const temCobertura = l.perfil !== 'SEM COBERTURA' && l.perfil !== 'NAO';

  return {
    ...l,
    telefone: l.whatsapp || '',
    endereco: l.numero || '',
    status: temCobertura ? 'COM COBERTURA' : 'SEM COBERTURA',
    etapa_funil: l.perfil || 'NOVO',
    cto: 'CTO-01', 
    lat: l.lat !== null && l.lat !== undefined ? Number(l.lat) : undefined,
    lon: l.lon !== null && l.lon !== undefined ? Number(l.lon) : undefined,
  };
}

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
    }
  } catch (erro) {
    console.error('❌ Erro ao registrar log:', erro);
  }
}

async function validarAutorizacao(request: NextRequest): Promise<{ 
  autorizado: boolean; 
  empresaIdSessao?: string;
  emailOperador?: string;
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
      await registrarLog('desconhecido', 'ACESSO_LEADS_NAO_AUTORIZADO', 'WARNING',
        'Tentativa de acesso não autorizado à lista de leads', request, { metodo: 'GET' }
      );
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id') || auth.empresaIdSessao;
    const origem = searchParams.get('origem'); 

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    if (origem === 'pc') {
      // Oculta da tela de leads do PC apenas os leads com instalação concluída com sucesso
      query = query.neq('perfil', 'INSTALAÇÃO FEITA');
    }

    const { data: leads, error } = await query;
    if (error) throw error;

    const leadsMapeados = (leads || []).map(formatarLead);

    return NextResponse.json(leadsMapeados, { status: 200 });
  } catch (error: any) {
    console.error('❌ ERRO (GET):', error.message);
    await registrarLog('sistema', 'ERRO_LISTAR_LEADS', 'ERROR', `Erro ao listar leads: ${error.message}`, request, { erro: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      await registrarLog('desconhecido', 'ACESSO_CRIAR_LEAD_NAO_AUTORIZADO', 'WARNING', 'Tentativa de criar lead sem autorização', request, { metodo: 'POST' });
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const empresaIdAlvo = body.empresa_id || auth.empresaIdSessao;
    const origem = body.origem; 

    if (body.limparTudo) {
      let deleteQuery = supabase.from('leads').delete().not('id', 'is', null);
      if (empresaIdAlvo) {
        deleteQuery = deleteQuery.eq('empresa_id', empresaIdAlvo);
      }
      const { error } = await deleteQuery;
      if (error) throw error;

      await registrarLog(auth.emailOperador || 'sistema', 'LEADS_LIMPOS', 'WARNING', 'Todos os leads foram removidos', request, { empresaId: empresaIdAlvo });
      return NextResponse.json({ success: true, leads: [] });
    }

    if (empresaIdAlvo) {
      const { data: dadosEmpresa } = await supabase
        .from('empresas')
        .select('plano, stripe_customer_id')
        .eq('id', empresaIdAlvo)
        .single();

      if (dadosEmpresa) {
        const planoAtual = (dadosEmpresa.plano || 'essencial').toLowerCase().trim();
        const limiteLeads = PLANOS[planoAtual]?.max_leads || 100;

        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaIdAlvo);

        const totalLeadsAtuais = count || 0;
        const ultrapassouLimite = totalLeadsAtuais >= limiteLeads;

        if (ultrapassouLimite && dadosEmpresa.stripe_customer_id) {
          try {
            const subscriptions = await stripe.subscriptions.list({
              customer: dadosEmpresa.stripe_customer_id,
              status: 'active',
              limit: 1,
            });

            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0];
              const subscriptionItem = subscription.items.data.find(
                (item) => item.price.id === PRICE_ID_EXCEDENTE_UNICO
              );

              if (subscriptionItem) {
                await stripe.subscriptionItems.createUsageRecord(
                  subscriptionItem.id,
                  {
                    quantity: 1,
                    timestamp: 'now',
                    action: 'increment',
                  }
                );
              }
            }
          } catch (stripeError) {
            console.error("❌ Erro ao enviar registro de uso excedente para o Stripe:", stripeError);
          }
        }
      }
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
      await registrarLog(auth.emailOperador || 'sistema', 'ERRO_CRIAR_LEAD', 'ERROR', `Falha ao criar novo lead: ${novoLeadBanco.nome}`, request, { leadNome: novoLeadBanco.nome, cep: novoLeadBanco.cep, erro: insertError.message });
      return NextResponse.json({ success: false, error: insertError.message }, { status: 400 });
    }

    let fetchQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (empresaIdAlvo) {
      fetchQuery = fetchQuery.eq('empresa_id', empresaIdAlvo);
    }
    
    if (origem === 'pc') {
      fetchQuery = fetchQuery.neq('perfil', 'INSTALAÇÃO FEITA');
    }

    const { data: leadsAtualizados } = await fetchQuery;
    const leadsMapeados = (leadsAtualizados || []).map(formatarLead);

    await registrarLog(auth.emailOperador || 'sistema', 'LEAD_CRIADO', 'SUCCESS', `Novo lead criado: ${novoLeadBanco.nome}`, request, { leadNome: novoLeadBanco.nome, cep: novoLeadBanco.cep, telefone: novoLeadBanco.whatsapp, empresaId: empresaIdAlvo });

    return NextResponse.json({ success: true, leads: leadsMapeados }, { status: 201 });
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO NO POST:', error.message);
    await registrarLog('sistema', 'ERRO_CRITICO_CRIAR_LEAD', 'ERROR', `Erro crítico ao criar lead: ${error.message}`, request, { erro: error.message, stack: error.stack?.slice(0, 200) });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      await registrarLog('desconhecido', 'ACESSO_ATUALIZAR_LEAD_NAO_AUTORIZADO', 'WARNING', 'Tentativa de atualizar lead sem autorização', request, { metodo: 'PUT' });
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const empresaIdAlvo = body.empresa_id || auth.empresaIdSessao;
    const origem = body.origem; 

    const leadId = body.id;

    if (leadId !== undefined && leadId !== null && leadId !== '') {
      const { data: leadAnterior } = await supabase.from('leads').select('*').eq('id', leadId).single();

      const dadosAtualizados: any = {};
      
      const novaEtapa = body.etapa_funil || body.perfil || body.status_instalacao;
      if (novaEtapa !== undefined) {
        let etapaLimpa = sanitizarTexto(novaEtapa).toUpperCase();
        
        if (etapaLimpa === 'CONCLUIDA') {
          etapaLimpa = 'INSTALAÇÃO FEITA';
        } else if (etapaLimpa === 'PENDENTE' || etapaLimpa === 'NAO FEITA' || etapaLimpa === 'NÃO FEITA' || etapaLimpa === 'NAO_FEITA') {
          // 🚀 Padroniza rigorosamente qualquer variação de não feita para "NÃO FEITA"
          etapaLimpa = 'NÃO FEITA';
        }

        dadosAtualizados.perfil = etapaLimpa; 
      }
      
      if (body.motivo_pendencia !== undefined) {
        dadosAtualizados.motivo_pendencia = sanitizarTexto(body.motivo_pendencia);
      }

      if (body.telefone || body.whatsapp) dadosAtualizados.whatsapp = sanitizarTexto(body.telefone || body.whatsapp);
      if (body.endereco || body.numero) dadosAtualizados.numero = sanitizarTexto(body.endereco || body.numero);

      const { error: updateError } = await supabase
        .from('leads')
        .update(dadosAtualizados)
        .eq('id', leadId);

      if (updateError) {
        console.error('❌ ERRO NO UPDATE DO SUPABASE:', updateError);
      }

      await registrarLog(auth.emailOperador || 'sistema', 'LEAD_ATUALIZADO', 'INFO', `Lead atualizado: ${leadAnterior?.nome}`, request, { leadId: leadId, leadNome: leadAnterior?.nome, etapaAnterior: leadAnterior?.perfil, etapaNova: novaEtapa, alteracoes: dadosAtualizados });
    } else {
      console.warn("⚠️ Atualização ignorada: ID ausente no corpo da requisição.");
    }

    let fetchQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (empresaIdAlvo) {
      fetchQuery = fetchQuery.eq('empresa_id', empresaIdAlvo);
    }
    
    if (origem === 'pc') {
      fetchQuery = fetchQuery.neq('perfil', 'INSTALAÇÃO FEITA');
    }

    const { data: leadsAtualizados } = await fetchQuery;
    const leadsMapeados = (leadsAtualizados || []).map(formatarLead);

    return NextResponse.json({ success: true, leads: leadsMapeados }, { status: 200 });
  } catch (error: any) {
    console.error('❌ ERRO NO PUT:', error.message);
    await registrarLog('sistema', 'ERRO_ATUALIZAR_LEAD', 'ERROR', `Erro ao atualizar lead: ${error.message}`, request, { erro: error.message });
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