// app/api/painel/v1/[...rota]/route.ts
// API do PAINEL (operadores). Substitui as leituras/escritas que as telas faziam
// direto no banco com a chave pública. Toda consulta é presa à empresa do operador
// (vinda do cookie assinado), para o banco poder ser fechado à chave pública.
//
//  GET  clientes?view=lista|mapa|observacoes|exportar|migrar&status=&busca=
//  GET  clientes/:id/rede        | PATCH clientes/:id/rede { campos de rede }
//  PATCH clientes/:id/observacao-campo { texto }
//  GET  clientes/:id/contratos
//  GET  planos
//  GET  cliente-historico?tipo=
//  GET  cliente-observacoes?cliente_id=   | POST cliente-observacoes { cliente_id, texto, autor? }
//  GET  conexoes?cliente_id=              | POST conexoes { cliente_id, ...campos }
//  PATCH conexoes/:id { ...campos | status }   | DELETE conexoes/:id

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmpresaDaSessao, type SessaoOperador } from '@/lib/auth-server';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

type Ctx = { params: Promise<{ rota: string[] }> };
const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: mensagem }, { status });
const corpo = async (req: Request) => { try { return await req.json(); } catch { return {}; } };

// Colunas liberadas por visão (o navegador não escolhe colunas)
const VIEWS_CLIENTES: Record<string, string> = {
  lista: 'id, nome, cpf, cnpj, tipo_pessoa, status, telefone, login_pppoe',
  mapa: 'id, nome, cpf, cnpj, telefone, cidade, status, latitude, longitude, login_pppoe',
  observacoes: 'id, nome, cpf, cnpj, tipo_pessoa, status, telefone, observacoes',
  exportar: 'nome, cpf, cnpj, tipo_pessoa, email, telefone, whatsapp, cep, logradouro, numero, complemento, bairro, cidade, uf, status, dia_vencimento, forma_pagamento, observacoes, created_at',
  migrar: 'id, nome, cpf, login_pppoe',
};
const COLS_REDE = ['login_pppoe', 'senha_pppoe', 'ip_fixo', 'mac_address', 'perfil_radius', 'vlan', 'porta_olt', 'cto_id', 'onu_serial'];
const COLS_CONEXAO = ['descricao', 'login_pppoe', 'senha_pppoe', 'mac_address', 'perfil_radius', 'ip_fixo', 'vlan', 'porta_olt', 'onu_serial'];

// Mantém só os campos permitidos, convertendo '' em null
function apenas(campos: string[], obj: any) {
  const out: Record<string, any> = {};
  for (const k of campos) if (k in (obj || {})) out[k] = obj[k] === '' ? null : obj[k];
  return out;
}

async function clienteDaEmpresa(id: string, s: SessaoOperador) {
  const { data } = await db.from('clientes').select('id, empresa_id, observacoes').eq('id', id).maybeSingle();
  return data && data.empresa_id === s.empresaId ? data : null;
}

