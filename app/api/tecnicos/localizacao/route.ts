// ================================================================================
// API LOCALIZAÇÃO DO TÉCNICO - grava a posição GPS atual em tecnico_localizacoes
// e dispara push notifications para o cliente quando o técnico entra nos raios:
//   - 500m → "Técnico chegando!"
//   - 100m → "Técnico chegou!"
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Haversine — distância em metros entre dois pontos
function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Envia push via Expo Push API
async function enviarExpoPush(tokens: string[], titulo: string, corpo: string) {
  if (!tokens.length) return;
  const mensagens = tokens.map((to) => ({ to, title: titulo, body: corpo, sound: 'default' }));
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(mensagens),
    });
  } catch (err) {
    console.error('[PUSH] Erro ao enviar:', err);
  }
}

// Verifica raios e dispara push se ainda não enviou para esta OS
async function verificarEDispararPush(tecnicoId: string, tecLat: number, tecLng: number) {
  // Buscar OS em_deslocamento deste técnico
  const { data: os } = await supabase
    .from('ordens_servico')
    .select('id, cliente_id')
    .eq('tecnico_id', tecnicoId)
    .eq('status', 'em_deslocamento')
    .maybeSingle();

  if (!os) return;

  // Buscar localização da casa do cliente
  const { data: cliente } = await supabase
    .from('clientes')
    .select('latitude, longitude')
    .eq('id', os.cliente_id)
    .maybeSingle();

  if (!cliente?.latitude || !cliente?.longitude) return;

  const dist = distanciaMetros(cliente.latitude, cliente.longitude, tecLat, tecLng);

  // Verificar quais notificações já foram enviadas para esta OS
  const { data: jaEnviadas } = await supabase
    .from('os_notificacoes_enviadas')
    .select('tipo')
    .eq('os_id', os.id);

  const enviados = new Set((jaEnviadas || []).map((r: any) => r.tipo));

  // Buscar tokens de push do cliente
  const { data: tokensData } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('cliente_id', os.cliente_id)
    .eq('ativo', true);

  const tokens = (tokensData || []).map((r: any) => r.token).filter(Boolean);

  // Raio 500m — chegando
  if (dist <= 500 && !enviados.has('chegando')) {
    await Promise.all([
      enviarExpoPush(tokens, '🚗 Técnico chegando!', 'Seu técnico está a menos de 500 metros. Fique atento!'),
      supabase.from('os_notificacoes_enviadas').insert({ os_id: os.id, tipo: 'chegando' }),
    ]);
  }

  // Raio 100m — chegou
  if (dist <= 100 && !enviados.has('chegou')) {
    await Promise.all([
      enviarExpoPush(tokens, '🏠 Técnico chegou!', 'Seu técnico está do lado de fora. Pode abrir a porta!'),
      supabase.from('os_notificacoes_enviadas').insert({ os_id: os.id, tipo: 'chegou' }),
    ]);
  }
}

// POST - Atualiza (upsert) a posição GPS do técnico logado
export async function POST(request: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(request);
    if (!sessao || !sessao.operadorId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'latitude e longitude são obrigatórios' }, { status: 400 });
    }

    // tecnico_id vem da sessão (JWT), nunca do corpo da requisição
    const { error } = await supabase
      .from('tecnico_localizacoes')
      .upsert({
        tecnico_id: sessao.operadorId,
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tecnico_id' });

    if (error) {
      console.error('Erro ao gravar localização:', error);
      return NextResponse.json({ error: 'Erro ao gravar localização' }, { status: 500 });
    }

    // Verificar raios e disparar push em background (não bloqueia a resposta)
    verificarEDispararPush(sessao.operadorId, latitude, longitude).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
