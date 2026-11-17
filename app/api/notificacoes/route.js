// ============================================
// V5 Fibra - API de Notificações Push
// Envia push via Expo Push Service
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Enviar notificação push via Expo
async function enviarPush(tokens, titulo, corpo, dados = {}) {
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: titulo,
    body: corpo,
    data: dados,
  }));

  // Expo aceita até 100 por request
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const resultados = [];
  for (const chunk of chunks) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      const json = await res.json();
      resultados.push(json);
    } catch (e) {
      console.error('Erro ao enviar push:', e);
    }
  }

  return resultados;
}

// POST - Enviar notificação
export async function POST(req) {
  try {
    const body = await req.json();
    const { tipo, empresa_id, cliente_id, titulo, mensagem, dados } = body;

    if (!empresa_id || !titulo || !mensagem) {
      return NextResponse.json(
        { success: false, error: 'empresa_id, titulo e mensagem obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar tokens
    let query = supabase
      .from('push_tokens')
      .select('token')
      .eq('empresa_id', empresa_id)
      .eq('ativo', true);

    // Se tem cliente_id, envia só pra esse cliente
    if (cliente_id) {
      query = query.eq('cliente_id', cliente_id);
    }

    const { data: tokenRows, error } = await query;
    if (error) throw error;

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({
        success: true,
        enviados: 0,
        mensagem: 'Nenhum dispositivo registrado',
      });
    }

    const tokens = tokenRows.map((r) => r.token);
    const resultados = await enviarPush(tokens, titulo, mensagem, dados || {});

    return NextResponse.json({
      success: true,
      enviados: tokens.length,
      resultados,
    });
  } catch (e) {
    console.error('Erro na API de notificações:', e);
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}
