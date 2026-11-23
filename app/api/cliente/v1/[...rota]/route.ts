// app/api/cliente/v1/[...rota]/route.ts
// API do APP DO CLIENTE. Tudo que o app lê/grava passa por aqui, sempre filtrado
// pelo cliente do token (o app não acessa mais o banco direto com a chave pública).
//
//  POST  login                      { cpf, senha, empresa_id? }
//  POST  primeiro-acesso/verificar  { cpf }
//  POST  primeiro-acesso/ativar     { cpf, senha }
//  GET   me                         | PATCH me { latitude, longitude, ponto_referencia }
//  GET   faturas                    (?abertas=1 → só pendentes/vencidas)
//  GET   contrato
//  GET   categorias
//  GET   chamados                   | POST chamados { categoria_id, assunto, descricao, prioridade }
//  GET   chamados/:id               | POST chamados/:id/mensagens { mensagem }
//  POST  chamados/:id/avaliacao     { nota, comentario }
//  GET   os                         (OS em deslocamento + posição do técnico + OS para avaliar)
//  POST  os/:id/avaliacao           { nota, comentario }
//  POST  push-token                 { token, plataforma }

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  supabaseAdmin as db, assinarTokenCliente, getClienteDaRequisicao, clientePublico,
  empresaPublica, excedeuTentativas, ipDe, variacoesCpf, type SessaoCliente,
} from '@/lib/cliente-auth';
import { statusParaCliente, soDigitos } from '@/lib/faturas-status';