// ------------------------------------------------------------------ handlers
async function listarClientes(req: Request, s: SessaoOperador) {
  const url = new URL(req.url);
  const view = url.searchParams.get('view') || 'lista';
  const cols = VIEWS_CLIENTES[view];
  if (!cols) return erro('Visão inválida');
  let q = db.from('clientes').select(cols).eq('empresa_id', s.empresaId);
  const status = url.searchParams.get('status');
  if (status && status !== 'todos') q = q.eq('status', status);
  const busca = (url.searchParams.get('busca') || '').trim();
  if (busca) q = q.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,cnpj.ilike.%${busca}%`);
  const limite = Math.min(1000, Math.max(1, Number(url.searchParams.get('limite') || 1000)));
  q = q.order('nome', { ascending: true }).limit(limite);
  const { data, error } = await q;
  if (error) return erro('Erro ao carregar clientes', 500);
  return ok({ clientes: data || [] });
}

async function redeDoCliente(_req: Request, s: SessaoOperador, id: string) {
  if (!(await clienteDaEmpresa(id, s))) return erro('Cliente não encontrado', 404);
  const { data } = await db.from('clientes').select(COLS_REDE.join(', ')).eq('id', id).maybeSingle();
  return ok({ rede: data || {} });
}

async function atualizarRede(req: Request, s: SessaoOperador, id: string) {
  if (!(await clienteDaEmpresa(id, s))) return erro('Cliente não encontrado', 404);
  const campos = apenas(COLS_REDE, await corpo(req));
  if (Object.keys(campos).length === 0) return erro('Nada para salvar');
  const { error } = await db.from('clientes').update(campos).eq('id', id).eq('empresa_id', s.empresaId);
  if (error) return erro('Erro ao salvar no banco de dados', 500);
  return ok({ sucesso: true });
}

async function atualizarObservacaoCampo(req: Request, s: SessaoOperador, id: string) {
  const cli = await clienteDaEmpresa(id, s);
  if (!cli) return erro('Cliente não encontrado', 404);
  const texto = String((await corpo(req)).texto ?? '');
  const { error } = await db.from('clientes').update({ observacoes: texto }).eq('id', id).eq('empresa_id', s.empresaId);
  if (error) return erro('Erro ao salvar', 500);
  return ok({ sucesso: true });
}

async function contratosDoCliente(_req: Request, s: SessaoOperador, id: string) {
  if (!(await clienteDaEmpresa(id, s))) return erro('Cliente não encontrado', 404);
  const { data } = await db.from('contratos').select('*').eq('cliente_id', id).eq('empresa_id', s.empresaId)
    .eq('status', 'ativo').order('created_at', { ascending: false });
  return ok({ contratos: data || [] });
}

async function planos(_req: Request, s: SessaoOperador) {
  const { data } = await db.from('planos').select('*').eq('empresa_id', s.empresaId).order('nome');
  return ok({ planos: data || [] });
}

async function clienteHistorico(req: Request, s: SessaoOperador) {
  const url = new URL(req.url);
  let q = db.from('cliente_historico').select('*, clientes(nome)').eq('empresa_id', s.empresaId);
  const tipo = url.searchParams.get('tipo');
  if (tipo && tipo !== 'todos') q = q.eq('tipo', tipo);
  const busca = (url.searchParams.get('busca') || '').trim();
  if (busca) q = q.or(`descricao.ilike.%${busca}%,autor.ilike.%${busca}%`);
  const pagina = Math.max(0, Number(url.searchParams.get('pagina') || 0));
  const porPagina = Math.min(200, Math.max(1, Number(url.searchParams.get('porPagina') || 50)));
  const { data } = await q.order('created_at', { ascending: false }).range(pagina * porPagina, (pagina + 1) * porPagina - 1);
  return ok({ historico: data || [] });
}

async function observacoes(req: Request, s: SessaoOperador) {
  if (req.method === 'POST') {
    const b = await corpo(req);
    if (!b.cliente_id || !String(b.texto || '').trim()) return erro('Dados incompletos');
    if (!(await clienteDaEmpresa(b.cliente_id, s))) return erro('Cliente não encontrado', 404);
    const { data, error } = await db.from('cliente_observacoes').insert({
      cliente_id: b.cliente_id, empresa_id: s.empresaId, texto: String(b.texto).trim(),
      autor: String(b.autor || s.email || 'Operador').slice(0, 120), autor_id: s.operadorId || null,
    }).select().maybeSingle();
    if (error) return ok({ sucesso: false, semTabela: true }); // a tela cai no campo observacoes
    return ok({ sucesso: true, observacao: data }, 201);
  }
  const clienteId = new URL(req.url).searchParams.get('cliente_id');
  if (!clienteId || !(await clienteDaEmpresa(clienteId, s))) return erro('Cliente não encontrado', 404);
  const { data } = await db.from('cliente_observacoes').select('*').eq('cliente_id', clienteId)
    .eq('empresa_id', s.empresaId).order('created_at', { ascending: false });
  return ok({ observacoes: data || [] });
}

async function conexaoDaEmpresa(id: string, s: SessaoOperador) {
  const { data } = await db.from('conexoes_pppoe').select('id, empresa_id').eq('id', id).maybeSingle();
  return data && data.empresa_id === s.empresaId ? data : null;
}

async function conexoes(req: Request, s: SessaoOperador) {
  if (req.method === 'POST') {
    const b = await corpo(req);
    if (!b.cliente_id || !(await clienteDaEmpresa(b.cliente_id, s))) return erro('Cliente não encontrado', 404);
    const { data, error } = await db.from('conexoes_pppoe').insert({
      cliente_id: b.cliente_id, empresa_id: s.empresaId, ...apenas(COLS_CONEXAO, b),
    }).select().maybeSingle();
    if (error) return erro('Erro ao criar conexão', 500);
    return ok({ conexao: data }, 201);
  }
  const clienteId = new URL(req.url).searchParams.get('cliente_id');
  if (!clienteId || !(await clienteDaEmpresa(clienteId, s))) return erro('Cliente não encontrado', 404);
  const { data } = await db.from('conexoes_pppoe').select('*').eq('cliente_id', clienteId)
    .eq('empresa_id', s.empresaId).order('created_at', { ascending: true });
  return ok({ conexoes: data || [] });
}

async function conexaoPorId(req: Request, s: SessaoOperador, id: string) {
  if (!(await conexaoDaEmpresa(id, s))) return erro('Conexão não encontrada', 404);
  if (req.method === 'DELETE') {
    const { error } = await db.from('conexoes_pppoe').delete().eq('id', id).eq('empresa_id', s.empresaId);
    if (error) return erro('Erro ao remover', 500);
    return ok({ sucesso: true });
  }
  const b = await corpo(req);
  let campos: Record<string, any>;
  if ('status' in b && Object.keys(b).length === 1) {
    if (!['ativo', 'bloqueado'].includes(b.status)) return erro('Status inválido');
    campos = { status: b.status };
  } else {
    campos = apenas(COLS_CONEXAO, b);
  }
  if (Object.keys(campos).length === 0) return erro('Nada para salvar');
  const { error } = await db.from('conexoes_pppoe').update(campos).eq('id', id).eq('empresa_id', s.empresaId);
  if (error) return erro('Erro ao salvar', 500);
  return ok({ sucesso: true });
}

async function minhaEmpresa(req: Request, s: SessaoOperador) {
  if (req.method === 'PATCH') {
    const campos = apenas(['apk_cliente_url', 'apk_tecnico_url'], await corpo(req));
    if (Object.keys(campos).length === 0) return erro('Nada para salvar');
    const { error } = await db.from('empresas').update(campos).eq('id', s.empresaId);
    if (error) return erro('Erro ao salvar', 500);
    return ok({ sucesso: true });
  }
  const { data } = await db.from('empresas').select('*').eq('id', s.empresaId).maybeSingle();
  return ok({ empresa: data || null });
}

const COLS_CTO_GRAVAVEIS = ['nome', 'identificacao', 'codigo', 'lat', 'lon', 'latitude', 'longitude', 'X', 'Y', 'capacidade', 'portas', 'ocupadas', 'observacao', 'endereco', 'cidade', 'bairro', 'tipo', 'cor', 'status'];
function limparCto(c: any, empresaId: string) {
  const out: Record<string, any> = { provedor_id: empresaId };
  for (const k of COLS_CTO_GRAVAVEIS) if (k in (c || {})) out[k] = c[k];
  if (c && c.id && !String(c.id).startsWith('temp-')) out.id = c.id;
  return out;
}

async function ctosColecao(req: Request, s: SessaoOperador) {
  const b = await corpo(req);
  if (req.method === 'POST') {
    const novas = Array.isArray(b.novas) ? b.novas : [];
    for (let i = 0; i < novas.length; i += 500) {
      const { error } = await db.from('ctos').insert(novas.slice(i, i + 500).map((c: any) => limparCto(c, s.empresaId)));
      if (error) return erro('Erro ao salvar CTOs', 500);
    }
    return ok({ sucesso: true });
  }
  if (req.method === 'PATCH') {
    const atualizadas = Array.isArray(b.atualizadas) ? b.atualizadas : [];
    for (let i = 0; i < atualizadas.length; i += 500) {
      const { error } = await db.from('ctos').upsert(atualizadas.slice(i, i + 500).map((c: any) => limparCto(c, s.empresaId)));
      if (error) return erro('Erro ao atualizar CTOs', 500);
    }
    return ok({ sucesso: true });
  }
  // DELETE em lote
  const ids = (Array.isArray(b.ids) ? b.ids : []).filter((x: any) => x && !String(x).startsWith('temp-'));
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await db.from('ctos').delete().eq('provedor_id', s.empresaId).in('id', ids.slice(i, i + 100));
    if (error) return erro('Erro ao apagar CTOs', 500);
  }
  return ok({ sucesso: true });
}

async function ctoPorId(_req: Request, s: SessaoOperador, id: string) {
  const { error } = await db.from('ctos').delete().eq('provedor_id', s.empresaId).eq('id', id);
  if (error) return erro('Erro ao apagar', 500);
  return ok({ sucesso: true });
}

async function minhasOrdensHoje(_req: Request, s: SessaoOperador) {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();
  const { data } = await db.from('ordens_servico').select('id, tipo, status, created_at')
    .eq('empresa_id', s.empresaId).eq('tecnico_id', s.operadorId)
    .gte('created_at', inicio).lte('created_at', fim);
  return ok({ ordens: data || [] });
}

async function leadsResumo(_req: Request, s: SessaoOperador) {
  const [{ count: total }, { count: convertidos }, { data: ultimo }] = await Promise.all([
    db.from('leads').select('*', { count: 'exact', head: true }).eq('empresa_id', s.empresaId),
    db.from('leads').select('*', { count: 'exact', head: true }).eq('empresa_id', s.empresaId).eq('status', 'convertido'),
    db.from('leads').select('created_at').eq('empresa_id', s.empresaId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return ok({ total: total || 0, convertidos: convertidos || 0, ultimo_created_at: ultimo?.created_at || null });
}

async function leadAbordagem(req: Request, s: SessaoOperador) {
  const b = await corpo(req);
  const nome = String(b.nome || '').trim();
  if (!nome) return erro('Informe o nome');
  const { data, error } = await db.from('leads').insert([{
    empresa_id: s.empresaId,
    nome,
    whatsapp: String(b.whatsapp || '').trim() || null,
    cep: b.cep || null,
    numero: b.numero || null,
    status: b.status || null,
    lat: Number.isFinite(Number(b.lat)) ? Number(b.lat) : null,
    lon: Number.isFinite(Number(b.lon)) ? Number(b.lon) : null,
    motivo_pendencia: b.motivo_perda || null,
    atendente: String(b.atendente || s.email || 'Vendedor PAP').slice(0, 120),
  }]).select().maybeSingle();
  if (error) return erro('Erro ao salvar lead: ' + error.message, 500);
  return ok({ lead: data }, 201);
}

const STATUS_LEAD_OK = ['convertido', 'aprovado', 'qualificado', 'novo', 'descartado', 'em_fechamento'];

async function leadsParaConverter(req: Request, s: SessaoOperador) {
  const busca = (new URL(req.url).searchParams.get('busca') || '').trim();
  let q = db.from('leads').select('*').eq('empresa_id', s.empresaId)
    .in('status', ['aprovado', 'qualificado', 'novo']);
  if (busca) q = q.or(`nome.ilike.%${busca}%,whatsapp.ilike.%${busca}%`);
  const { data } = await q.order('created_at', { ascending: false }).limit(50);
  return ok({ leads: data || [] });
}

async function atualizarLead(req: Request, s: SessaoOperador, id: string) {
  const { data: lead } = await db.from('leads').select('id, empresa_id').eq('id', id).maybeSingle();
  if (!lead || lead.empresa_id !== s.empresaId) return erro('Lead não encontrado', 404);
  const status = String((await corpo(req)).status || '');
  if (!STATUS_LEAD_OK.includes(status)) return erro('Status inválido');
  const { error } = await db.from('leads').update({ status }).eq('id', id).eq('empresa_id', s.empresaId);
  if (error) return erro('Erro ao atualizar', 500);
  return ok({ sucesso: true });
}

// ------------------------------------------------------------------ roteador
async function rotear(req: Request, ctx: Ctx) {
  const s = await getEmpresaDaSessao(req);
  if (!s) return erro('Não autorizado', 401);
  const [a, b, c] = (await ctx.params).rota || [];
  const m = req.method;

  if (a === 'clientes' && !b && m === 'GET') return listarClientes(req, s);
  if (a === 'clientes' && b && c === 'rede' && m === 'GET') return redeDoCliente(req, s, b);
  if (a === 'clientes' && b && c === 'rede' && m === 'PATCH') return atualizarRede(req, s, b);
  if (a === 'clientes' && b && c === 'observacao-campo' && m === 'PATCH') return atualizarObservacaoCampo(req, s, b);
  if (a === 'clientes' && b && c === 'contratos' && m === 'GET') return contratosDoCliente(req, s, b);
  if (a === 'empresa' && (m === 'GET' || m === 'PATCH')) return minhaEmpresa(req, s);
  if (a === 'planos' && m === 'GET') return planos(req, s);
  if (a === 'cliente-historico' && m === 'GET') return clienteHistorico(req, s);
  if (a === 'cliente-observacoes' && (m === 'GET' || m === 'POST')) return observacoes(req, s);
  if (a === 'conexoes' && !b && (m === 'GET' || m === 'POST')) return conexoes(req, s);
  if (a === 'conexoes' && b && (m === 'PATCH' || m === 'DELETE')) return conexaoPorId(req, s, b);
  if (a === 'ctos' && !b && (m === 'POST' || m === 'PATCH' || m === 'DELETE')) return ctosColecao(req, s);
  if (a === 'ctos' && b && m === 'DELETE') return ctoPorId(req, s, b);
  if (a === 'ordens' && b === 'minhas-hoje' && m === 'GET') return minhasOrdensHoje(req, s);
  if (a === 'leads-resumo' && m === 'GET') return leadsResumo(req, s);
  if (a === 'leads-abordagem' && m === 'POST') return leadAbordagem(req, s);
  if (a === 'leads-converter' && m === 'GET') return leadsParaConverter(req, s);
  if (a === 'leads' && b && m === 'PATCH') return atualizarLead(req, s, b);

  return erro('Rota não encontrada', 404);
}

export const GET = rotear;
export const POST = rotear;
export const PATCH = rotear;
export const DELETE = rotear;
