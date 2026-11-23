// app/api/notificacoes/cron/route.js
// Roda todo dia às 11:00 UTC (08:00 de Brasília) pelo Vercel Cron (vercel.json).
// Avisa o cliente pelo app: 3 dias antes, na véspera, no dia e 1 dia depois do vencimento.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { STATUS_EM_ABERTO, soDigitos } from '@/lib/faturas-status';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const dia = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split('T')[0];
};

const real = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Fatura gravada pelo gateway sem cliente_id: tenta achar o cliente pelo CPF/CNPJ no mesmo provedor
async function resolverCliente(f) {
  if (f.cliente_id) return { id: f.cliente_id, nome: f.clientes?.nome };
  const doc = soDigitos(f.customer_document);
  if (!doc) return null;
  const { data } = await supabase
    .from('clientes').select('id, nome, cpf, cnpj').eq('empresa_id', f.empresa_id);
  const c = (data || []).find((x) => soDigitos(x.cpf) === doc || soDigitos(x.cnpj) === doc);
  return c ? { id: c.id, nome: c.nome } : null;
}

async function enviarPush(clienteId, empresaId, titulo, corpo, dados) {
  const { data: tokens } = await supabase
    .from('push_tokens').select('token')
    .eq('cliente_id', clienteId).eq('empresa_id', empresaId).eq('ativo', true);
  if (!tokens || tokens.length === 0) return 0;

  const mensagens = tokens.map((t) => ({ to: t.token, sound: 'default', title: titulo, body: corpo, data: dados }));
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mensagens),
    });
    if (!res.ok) console.error('[cron] Expo push respondeu', res.status);
    return mensagens.length;
  } catch (e) {
    console.error('[cron] Erro push:', e);
    return 0;
  }
}

const REGRAS = [
  { data: () => dia(3), tipo: 'fatura_vencendo', titulo: 'Fatura próxima do vencimento',
    corpo: (n, v) => `Olá ${n}! Sua fatura de ${v} vence em 3 dias.` },
  { data: () => dia(1), tipo: 'fatura_amanha', titulo: 'Fatura vence amanhã!',
    corpo: (n, v) => `${n}, sua fatura de ${v} vence amanhã. Evite juros!` },
  { data: () => dia(0), tipo: 'fatura_hoje', titulo: 'Fatura vence hoje!',
    corpo: (n, v) => `${n}, sua fatura de ${v} vence hoje! Pague para evitar bloqueio.` },
  { data: () => dia(-1), tipo: 'fatura_vencida', titulo: 'Fatura em atraso',
    corpo: (n, v) => `${n}, sua fatura de ${v} está vencida. Regularize para evitar suspensão.` },
];

export async function GET(req) {
  // Sem CRON_SECRET configurado a rota fica fechada (antes ficava aberta para qualquer um)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 });
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    let totalEnviados = 0;
    const resumo = {};

    for (const regra of REGRAS) {
      const { data: faturas, error } = await supabase
        .from('faturas')
        .select('id, cliente_id, empresa_id, valor, customer_document, clientes(nome)')
        .in('status', STATUS_EM_ABERTO)
        .eq('data_vencimento', regra.data());
      if (error) throw error;

      let enviados = 0;
      for (const f of faturas || []) {
        const cliente = await resolverCliente(f);
        if (!cliente) continue;
        const nome = (cliente.nome || 'Cliente').split(' ')[0];
        enviados += await enviarPush(cliente.id, f.empresa_id, regra.titulo, regra.corpo(nome, real(f.valor)),
          { tipo: regra.tipo, fatura_id: f.id });
      }
      resumo[regra.tipo] = { faturas: (faturas || []).length, pushes: enviados };
      totalEnviados += enviados;
    }

    return NextResponse.json({ success: true, data: dia(0), totalEnviados, resumo });
  } catch (e) {
    console.error('Erro no cron:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
