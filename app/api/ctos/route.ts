//app/api/ctos/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

async function getUsuarioLogado() {
  const cookieStore = await cookies();
  const token = cookieStore.get('v5_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      email: payload.email,
      id: payload.sub || payload.id || payload.operador_id,
      empresaId: payload.empresa_id || payload.empresaId
    };
  } catch (e) {
    return null;
  }
}

// 🟡 PUT: SINCRONIZAÇÃO EM LOTE (Criar, Atualizar e Deletar de uma vez - com lotes seguros)
export async function PUT(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const usuario = await getUsuarioLogado();

  if (!usuario || !usuario.empresaId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { novas = [], atualizadas = [], removidas = [] } = body;

    // 1. Processar Exclusões em lotes seguros para evitar erro de limite
    if (removidas.length > 0) {
      const tamanhoLoteDel = 500;
      for (let i = 0; i < removidas.length; i += tamanhoLoteDel) {
        const loteDel = removidas.slice(i, i + tamanhoLoteDel);
        const { error: erroDelete } = await supabaseAdmin
          .from('ctos')
          .delete()
          .in('id', loteDel)
          .eq('provedor_id', usuario.empresaId);

        if (erroDelete) {
          console.error("Erro ao deletar no Supabase:", erroDelete.message);
          return NextResponse.json({ sucesso: false, erro: 'Erro ao apagar no banco: ' + erroDelete.message }, { status: 400 });
        }
      }
    }

    // 2. Processar Criações em lotes seguros (para passar de 1000 registos sem cortes)
    if (novas.length > 0) {
      const caixasParaInserir = novas.map((c: any) => ({
        identificacao: c.identificacao,
        endereco: c.endereco,
        raio: c.raio,
        lat: c.lat,
        lon: c.lon,
        provedor_id: usuario.empresaId
      }));

      const tamanhoLoteIns = 500;
      for (let i = 0; i < caixasParaInserir.length; i += tamanhoLoteIns) {
        const loteIns = caixasParaInserir.slice(i, i + tamanhoLoteIns);
        const { error: erroInsert } = await supabaseAdmin.from('ctos').insert(loteIns);
        if (erroInsert) throw erroInsert;
      }
    }

    // 3. Processar Atualizações em lotes seguros
    if (atualizadas.length > 0) {
      const tamanhoLoteUpd = 500;
      for (let i = 0; i < atualizadas.length; i += tamanhoLoteUpd) {
        const loteUpd = atualizadas.slice(i, i + tamanhoLoteUpd);
        for (const cto of loteUpd) {
          const { error: erroUpdate } = await supabaseAdmin.from('ctos').update({
            identificacao: cto.identificacao,
            endereco: cto.endereco,
            raio: cto.raio,
            lat: cto.lat,
            lon: cto.lon
          }).eq('id', cto.id).eq('provedor_id', usuario.empresaId);
          if (erroUpdate) throw erroUpdate;
        }
      }
    }

    const totalDeAcoes = novas.length + atualizadas.length + removidas.length;

    if (totalDeAcoes > 0) {
      await logger.cto(
        'ATUALIZACAO_LOTE_CTO',
        `Sincronização: ${novas.length} criadas, ${atualizadas.length} atualizadas, ${removidas.length} removidas.`,
        usuario.email as string,
        'lote',
        { ip, empresaId: usuario.empresaId, operadorId: usuario.id, totais: { novas: novas.length, atualizadas: atualizadas.length, removidas: removidas.length } }
      );
    }

    return NextResponse.json({ sucesso: true, mensagem: 'Sincronização de lote concluída com sucesso' });
  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json({ sucesso: false, erro: 'Erro interno ao processar lote: ' + (error.message || error) }, { status: 500 });
  }
}

// 🔵 GET: LISTAR CTOS (Com paginação automática para buscar mais de 1000 registos)
export async function GET(request: NextRequest) {
  const usuario = await getUsuarioLogado();

  if (!usuario || !usuario.empresaId) return NextResponse.json({ sucesso: false, erro: 'Não autorizado' }, { status: 401 });

  try {
    let todasAsCaixas: any[] = [];
    let rangeInicio = 0;
    const tamanhoPagina = 1000;
    let buscarMais = true;

    while (buscarMais) {
      const { data: ctos, error } = await supabaseAdmin
        .from('ctos')
        .select('*')
        .eq('provedor_id', usuario.empresaId)
        .range(rangeInicio, rangeInicio + tamanhoPagina - 1);

      if (error) throw error;

      if (ctos && ctos.length > 0) {
        todasAsCaixas = [...todasAsCaixas, ...ctos];
        rangeInicio += tamanhoPagina;
        if (ctos.length < tamanhoPagina) {
          buscarMais = false;
        }
      } else {
        buscarMais = false;
      }
    }

    return NextResponse.json({ sucesso: true, ctos: todasAsCaixas });
  } catch (error: any) {
    return NextResponse.json({ sucesso: false, erro: 'Erro interno ao buscar CTOs' }, { status: 500 });
  }
}