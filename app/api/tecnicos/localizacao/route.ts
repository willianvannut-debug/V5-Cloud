// ================================================================================
// API LOCALIZAÇÃO DO TÉCNICO - grava a posição GPS atual em tecnico_localizacoes
// Caminho: app/api/tecnicos/localizacao/route.ts
//
// Essa rota é o elo que faltava entre:
//   - o botão "Iniciar Deslocamento" do técnico (app/tecnico/ordens/page.tsx)
//   - a tela "técnico a caminho" do cliente (v5fibra-app), que já lê e escuta
//     em tempo real a tabela tecnico_localizacoes via Supabase Realtime
// Antes dessa rota, nada no código escrevia nessa tabela, então o pin do
// técnico no mapa do cliente nunca se movia.
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // tecnico_id vem da sessão (JWT), nunca do corpo da requisição — assim um
    // técnico não consegue escrever a localização de outro técnico.
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
