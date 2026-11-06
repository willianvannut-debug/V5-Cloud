// ================================================================================
// ROTA DE CLIENTES - SUPABASE (CRUD + LOGS + MULTI-TENANT)
// app/api/clientes/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_SECRET = process.env.API_SECRET;

// MikroTik Bridge
const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL || '';
const BRIDGE_API_KEY = process.env.MIKROTIK_BRIDGE_API_KEY || '';
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || ''
);

// Limpar texto contra XSS
function sanitizarTexto(str: any): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

// Registrar log no banco
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

    await supabase.from('logs_sistema').insert([
      {
        nivel,
        acao: acao.toUpperCase(),
        entidade: 'clientes',
        mensagem,
        operador_email: email || 'sistema',
        ip,
        user_agent: userAgent,
        detalhes: detalhes || {},
        timestamp: new Date().toISOString(),
        criado_em: new Date().toISOString(),
      }
    ]);
  } catch (erro) {
    console.error('Erro ao registrar log:', erro);
  }
}

// Validar JWT ou API_SECRET
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
  if (cookieSessao?.value && JWT_SECRET.byteLength > 0) {
    try {
      const { payload } = await jwtVerify(cookieSessao.value, JWT_SECRET);
      return {
        autorizado: true,
        empresaIdSessao: payload.empresaId as string,
        emailOperador: payload.email as string
      };
    } catch (e) {
      console.error('Erro ao verificar JWT na API de clientes:', e);
    }
  }

  return { autorizado: false };
}

