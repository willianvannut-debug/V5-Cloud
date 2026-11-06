// app/api/dashboard/overview/route.ts
import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEmpresaDaSessao } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const TZ = 'America/Sao_Paulo';
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const PAGOS = new Set(['received', 'confirmed', 'paid', 'pago', 'paga', 'received_in_cash', 'recebido', 'recebida']);
const CANCELADOS = new Set(['cancelled', 'canceled', 'cancelado', 'cancelada', 'deleted', 'refunded', 'estornado', 'estornada']);
const VENCIDOS = new Set(['overdue', 'vencido', 'vencida', 'atrasado', 'atrasada']);
const CHAMADO_FECHADO = new Set(['resolvido', 'fechado', 'resolved', 'closed', 'cancelado']);
const CONTRATO_ATIVO = new Set(['active', 'ativo', 'ativa']);

const norm = (s: any) => String(s ?? '').trim().toLowerCase();

function hojeBR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function soData(v: any): string | null {
  if (!v) return null;
  const s = String(v);
  if (s.length <= 10) return s.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(s));
}
function num(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[R$\s]/g, '');
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function buscarTudo(sb: SupabaseClient, tabela: string, colunas: string, empresaId: string, coluna = 'empresa_id') {
  const linhas: any[] = [];
  const passo = 1000;
  for (let de = 0; ; de += passo) {
    const { data, error } = await sb.from(tabela).select(colunas).eq(coluna, empresaId).range(de, de + passo - 1);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas.push(...(data || []));
    if (!data || data.length < passo) break;
  }
  return linhas;
}

