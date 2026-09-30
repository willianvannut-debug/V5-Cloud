// ================================================================================
// 🔒 ROTA DE LEADS - SUPABASE (BLINDADA + LOGS + STRIPE + RODÍZIO + PLANO ESCOLHIDO)
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

const PRICE_ID_EXCEDENTE_UNICO = process.env.STRIPE_PRICE_EXCEDENTE_UNICO || 'price_1UIHCPQmvE3xCUG9mcjS3n2E';

// 🚀 Memória temporária para Rate Limit por IP (Anti-Spam / Anti-Flood)
const ipRequests = new Map<string, { count: number; timestamp: number }>();

function sanitizarTexto(str: any): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

function formatarLead(l: any) {
  const perfilUpper = String(l.perfil || '').toUpperCase();
  
  const temCobertura = 
    perfilUpper === 'COM COBERTURA' || 
    perfilUpper === 'LIBERADO P/ VENDA' ||
    perfilUpper === 'NOVO' || 
    perfilUpper === 'EM CONTATO' || 
    perfilUpper === 'AGENDADO' || 
    perfilUpper === 'MANDAR PARA INSTALAÇÃO';

  const etapaFunilReal = ['COM COBERTURA', 'SEM COBERTURA', 'LIBERADO P/ VENDA'].includes(perfilUpper) 
    ? 'NOVO' 
    : (l.perfil || 'NOVO');

  return {
    ...l,
    telefone: l.whatsapp || '',
    endereco: l.numero || '',
    status: temCobertura ? 'COM COBERTURA' : 'SEM COBERTURA',
    etapa_funil: etapaFunilReal,
    cto: l.cto || 'CTO-01', 
    lat: l.lat !== null && l.lat !== undefined ? Number(l.lat) : undefined,
    lon: l.lon !== null && l.lon !== undefined ? Number(l.lon) : undefined,
    plano_escolhido: l.plano_escolhido || '',
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
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';
    
    const agora = Date.now();
    const janelaTempo = 60 * 1000; 
    const limiteMaximo = 5; 

    const registroIp = ipRequests.get(ip);
    if (registroIp) {
      if (agora - registroIp.timestamp < janelaTempo) {
        if (registroIp.count >= limiteMaximo) {
          return NextResponse.json(
            { error: 'Muitas consultas realizadas em pouco tempo. Aguarde um momento antes de tentar novamente.' },
            { status: 429 }
          );
        }
        registroIp.count++;
      } else {
        ipRequests.set(ip, { count: 1, timestamp: agora });
      }
    } else {
      ipRequests.set(ip, { count: 1, timestamp: agora });
    }

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

    const telefoneBruto = sanitizarTexto(body.telefone || body.whatsapp || '');
    const perfilDoNovoLead = sanitizarTexto(body.etapa_funil || body.perfil || 'NOVO').toUpperCase();

    // 🚀 RODÍZIO (ROUND-ROBIN) DE ATENDENTES
    let atendenteSorteado = null;

    if (empresaIdAlvo && perfilDoNovoLead !== 'SEM COBERTURA' && perfilDoNovoLead !== 'NAO CONVERTIDO') {
      const { data: equipeComercial } = await supabase
        .from('operadores')
        .select('nome')
        .eq('empresa_id', empresaIdAlvo)
        .in('role', ['atendente', 'vendedor', 'comercial'])
        .order('nome', { ascending: true });

      if (equipeComercial && equipeComercial.length > 0) {
        const { data: ultimoLeadAtribuido } = await supabase
          .from('leads')
          .select('atendente')
          .eq('empresa_id', empresaIdAlvo)
          .not('atendente', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ultimoLeadAtribuido && ultimoLeadAtribuido.atendente) {
          const ultimoIndex = equipeComercial.findIndex(op => op.nome === ultimoLeadAtribuido.atendente);
          if (ultimoIndex !== -1 && ultimoIndex + 1 < equipeComercial.length) {
            atendenteSorteado = equipeComercial[ultimoIndex + 1].nome;
          } else {
            atendenteSorteado = equipeComercial[0].nome;
          }
        } else {
          atendenteSorteado = equipeComercial[0].nome;
        }
      }
    }

    // Validação de Limites de Leads (Stripe)
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
            console.error("❌ Erro Stripe:", stripeError);
          }
        }
      }
    }

    const novoLeadBanco = {
      empresa_id: empresaIdAlvo || null,
      nome: sanitizarTexto(body.nome || 'Cliente'),
      whatsapp: telefoneBruto,
      cep: sanitizarTexto(body.cep || ''),
      numero: sanitizarTexto(body.endereco || body.numero || ''),
      perfil: perfilDoNovoLead,
      lat: body.lat ? Number(body.lat) : null,
      lon: body.lon ? Number(body.lon) : null,
      atendente: atendenteSorteado,
      plano_escolhido: sanitizarTexto(body.plano_escolhido || ''), // 🚀 Captura o plano escolhido
    };

    const { error: insertError } = await supabase
      .from('leads')
      .insert([novoLeadBanco]);

    if (insertError) {
      console.error('❌ ERRO AO INSERIR:', insertError);
      await registrarLog(auth.emailOperador || 'sistema', 'ERRO_CRIAR_LEAD', 'ERROR', `Falha ao criar lead`, request, { erro: insertError.message });
      return NextResponse.json({ success: false, error: insertError.message }, { status: 400 });
    }

    let fetchQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (empresaIdAlvo) fetchQuery = fetchQuery.eq('empresa_id', empresaIdAlvo);
    if (origem === 'pc') fetchQuery = fetchQuery.neq('perfil', 'INSTALAÇÃO FEITA');

    const { data: leadsAtualizados } = await fetchQuery;
    const leadsMapeados = (leadsAtualizados || []).map(formatarLead);

    await registrarLog(auth.emailOperador || 'sistema', 'LEAD_CRIADO', 'SUCCESS', `Novo lead criado: ${novoLeadBanco.nome}`, request, { atendente: atendenteSorteado });

    return NextResponse.json({ success: true, leads: leadsMapeados }, { status: 201 });
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO NO POST:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
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
        } else if (etapaLimpa === 'PENDENTE' || etapaLimpa === 'NAO FEITA' || etapaLimpa === 'NÃO FEITA') {
          etapaLimpa = 'NÃO FEITA';
        }

        dadosAtualizados.perfil = etapaLimpa; 

        // 🚀 RODÍZIO AUTOMÁTICO DE TÉCNICOS (Round-Robin)
        if (etapaLimpa === 'MANDAR PARA INSTALAÇÃO' && empresaIdAlvo) {
          const { data: equipeTecnica } = await supabase
            .from('operadores')
            .select('nome')
            .eq('empresa_id', empresaIdAlvo)
            .eq('role', 'tecnico')
            .order('nome', { ascending: true });

          if (equipeTecnica && equipeTecnica.length > 0) {
            const { data: ultimoLeadTecnico } = await supabase
              .from('leads')
              .select('tecnico')
              .eq('empresa_id', empresaIdAlvo)
              .not('tecnico', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            let tecnicoSorteado = equipeTecnica[0].nome;
            if (ultimoLeadTecnico && ultimoLeadTecnico.tecnico) {
              const idxUltimo = equipeTecnica.findIndex(t => t.nome === ultimoLeadTecnico.tecnico);
              if (idxUltimo !== -1 && idxUltimo + 1 < equipeTecnica.length) {
                tecnicoSorteado = equipeTecnica[idxUltimo + 1].nome;
              }
            }
            
            dadosAtualizados.tecnico = tecnicoSorteado;
          }
        }
      }
      
      if (body.motivo_pendencia !== undefined) {
        dadosAtualizados.motivo_pendencia = sanitizarTexto(body.motivo_pendencia);
      }
      if (body.telefone || body.whatsapp) dadosAtualizados.whatsapp = sanitizarTexto(body.telefone || body.whatsapp);
      if (body.endereco || body.numero) dadosAtualizados.numero = sanitizarTexto(body.endereco || body.numero);
      if (body.atendente !== undefined) dadosAtualizados.atendente = body.atendente;
      if (body.tecnico !== undefined) dadosAtualizados.tecnico = body.tecnico;
      
      // 🚀 Captura o plano escolhido no PUT (quando atualizado na tabela)
      if (body.plano_escolhido !== undefined) {
        dadosAtualizados.plano_escolhido = sanitizarTexto(body.plano_escolhido);
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(dadosAtualizados)
        .eq('id', leadId);

      if (updateError) {
        console.error('❌ ERRO NO UPDATE:', updateError);
      }

      await registrarLog(auth.emailOperador || 'sistema', 'LEAD_ATUALIZADO', 'INFO', `Lead atualizado: ${leadAnterior?.nome}`, request, { leadId, alteracoes: dadosAtualizados });
    }

    let fetchQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (empresaIdAlvo) fetchQuery = fetchQuery.eq('empresa_id', empresaIdAlvo);
    if (origem === 'pc') fetchQuery = fetchQuery.neq('perfil', 'INSTALAÇÃO FEITA');

    const { data: leadsAtualizados } = await fetchQuery;
    const leadsMapeados = (leadsAtualizados || []).map(formatarLead);

    return NextResponse.json({ success: true, leads: leadsMapeados }, { status: 200 });
  } catch (error: any) {
    console.error('❌ ERRO NO PUT:', error.message);
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