// ==========================================
// GET - LISTAR CLIENTES
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      await registrarLog('desconhecido', 'ACESSO_CLIENTES_NAO_AUTORIZADO', 'WARNING',
        'Tentativa de acesso nao autorizado a lista de clientes', request, { metodo: 'GET' }
      );
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresa_id') || auth.empresaIdSessao;
    const busca = searchParams.get('busca') || '';
    const status = searchParams.get('status') || '';
    const pagina = parseInt(searchParams.get('pagina') || '1');
    const porPagina = parseInt(searchParams.get('por_pagina') || '50');

    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    // Filtro por status
    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    // Busca por nome, CPF, CNPJ ou telefone
    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,cpf.ilike.%${busca}%,cnpj.ilike.%${busca}%,telefone.ilike.%${busca}%,whatsapp.ilike.%${busca}%,email.ilike.%${busca}%`
      );
    }

    // Paginacao
    const inicio = (pagina - 1) * porPagina;
    query = query.range(inicio, inicio + porPagina - 1);

    const { data: clientes, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      clientes: clientes || [],
      total: count || 0,
      pagina,
      porPagina,
      totalPaginas: Math.ceil((count || 0) / porPagina),
    }, { status: 200 });
  } catch (error: any) {
    console.error('ERRO (GET clientes):', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// POST - CADASTRAR NOVO CLIENTE
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      await registrarLog('desconhecido', 'ACESSO_CRIAR_CLIENTE_NAO_AUTORIZADO', 'WARNING',
        'Tentativa de criar cliente sem autorizacao', request, { metodo: 'POST' }
      );
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const empresaIdAlvo = body.empresa_id || auth.empresaIdSessao;

    if (!empresaIdAlvo) {
      return NextResponse.json({ error: 'empresa_id obrigatorio' }, { status: 400 });
    }

    // Validar campos obrigatorios
    if (!body.nome || body.nome.trim() === '') {
      return NextResponse.json({ error: 'Nome do cliente e obrigatorio' }, { status: 400 });
    }

    const tipoPessoa = (body.tipo_pessoa || 'PF').toUpperCase();

    // Verificar duplicidade de CPF/CNPJ
    if (tipoPessoa === 'PF' && body.cpf) {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('cpf', body.cpf)
        .eq('empresa_id', empresaIdAlvo)
        .maybeSingle();

      if (existente) {
        return NextResponse.json({ error: 'Ja existe um cliente com este CPF' }, { status: 409 });
      }
    }

    if (tipoPessoa === 'PJ' && body.cnpj) {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('cnpj', body.cnpj)
        .eq('empresa_id', empresaIdAlvo)
        .maybeSingle();

      if (existente) {
        return NextResponse.json({ error: 'Ja existe um cliente com este CNPJ' }, { status: 409 });
      }
    }

    const novoCliente = {
      empresa_id: empresaIdAlvo,
      tipo_pessoa: tipoPessoa,

      // Pessoa Fisica
      nome: sanitizarTexto(body.nome),
      cpf: sanitizarTexto(body.cpf || ''),
      rg: sanitizarTexto(body.rg || ''),
      data_nascimento: body.data_nascimento || null,
      sexo: sanitizarTexto(body.sexo || ''),

      // Pessoa Juridica
      razao_social: sanitizarTexto(body.razao_social || ''),
      nome_fantasia: sanitizarTexto(body.nome_fantasia || ''),
      cnpj: sanitizarTexto(body.cnpj || ''),
      inscricao_estadual: sanitizarTexto(body.inscricao_estadual || ''),
      inscricao_municipal: sanitizarTexto(body.inscricao_municipal || ''),
      responsavel_nome: sanitizarTexto(body.responsavel_nome || ''),
      responsavel_cpf: sanitizarTexto(body.responsavel_cpf || ''),

      // Contato
      email: sanitizarTexto(body.email || ''),
      telefone: sanitizarTexto(body.telefone || ''),
      telefone2: sanitizarTexto(body.telefone2 || ''),
      whatsapp: sanitizarTexto(body.whatsapp || ''),

      // Endereco de instalacao
      cep: sanitizarTexto(body.cep || ''),
      logradouro: sanitizarTexto(body.logradouro || ''),
      numero: sanitizarTexto(body.numero || ''),
      complemento: sanitizarTexto(body.complemento || ''),
      bairro: sanitizarTexto(body.bairro || ''),
      cidade: sanitizarTexto(body.cidade || ''),
      uf: sanitizarTexto(body.uf || ''),
      latitude: body.latitude ? Number(body.latitude) : null,
      longitude: body.longitude ? Number(body.longitude) : null,
      referencia: sanitizarTexto(body.referencia || ''),

      // Endereco de cobranca
      cobranca_mesmo_endereco: body.cobranca_mesmo_endereco !== false,
      cobranca_cep: sanitizarTexto(body.cobranca_cep || ''),
      cobranca_logradouro: sanitizarTexto(body.cobranca_logradouro || ''),
      cobranca_numero: sanitizarTexto(body.cobranca_numero || ''),
      cobranca_complemento: sanitizarTexto(body.cobranca_complemento || ''),
      cobranca_bairro: sanitizarTexto(body.cobranca_bairro || ''),
      cobranca_cidade: sanitizarTexto(body.cobranca_cidade || ''),
      cobranca_uf: sanitizarTexto(body.cobranca_uf || ''),

      // CTO
      cto_id: body.cto_id || null,
      porta_cto: body.porta_cto ? Number(body.porta_cto) : null,

      // Status e financeiro
      status: 'ativo',
      dia_vencimento: body.dia_vencimento ? Number(body.dia_vencimento) : 10,
      forma_pagamento: sanitizarTexto(body.forma_pagamento || 'boleto'),
      isento_corte: body.isento_corte === true,
      tolerancia_dias: body.tolerancia_dias ? Number(body.tolerancia_dias) : 0,

      // Observacoes
      observacoes: sanitizarTexto(body.observacoes || ''),
      observacoes_internas: sanitizarTexto(body.observacoes_internas || ''),

      // Origem
      lead_id: body.lead_id || null,
    };

    const { data: clienteCriado, error: insertError } = await supabase
      .from('clientes')
      .insert([novoCliente])
      .select()
      .single();

    if (insertError) {
      console.error('ERRO AO INSERIR CLIENTE:', insertError);
      await registrarLog(auth.emailOperador || 'sistema', 'ERRO_CRIAR_CLIENTE', 'ERROR',
        `Falha ao criar cliente: ${insertError.message}`, request, { erro: insertError.message }
      );
      return NextResponse.json({ success: false, error: insertError.message }, { status: 400 });
    }

    // ==========================================
    // CRIAR ACESSO PPPoE NO MIKROTIK (se tiver login_pppoe)
    // ==========================================
    let pppoeCreated = false;
    let pppoeError = '';

    if (body.login_pppoe && body.senha_pppoe && BRIDGE_URL && BRIDGE_API_KEY) {
      try {
        const mkRes = await fetch(
          `${BRIDGE_URL}/pppoe/secret/add?empresa_id=${empresaIdAlvo}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': BRIDGE_API_KEY,
              'Authorization': `Bearer ${BRIDGE_API_KEY}`,
            },
            body: JSON.stringify({
              name: body.login_pppoe,
              password: body.senha_pppoe,
              profile: body.perfil_radius || 'default',
              service: 'pppoe',
              comment: novoCliente.nome,
              ...(body.ip_fixo ? { 'remote-address': body.ip_fixo } : {}),
            }),
          }
        );

        const mkData = await mkRes.json();

        if (mkData.success) {
          pppoeCreated = true;

          await supabase
            .from('clientes')
            .update({
              login_pppoe: sanitizarTexto(body.login_pppoe),
              senha_pppoe: sanitizarTexto(body.senha_pppoe),
              perfil_radius: sanitizarTexto(body.perfil_radius || ''),
              ip_fixo: sanitizarTexto(body.ip_fixo || ''),
              mac_address: sanitizarTexto(body.mac_address || ''),
            })
            .eq('id', clienteCriado?.id);

          await registrarLog(auth.emailOperador || 'sistema', 'PPPOE_CRIADO', 'SUCCESS',
            `Acesso PPPoE criado no MikroTik: ${body.login_pppoe}`, request, {
              clienteId: clienteCriado?.id,
              login_pppoe: body.login_pppoe,
              perfil: body.perfil_radius,
            }
          );
        } else {
          pppoeError = mkData.error || 'Erro desconhecido ao criar PPPoE';
          console.error('Erro ao criar PPPoE no MikroTik:', pppoeError);

          await registrarLog(auth.emailOperador || 'sistema', 'ERRO_PPPOE', 'WARNING',
            `Cliente criado mas PPPoE falhou: ${pppoeError}`, request, {
              clienteId: clienteCriado?.id,
              login_pppoe: body.login_pppoe,
              erro: pppoeError,
            }
          );
        }
      } catch (mkErr: any) {
        pppoeError = mkErr.message || 'Erro de conexao com MikroTik';
        console.error('Erro de conexao ao criar PPPoE:', pppoeError);
      }
    }

    await registrarLog(auth.emailOperador || 'sistema', 'CLIENTE_CRIADO', 'SUCCESS',
      `Novo cliente criado: ${novoCliente.nome}`, request, {
        clienteId: clienteCriado?.id,
        tipo: tipoPessoa,
        cpf_cnpj: tipoPessoa === 'PF' ? novoCliente.cpf : novoCliente.cnpj,
        pppoe_criado: pppoeCreated,
      }
    );

    return NextResponse.json({
      success: true,
      cliente: clienteCriado,
      pppoe: {
        criado: pppoeCreated,
        erro: pppoeError || null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('ERRO CRITICO NO POST (clientes):', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==========================================
// PUT - ATUALIZAR CLIENTE
// ==========================================
export async function PUT(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const clienteId = body.id || body.clienteId || body.cliente_id;

    if (!clienteId) {
      return NextResponse.json({ error: 'ID do cliente nao fornecido' }, { status: 400 });
    }

    const dadosAtualizados: any = {};

    if (body.nome !== undefined) dadosAtualizados.nome = sanitizarTexto(body.nome);
    if (body.cpf !== undefined) dadosAtualizados.cpf = sanitizarTexto(body.cpf);
    if (body.rg !== undefined) dadosAtualizados.rg = sanitizarTexto(body.rg);
    if (body.data_nascimento !== undefined) dadosAtualizados.data_nascimento = body.data_nascimento;
    if (body.sexo !== undefined) dadosAtualizados.sexo = sanitizarTexto(body.sexo);
    if (body.tipo_pessoa !== undefined) dadosAtualizados.tipo_pessoa = body.tipo_pessoa.toUpperCase();

    if (body.razao_social !== undefined) dadosAtualizados.razao_social = sanitizarTexto(body.razao_social);
    if (body.nome_fantasia !== undefined) dadosAtualizados.nome_fantasia = sanitizarTexto(body.nome_fantasia);
    if (body.cnpj !== undefined) dadosAtualizados.cnpj = sanitizarTexto(body.cnpj);
    if (body.inscricao_estadual !== undefined) dadosAtualizados.inscricao_estadual = sanitizarTexto(body.inscricao_estadual);
    if (body.responsavel_nome !== undefined) dadosAtualizados.responsavel_nome = sanitizarTexto(body.responsavel_nome);
    if (body.responsavel_cpf !== undefined) dadosAtualizados.responsavel_cpf = sanitizarTexto(body.responsavel_cpf);

    if (body.email !== undefined) dadosAtualizados.email = sanitizarTexto(body.email);
    if (body.telefone !== undefined) dadosAtualizados.telefone = sanitizarTexto(body.telefone);
    if (body.telefone2 !== undefined) dadosAtualizados.telefone2 = sanitizarTexto(body.telefone2);
    if (body.whatsapp !== undefined) dadosAtualizados.whatsapp = sanitizarTexto(body.whatsapp);

    if (body.cep !== undefined) dadosAtualizados.cep = sanitizarTexto(body.cep);
    if (body.logradouro !== undefined) dadosAtualizados.logradouro = sanitizarTexto(body.logradouro);
    if (body.numero !== undefined) dadosAtualizados.numero = sanitizarTexto(body.numero);
    if (body.complemento !== undefined) dadosAtualizados.complemento = sanitizarTexto(body.complemento);
    if (body.bairro !== undefined) dadosAtualizados.bairro = sanitizarTexto(body.bairro);
    if (body.cidade !== undefined) dadosAtualizados.cidade = sanitizarTexto(body.cidade);
    if (body.uf !== undefined) dadosAtualizados.uf = sanitizarTexto(body.uf);

    if (body.status !== undefined) dadosAtualizados.status = sanitizarTexto(body.status);
    if (body.dia_vencimento !== undefined) dadosAtualizados.dia_vencimento = Number(body.dia_vencimento);
    if (body.forma_pagamento !== undefined) dadosAtualizados.forma_pagamento = sanitizarTexto(body.forma_pagamento);
    if (body.isento_corte !== undefined) dadosAtualizados.isento_corte = body.isento_corte === true;
    if (body.observacoes !== undefined) dadosAtualizados.observacoes = sanitizarTexto(body.observacoes);
    if (body.observacoes_internas !== undefined) dadosAtualizados.observacoes_internas = sanitizarTexto(body.observacoes_internas);

    if (body.cto_id !== undefined) dadosAtualizados.cto_id = body.cto_id;
    if (body.porta_cto !== undefined) dadosAtualizados.porta_cto = body.porta_cto ? Number(body.porta_cto) : null;

    if (body.status === 'cancelado') {
      dadosAtualizados.data_cancelamento = new Date().toISOString();
      dadosAtualizados.motivo_cancelamento = sanitizarTexto(body.motivo_cancelamento || '');
    }

    if (body.status === 'bloqueado') {
      dadosAtualizados.data_bloqueio = new Date().toISOString();
    }

    dadosAtualizados.updated_at = new Date().toISOString();

    if (Object.keys(dadosAtualizados).length > 1) {
      const { error: updateError } = await supabase
        .from('clientes')
        .update(dadosAtualizados)
        .eq('id', clienteId);

      if (updateError) {
        console.error('ERRO NO UPDATE (clientes):', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    const { data: clienteAtualizado } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    await registrarLog(auth.emailOperador || 'sistema', 'CLIENTE_ATUALIZADO', 'INFO',
      `Cliente atualizado: ${clienteAtualizado?.nome}`, request, { clienteId, alteracoes: dadosAtualizados }
    );

    return NextResponse.json({ success: true, cliente: clienteAtualizado }, { status: 200 });
  } catch (error: any) {
    console.error('ERRO NO PUT (clientes):', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// DELETE - EXCLUIR CLIENTE
// ==========================================
export async function DELETE(request: NextRequest) {
  try {
    const auth = await validarAutorizacao(request);
    if (!auth.autorizado) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('id');

    if (!clienteId) {
      return NextResponse.json({ error: 'ID do cliente obrigatorio' }, { status: 400 });
    }

    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome, empresa_id')
      .eq('id', clienteId)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 });
    }

    const tabelasRelacionadas = [
      'notificacoes_enviadas',
      'historico_bloqueios',
      'pagamentos',
      'faturas',
      'ticket_mensagens',
      'tickets',
      'chamados',
      'ordens_servico',
      'equipamentos',
      'conexoes',
      'contratos',
    ];

    for (const tabela of tabelasRelacionadas) {
      const { error: delErr } = await supabase
        .from(tabela)
        .delete()
        .eq('cliente_id', clienteId);

      if (delErr && !delErr.message.includes('does not exist') && !delErr.message.includes('not found')) {
        console.log(`Aviso ao limpar ${tabela}:`, delErr.message);
      }
    }

    const { error: deleteError } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clienteId);

    if (deleteError) {
      console.error('ERRO AO EXCLUIR CLIENTE:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    await registrarLog(auth.emailOperador || 'sistema', 'CLIENTE_EXCLUIDO', 'WARNING',
      `Cliente excluido: ${cliente.nome}`, request, { clienteId, nome: cliente.nome }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('ERRO NO DELETE (clientes):', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// OPTIONS - CORS
// ==========================================
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}