type Ctx = { params: Promise<{ rota: string[] }> };
const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
const erro = (mensagem: string, status = 400, codigo?: string) => NextResponse.json({ erro: mensagem, codigo }, { status });
const texto = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function corpo(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

// ---------------------------------------------------------------- públicas
async function login(req: Request) {
  if (excedeuTentativas(`login:${ipDe(req)}`, 10)) return erro('Muitas tentativas. Aguarde alguns minutos.', 429);
  const { cpf, senha, empresa_id } = await corpo(req);
  if (!cpf || !senha) return erro('Informe CPF e senha');

  let q = db.from('clientes').select('*').in('cpf', variacoesCpf(cpf));
  if (empresa_id) q = q.eq('empresa_id', empresa_id);
  const { data: candidatos } = await q;
  if (!candidatos || candidatos.length === 0) return erro('CPF não encontrado', 404, 'CPF_NAO_ENCONTRADO');

  for (const c of candidatos) {
    if (c.senha && (await bcrypt.compare(String(senha), String(c.senha)))) {
      const token = await assinarTokenCliente(c.id, c.empresa_id);
      return ok({ token, cliente: clientePublico(c), empresa: await empresaPublica(c.empresa_id) });
    }
  }
  return erro('Senha incorreta', 401, 'SENHA_INCORRETA');
}

async function primeiroAcessoVerificar(req: Request) {
  if (excedeuTentativas(`pa:${ipDe(req)}`, 15)) return erro('Muitas tentativas. Aguarde alguns minutos.', 429);
  const { cpf } = await corpo(req);
  if (soDigitos(cpf).length !== 11) return erro('Digite um CPF válido');
  const { data } = await db.from('clientes').select('id, nome, senha').in('cpf', variacoesCpf(cpf)).limit(1).maybeSingle();
  if (!data) return erro('CPF não encontrado', 404, 'CPF_NAO_ENCONTRADO');
  if (data.senha) return erro('Conta já ativada', 409, 'CONTA_JA_ATIVA');
  return ok({ cliente_id: data.id, nome: data.nome });
}

async function primeiroAcessoAtivar(req: Request) {
  if (excedeuTentativas(`pa:${ipDe(req)}`, 15)) return erro('Muitas tentativas. Aguarde alguns minutos.', 429);
  const { cpf, senha } = await corpo(req);
  if (soDigitos(cpf).length !== 11 || String(senha || '').length < 6) return erro('Dados inválidos');
  const { data: c } = await db.from('clientes').select('cpf').in('cpf', variacoesCpf(cpf)).limit(1).maybeSingle();
  if (!c) return ok({ resultado: 'cpf_nao_encontrado' });
  const { data: resultado, error } = await db.rpc('ativar_conta_cliente', { p_cpf: c.cpf, p_senha: String(senha) });
  if (error) return erro('Não foi possível criar sua conta', 500);
  return ok({ resultado });
}

// ---------------------------------------------------------------- autenticadas
async function me(req: Request, s: SessaoCliente) {
  if (req.method === 'PATCH') {
    const b = await corpo(req);
    const lat = Number(b.latitude), lon = Number(b.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return erro('Localização inválida');
    const { error } = await db.from('clientes').update({
      latitude: lat, longitude: lon,
      ponto_referencia: texto(b.ponto_referencia, 300),
      localizacao_confirmada_em: new Date().toISOString(),
    }).eq('id', s.clienteId).eq('empresa_id', s.empresaId);
    if (error) return erro('Não foi possível salvar', 500);
  }
  const { data } = await db.from('clientes').select('*').eq('id', s.clienteId).eq('empresa_id', s.empresaId).maybeSingle();
  if (!data) return erro('Sessão inválida', 401);
  return ok({ cliente: clientePublico(data), empresa: await empresaPublica(s.empresaId) });
}

async function faturas(req: Request, s: SessaoCliente) {
  const { data: c } = await db.from('clientes').select('cpf, cnpj').eq('id', s.clienteId).maybeSingle();
  const docs = [c?.cpf, c?.cnpj].filter(Boolean).flatMap((d) => variacoesCpf(String(d)));
  const filtro = [`cliente_id.eq.${s.clienteId}`];
  if (docs.length) filtro.push(`and(cliente_id.is.null,customer_document.in.(${docs.map((d) => `"${d}"`).join(',')}))`);

  const { data, error } = await db.from('faturas').select('*')
    .eq('empresa_id', s.empresaId).or(filtro.join(','))
    .order('data_vencimento', { ascending: false });
  if (error) return erro('Erro ao carregar faturas', 500);

  let lista = (data || []).map((f) => ({
    id: f.id,
    descricao: f.description || f.plano || f.mes || null,
    valor: Number(f.valor ?? f.amount ?? 0),
    data_vencimento: f.data_vencimento ?? f.due_date,
    data_pagamento: f.data_pagamento ?? f.paid_date ?? f.payment_date ?? null,
    status: statusParaCliente(f.status, f.data_vencimento ?? f.due_date),
    metodo: f.metodo ?? f.billing_type ?? null,
    pix_copia_cola: f.pix_copy_paste ?? null,
    pix_qr_code: f.pix_qr_code ?? null,
    boleto_url: f.boleto_url ?? null,
    linha_digitavel: f.boleto_barcode ?? null,
    link_pagamento: f.invoice_url ?? null,
  })).filter((f) => f.status !== 'cancelada');

  if (new URL(req.url).searchParams.get('abertas')) {
    lista = lista.filter((f) => f.status === 'pendente' || f.status === 'vencida')
      .sort((a, b) => String(a.data_vencimento).localeCompare(String(b.data_vencimento)));
  }
  return ok({ faturas: lista });
}

async function contrato(_req: Request, s: SessaoCliente) {
  const { data } = await db.from('contratos').select('*, plano:planos(*)')
    .eq('cliente_id', s.clienteId).eq('empresa_id', s.empresaId).eq('status', 'ativo')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return ok({ contrato: data || null });
}

async function categorias(_req: Request, s: SessaoCliente) {
  const { data } = await db.from('chamado_categorias').select('id, nome, descricao, prioridade_padrao')
    .eq('empresa_id', s.empresaId).eq('ativo', true).order('nome');
  return ok({ categorias: data || [] });
}

async function nomeCliente(s: SessaoCliente) {
  const { data } = await db.from('clientes').select('nome').eq('id', s.clienteId).maybeSingle();
  return data?.nome || 'Cliente';
}

async function chamados(req: Request, s: SessaoCliente) {
  if (req.method === 'POST') {
    const b = await corpo(req);
    const assunto = texto(b.assunto, 200), descricao = texto(b.descricao, 5000);
    if (!assunto || !descricao) return erro('Preencha assunto e descrição');
    const prioridade = ['baixa', 'media', 'alta', 'urgente'].includes(b.prioridade) ? b.prioridade : 'media';
    if (b.categoria_id) {
      const { data: cat } = await db.from('chamado_categorias').select('id').eq('id', b.categoria_id).eq('empresa_id', s.empresaId).maybeSingle();
      if (!cat) return erro('Categoria inválida');
    }
    const { data, error } = await db.from('chamados').insert({
      empresa_id: s.empresaId, cliente_id: s.clienteId, categoria_id: b.categoria_id || null,
      assunto, descricao, prioridade, origem: 'app',
    }).select().single();
    if (error) return erro('Não foi possível abrir o chamado', 500);
    await db.from('chamado_mensagens').insert({
      empresa_id: s.empresaId, chamado_id: data.id, autor_tipo: 'cliente', autor_id: s.clienteId,
      autor_nome: await nomeCliente(s), mensagem: descricao, interna: false,
    });
    return ok({ chamado: data }, 201);
  }
  const { data } = await db.from('chamados').select('*, categoria:chamado_categorias(id, nome)')
    .eq('cliente_id', s.clienteId).eq('empresa_id', s.empresaId).order('created_at', { ascending: false });
  return ok({ chamados: data || [] });
}

async function chamadoDoCliente(id: string, s: SessaoCliente) {
  const { data } = await db.from('chamados').select('*, categoria:chamado_categorias(id, nome)')
    .eq('id', id).eq('cliente_id', s.clienteId).eq('empresa_id', s.empresaId).maybeSingle();
  return data;
}

async function chamadoDetalhe(_req: Request, s: SessaoCliente, id: string) {
  const chamado = await chamadoDoCliente(id, s);
  if (!chamado) return erro('Chamado não encontrado', 404);
  const [{ data: mensagens }, { data: aval }] = await Promise.all([
    db.from('chamado_mensagens').select('id, chamado_id, autor_tipo, autor_nome, mensagem, anexo_url, created_at')
      .eq('chamado_id', id).eq('interna', false).order('created_at', { ascending: true }), // notas internas não vão para o cliente
    db.from('avaliacoes').select('id').eq('chamado_id', id).eq('cliente_id', s.clienteId).maybeSingle(),
  ]);
  return ok({ chamado, mensagens: mensagens || [], ja_avaliou: !!aval });
}

async function chamadoMensagem(req: Request, s: SessaoCliente, id: string) {
  const chamado = await chamadoDoCliente(id, s);
  if (!chamado) return erro('Chamado não encontrado', 404);
  const mensagem = texto((await corpo(req)).mensagem, 5000);
  if (!mensagem) return erro('Mensagem vazia');
  const { data, error } = await db.from('chamado_mensagens').insert({
    empresa_id: s.empresaId, chamado_id: id, autor_tipo: 'cliente', autor_id: s.clienteId,
    autor_nome: await nomeCliente(s), mensagem, interna: false,
  }).select('id, chamado_id, autor_tipo, autor_nome, mensagem, anexo_url, created_at').single();
  if (error) return erro('Não foi possível enviar', 500);
  return ok({ mensagem: data }, 201);
}

const notaValida = (n: unknown) => Number.isInteger(Number(n)) && Number(n) >= 1 && Number(n) <= 5;

async function chamadoAvaliacao(req: Request, s: SessaoCliente, id: string) {
  const chamado = await chamadoDoCliente(id, s);
  if (!chamado) return erro('Chamado não encontrado', 404);
  const b = await corpo(req);
  if (!notaValida(b.nota)) return erro('Nota deve ser de 1 a 5');
  const { data: ja } = await db.from('avaliacoes').select('id').eq('chamado_id', id).eq('cliente_id', s.clienteId).maybeSingle();
  if (ja) return erro('Chamado já avaliado', 409);
  const { error } = await db.from('avaliacoes').insert({
    empresa_id: s.empresaId, cliente_id: s.clienteId, chamado_id: id,
    nota: Number(b.nota), comentario: texto(b.comentario, 1000) || null, tipo: 'chamado',
  });
  if (error) return erro('Não foi possível avaliar', 500);
  return ok({ sucesso: true }, 201);
}

async function os(_req: Request, s: SessaoCliente) {
  const { data: emDeslocamento } = await db.from('ordens_servico')
    .select('id, numero, tipo, status, tecnico_id, deslocamento_em')
    .eq('cliente_id', s.clienteId).eq('empresa_id', s.empresaId).eq('status', 'em_deslocamento')
    .order('deslocamento_em', { ascending: false }).limit(1).maybeSingle();

  let tecnico_localizacao = null, tecnico_nome = null;
  if (emDeslocamento?.tecnico_id) {
    const [{ data: loc }, { data: tec }] = await Promise.all([
      db.from('tecnico_localizacoes').select('latitude, longitude, updated_at').eq('tecnico_id', emDeslocamento.tecnico_id).maybeSingle(),
      db.from('tecnicos').select('nome').eq('id', emDeslocamento.tecnico_id).maybeSingle(),
    ]);
    tecnico_localizacao = loc || null;
    tecnico_nome = tec?.nome || null;
  }

  const { data: pend } = await db.rpc('buscar_os_pendente_avaliacao', { p_cliente_id: s.clienteId });
  return ok({
    em_deslocamento: emDeslocamento ? { ...emDeslocamento, tecnico_nome } : null,
    tecnico_localizacao,
    pendente_avaliacao: Array.isArray(pend) && pend.length ? pend[0] : null,
  });
}

async function osAvaliacao(req: Request, s: SessaoCliente, id: string) {
  const { data: ordem } = await db.from('ordens_servico').select('id')
    .eq('id', id).eq('cliente_id', s.clienteId).eq('empresa_id', s.empresaId).maybeSingle();
  if (!ordem) return erro('Ordem de serviço não encontrada', 404);
  const b = await corpo(req);
  if (!notaValida(b.nota)) return erro('Nota deve ser de 1 a 5');
  const { data, error } = await db.rpc('avaliar_tecnico', {
    p_ordem_servico_id: id, p_nota: Number(b.nota), p_comentario: texto(b.comentario, 1000) || null,
  });
  if (error) return erro('Não foi possível avaliar', 500);
  if (data && data.success === false) return erro(data.error || 'Não foi possível avaliar', 409);
  return ok({ sucesso: true }, 201);
}

async function pushToken(req: Request, s: SessaoCliente) {
  const b = await corpo(req);
  const token = texto(b.token, 300);
  if (!/^ExponentPushToken\[.+\]$|^ExpoPushToken\[.+\]$/.test(token)) return erro('Token inválido');
  const { data: existente } = await db.from('push_tokens').select('id').eq('token', token).maybeSingle();
  const dados = {
    cliente_id: s.clienteId, empresa_id: s.empresaId, token,
    plataforma: texto(b.plataforma, 20) || null, ativo: true, updated_at: new Date().toISOString(),
  };
  const { error } = existente
    ? await db.from('push_tokens').update(dados).eq('id', existente.id)
    : await db.from('push_tokens').insert(dados);
  if (error) return erro('Não foi possível registrar o aparelho', 500);
  return ok({ sucesso: true });
}

// ---------------------------------------------------------------- roteador
async function rotear(req: Request, ctx: Ctx) {
  const [a, b, c] = (await ctx.params).rota || [];
  const m = req.method;

  if (m === 'POST' && a === 'login') return login(req);
  if (m === 'POST' && a === 'primeiro-acesso' && b === 'verificar') return primeiroAcessoVerificar(req);
  if (m === 'POST' && a === 'primeiro-acesso' && b === 'ativar') return primeiroAcessoAtivar(req);

  const s = await getClienteDaRequisicao(req);
  if (!s) return erro('Sessão expirada. Entre novamente.', 401, 'SESSAO_INVALIDA');

  if (a === 'me' && (m === 'GET' || m === 'PATCH')) return me(req, s);
  if (a === 'faturas' && m === 'GET') return faturas(req, s);
  if (a === 'contrato' && m === 'GET') return contrato(req, s);
  if (a === 'categorias' && m === 'GET') return categorias(req, s);
  if (a === 'chamados' && !b && (m === 'GET' || m === 'POST')) return chamados(req, s);
  if (a === 'chamados' && b && !c && m === 'GET') return chamadoDetalhe(req, s, b);
  if (a === 'chamados' && b && c === 'mensagens' && m === 'POST') return chamadoMensagem(req, s, b);
  if (a === 'chamados' && b && c === 'avaliacao' && m === 'POST') return chamadoAvaliacao(req, s, b);
  if (a === 'os' && !b && m === 'GET') return os(req, s);
  if (a === 'os' && b && c === 'avaliacao' && m === 'POST') return osAvaliacao(req, s, b);
  if (a === 'push-token' && m === 'POST') return pushToken(req, s);

  return erro('Rota não encontrada', 404);
}

export const GET = rotear;
export const POST = rotear;
export const PATCH = rotear;