export async function GET(req: Request) {
  console.log('COOKIE-DEBUG:', req.headers.get('cookie'));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local' }, { status: 500 });
  }

  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const empresaId = sessao.empresaId;

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const avisos: string[] = [];

  const tentar = async (nome: string, fn: () => Promise<any[]>) => {
    try { return await fn(); } catch (e: any) { avisos.push(e.message || nome); return []; }
  };

  const [clientes, leads, contratos, faturas, chamados] = await Promise.all([
    tentar('clientes', () => buscarTudo(sb, 'clientes', 'status', empresaId)),
    tentar('leads', () => buscarTudo(sb, 'leads', '*', empresaId)),
    tentar('contratos', () => buscarTudo(sb, 'contratos', 'status, amount', empresaId)),
    tentar('faturas', () => buscarTudo(sb, 'faturas', '*', empresaId)),
    tentar('chamados', () => buscarTudo(sb, 'chamados', 'status', empresaId)),
  ]);

  const hoje = hojeBR();
  const mesAtual = hoje.slice(0, 7);

  const stCli = clientes.map(c => norm(c.status));
  const clientesRes = {
    total: clientes.length,
    ativos: stCli.filter(s => s === 'ativo' || s === 'active').length,
    bloqueados: stCli.filter(s => s.startsWith('bloquead') || s === 'blocked' || s === 'suspenso' || s === 'suspended').length,
    cancelados: stCli.filter(s => s.startsWith('cancelad') || s === 'cancelled' || s === 'inativo').length,
  };

  const leadsMes = leads.filter(l => (soData(l.created_at) || '').startsWith(mesAtual));
  const leadsRes = {
    totalGeral: leads.length,
    totalMes: leadsMes.length,
    convertidosMes: leadsMes.filter(l => norm(l.status) === 'convertido').length,
    emAtendimento: leads.filter(l => norm(l.status) === 'em_atendimento').length,
  };
  const ultimosLeads = [...leads]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 6)
    .map(l => ({
      id: l.id,
      nome: l.nome || l.name || '-',
      whatsapp: l.whatsapp || l.telefone || '',
      plano_escolhido: l.plano_escolhido || l.plano || '',
      status: l.status || '',
      created_at: l.created_at,
    }));

  const contratosAtivos = contratos.filter(c => CONTRATO_ATIVO.has(norm(c.status)));
  const contratosRes = {
    ativos: contratosAtivos.length,
    receitaMensal: contratosAtivos.reduce((s, c) => s + num(c.amount), 0),
  };

  const fat = faturas
    .map(f => {
      const st = norm(f.status);
      const venc = soData(f.due_date ?? f.data_vencimento);
      const pagoEm = soData(f.paid_date ?? f.data_pagamento);
      const valor = num(f.amount ?? f.valor);
      const pago = PAGOS.has(st) || (!!pagoEm && !CANCELADOS.has(st));
      const cancelado = CANCELADOS.has(st);
      const vencido = !pago && !cancelado && (VENCIDOS.has(st) || (!!venc && venc < hoje));
      return {
        id: f.id,
        nome: f.customer_name || f.cliente_nome || f.nome_cliente || f.nome || '-',
        documento: f.customer_document || f.cpf_cnpj || '',
        tipo: f.billing_type || f.forma_pagamento || f.metodo || '',
        statusOriginal: f.status,
        venc, pagoEm, valor,
        valorPago: num(f.total_paid ?? f.valor_recebido) || valor,
        pago, cancelado, vencido,
        aberto: !pago && !cancelado,
      };
    })
    .filter(f => !f.cancelado);

  const doMes = fat.filter(f => (f.venc || '').startsWith(mesAtual));
  const pagasNoMes = fat.filter(f => f.pago && (f.pagoEm || '').startsWith(mesAtual));
  const pagasHoje = fat.filter(f => f.pago && f.pagoEm === hoje);
  const abertasEmDia = fat.filter(f => f.aberto && !f.vencido);
  const vencidasDoMes = doMes.filter(f => f.vencido);

  const financeiroRes = {
    faturamentoMes: doMes.reduce((s, f) => s + f.valor, 0),
    totalFaturas: doMes.length,
    recebidoMes: pagasNoMes.reduce((s, f) => s + f.valorPago, 0),
    faturasPagas: pagasNoMes.length,
    pendenteMes: abertasEmDia.reduce((s, f) => s + f.valor, 0),
    faturasPendentes: abertasEmDia.length,
    inadimplenciaMes: vencidasDoMes.reduce((s, f) => s + f.valor, 0),
    faturasVencidas: vencidasDoMes.length,
  };

  const recebidoHoje = {
    valor: pagasHoje.reduce((s, f) => s + f.valorPago, 0),
    quantidade: pagasHoje.length,
  };

  const [anoH, mesH] = mesAtual.split('-').map(Number);
  const graficoFaturamento = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(anoH, mesH - 1 - (5 - i), 1));
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const doMesG = fat.filter(f => (f.venc || '').startsWith(chave));
    return {
      mes: chave,
      mes_label: `${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`,
      total: doMesG.reduce((s, f) => s + f.valor, 0),
      recebido: doMesG.filter(f => f.pago).reduce((s, f) => s + f.valorPago, 0),
      vencido: doMesG.filter(f => f.vencido).reduce((s, f) => s + f.valor, 0),
    };
  });
  const temDadosGrafico = graficoFaturamento.some(g => g.total > 0);

  const faturasPendentes = fat
    .filter(f => f.aberto)
    .sort((a, b) => (a.venc || '9999').localeCompare(b.venc || '9999'))
    .slice(0, 8)
    .map(f => ({
      id: f.id,
      customer_name: f.nome,
      customer_document: f.documento,
      amount: f.valor,
      due_date: f.venc || '',
      status: f.vencido ? 'OVERDUE' : 'PENDING',
      billing_type: f.tipo,
    }));

  const ticketsAbertos = chamados.filter(c => !CHAMADO_FECHADO.has(norm(c.status))).length;

  return NextResponse.json({
    data: {
      clientes: clientesRes,
      leads: leadsRes,
      financeiro: financeiroRes,
      contratos: contratosRes,
      recebidoHoje,
      ticketsAbertos,
      graficoFaturamento: temDadosGrafico ? graficoFaturamento : [],
      faturasPendentes,
      ultimosLeads,
    },
    avisos,
  });
}