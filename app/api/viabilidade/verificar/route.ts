// app/api/viabilidade/verificar/route.ts
// Rota PÚBLICA usada pela página /viabilidade/[slug].
// O servidor calcula a cobertura (a lista de CTOs nunca sai do servidor),
// calcula o lead score e salva o lead no painel do provedor.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const LIMITE_PADRAO_METROS = 250;
const JANELA_DUPLICADO_MIN = 5;

// Anti-spam simples por IP (5 consultas por minuto)
const tentativas = new Map<string, { n: number; inicio: number }>();
function bloqueadoPorSpam(ip: string) {
  const agora = Date.now();
  const reg = tentativas.get(ip);
  if (!reg || agora - reg.inicio > 60_000) {
    tentativas.set(ip, { n: 1, inicio: agora });
    return false;
  }
  reg.n += 1;
  return reg.n > 5;
}

const texto = (v: unknown, max = 120) =>
  typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim().slice(0, max) : '';

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcularScore(temCobertura: boolean, proporcao: number, perfilUso: string, tipoImovel: string) {
  let s = 0;
  if (temCobertura) s += proporcao <= 0.33 ? 50 : proporcao <= 0.66 ? 30 : 15;
  s += ({ GAMER: 30, TRABALHO: 25, FAMILIA: 15, SOLO: 10 } as Record<string, number>)[perfilUso] || 0;
  s += ({ COMERCIO: 20, PREDIO: 15, CASA: 10, GALPAO: 5 } as Record<string, number>)[tipoImovel] || 0;
  return s;
}

async function sortearAtendente(empresaId: string) {
  const { data: equipe } = await supabase
    .from('operadores').select('nome')
    .eq('empresa_id', empresaId).in('role', ['atendente', 'vendedor', 'comercial'])
    .order('nome', { ascending: true });
  if (!equipe || equipe.length === 0) return null;

  const { data: ultimo } = await supabase
    .from('leads').select('atendente')
    .eq('empresa_id', empresaId).not('atendente', 'is', null)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  const i = ultimo?.atendente ? equipe.findIndex((o) => o.nome === ultimo.atendente) : -1;
  return equipe[i !== -1 && i + 1 < equipe.length ? i + 1 : 0].nome;
}

export async function POST(request: NextRequest) {
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  if (bloqueadoPorSpam(ip)) {
    return NextResponse.json({ erro: 'Muitas consultas. Aguarde um minuto.' }, { status: 429 });
  }

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ erro: 'Requisição inválida' }, { status: 400 }); }

  const empresaId = texto(body.empresa_id, 60);
  const nome = texto(body.nome, 120);
  const telefone = texto(body.telefone, 30).replace(/[^\d()+\- ]/g, '');
  const cep = texto(body.cep, 12);
  const numero = texto(body.numero, 80);
  const tipoImovel = texto(body.tipoImovel, 20).toUpperCase();
  const perfilUso = texto(body.perfilUso, 20).toUpperCase();
  const lat = Number(body.lat), lon = Number(body.lon);

  if (!empresaId || !nome || telefone.replace(/\D/g, '').length < 10 || !cep || !numero ||
      !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
  }

  const { data: empresa } = await supabase.from('empresas').select('id').eq('id', empresaId).maybeSingle();
  if (!empresa) return NextResponse.json({ erro: 'Provedor não encontrado' }, { status: 404 });

  // Consulta repetida do mesmo telefone em poucos minutos: devolve o resultado anterior
  const desde = new Date(Date.now() - JANELA_DUPLICADO_MIN * 60_000).toISOString();
  const { data: recente } = await supabase
    .from('leads').select('perfil')
    .eq('empresa_id', empresaId).eq('whatsapp', telefone).gte('created_at', desde)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (recente) {
    return NextResponse.json({ temCobertura: recente.perfil === 'COM COBERTURA', repetida: true });
  }

  // CTO mais próxima (paginado, igual ao /api/ctos)
  let menor = Infinity;
  for (let de = 0; ; de += 1000) {
    const { data: ctos, error } = await supabase
      .from('ctos').select('*').eq('provedor_id', empresaId).range(de, de + 999);
    if (error) return NextResponse.json({ erro: 'Erro ao consultar a rede' }, { status: 500 });
    for (const cto of ctos || []) {
      const cLat = Number(cto.lat ?? cto.latitude ?? cto.Y);
      const cLon = Number(cto.lon ?? cto.longitude ?? cto.X);
      if (Number.isFinite(cLat) && Number.isFinite(cLon)) {
        menor = Math.min(menor, distanciaMetros(lat, lon, cLat, cLon));
      }
    }
    if (!ctos || ctos.length < 1000) break;
  }

  const temCobertura = menor <= LIMITE_PADRAO_METROS;
  const score = calcularScore(temCobertura, menor / LIMITE_PADRAO_METROS, perfilUso, tipoImovel);

  const { error: erroLead } = await supabase.from('leads').insert([{
    empresa_id: empresaId,
    nome,
    whatsapp: telefone,
    cep,
    numero: `${numero} [${tipoImovel} / ${perfilUso}] · score ${score}`,
    perfil: temCobertura ? 'COM COBERTURA' : 'SEM COBERTURA',
    lat,
    lon,
    atendente: await sortearAtendente(empresaId),
  }]);
  if (erroLead) {
    console.error('[viabilidade] erro ao salvar lead:', erroLead.message);
    return NextResponse.json({ erro: 'Erro ao registrar a consulta' }, { status: 500 });
  }

  return NextResponse.json({ temCobertura });
}
