import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function enviarPushParaCliente(clienteId, empresaId, titulo, corpo, dados = {}) {
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('cliente_id', clienteId)
    .eq('empresa_id', empresaId)
    .eq('ativo', true);

  if (!tokens || tokens.length === 0) return 0;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title: titulo,
    body: corpo,
    data: dados,
  }));

  try {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    return messages.length;
  } catch (e) {
    console.error('Erro push:', e);
    return 0;
  }
}

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];
    const em3dias = new Date(); em3dias.setDate(em3dias.getDate() + 3);
    const em3diasStr = em3dias.toISOString().split('T')[0];
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    const ontemStr = ontem.toISOString().split('T')[0];

    let totalEnviados = 0;

    // 1. Faturas que vencem em 3 dias
    const { data: f3 } = await supabase.from('faturas')
      .select('id, cliente_id, empresa_id, valor, clientes(nome)')
      .eq('status', 'pendente').eq('data_vencimento', em3diasStr);
    for (const f of (f3 || [])) {
      const nome = f.clientes?.nome || 'Cliente';
      const valor = Number(f.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      totalEnviados += await enviarPushParaCliente(f.cliente_id, f.empresa_id,
        'Fatura proxima do vencimento',
        `Ola ${nome}! Sua fatura de ${valor} vence em 3 dias.`,
        { tipo: 'fatura_vencendo', fatura_id: f.id });
    }

    // 2. Faturas que vencem amanha
    const { data: f1 } = await supabase.from('faturas')
      .select('id, cliente_id, empresa_id, valor, clientes(nome)')
      .eq('status', 'pendente').eq('data_vencimento', amanhaStr);
    for (const f of (f1 || [])) {
      const nome = f.clientes?.nome || 'Cliente';
      const valor = Number(f.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      totalEnviados += await enviarPushParaCliente(f.cliente_id, f.empresa_id,
        'Fatura vence amanha!',
        `${nome}, sua fatura de ${valor} vence amanha. Evite juros!`,
        { tipo: 'fatura_amanha', fatura_id: f.id });
    }

    // 3. Faturas que vencem hoje
    const { data: fh } = await supabase.from('faturas')
      .select('id, cliente_id, empresa_id, valor, clientes(nome)')
      .eq('status', 'pendente').eq('data_vencimento', hoje);
    for (const f of (fh || [])) {
      const nome = f.clientes?.nome || 'Cliente';
      const valor = Number(f.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      totalEnviados += await enviarPushParaCliente(f.cliente_id, f.empresa_id,
        'Fatura vence hoje!',
        `${nome}, sua fatura de ${valor} vence hoje! Pague para evitar bloqueio.`,
        { tipo: 'fatura_hoje', fatura_id: f.id });
    }

    // 4. Faturas vencidas ontem
    const { data: fv } = await supabase.from('faturas')
      .select('id, cliente_id, empresa_id, valor, clientes(nome)')
      .eq('status', 'pendente').eq('data_vencimento', ontemStr);
    for (const f of (fv || [])) {
      const nome = f.clientes?.nome || 'Cliente';
      const valor = Number(f.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      totalEnviados += await enviarPushParaCliente(f.cliente_id, f.empresa_id,
        'Fatura em atraso',
        `${nome}, sua fatura de ${valor} esta vencida. Regularize para evitar suspensao.`,
        { tipo: 'fatura_vencida', fatura_id: f.id });
    }

    return NextResponse.json({ success: true, data: hoje, totalEnviados });
  } catch (e) {
    console.error('Erro no cron:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
