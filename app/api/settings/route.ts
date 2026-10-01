// ================================================================================
// 🔒 ROTA DE CONFIGURAÇÕES - SUPABASE (SERVICE ROLE + ISOLAMENTO POR EMPRESA)
// app/api/settings/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Supabase (somente no servidor, chaves vindas do ambiente)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// ---------------------------------------------------------------------------
// JWT: o segredo vem SOMENTE do ambiente. Sem valor padrão no código.
// ---------------------------------------------------------------------------
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) {
    throw new Error('JWT_SECRET_KEY não está configurada nas variáveis de ambiente.');
  }
  return new TextEncoder().encode(secret);
}

type UsuarioLogado = {
  email: string;
  id: string;
  empresaId: string;
};

// Retorna o usuário da sessão ou null se não estiver logado / token inválido
async function getUsuarioLogado(): Promise<UsuarioLogado | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getJwtSecret());

    return {
      email: String(payload.email || ''),
      id: String(payload.sub || payload.id || payload.operador_id || ''),
      empresaId: String(payload.empresa_id || payload.empresaId || ''),
    };
  } catch {
    return null;
  }
}

const naoAutorizado = () =>
  Response.json({ success: false, error: 'Não autorizado' }, { status: 401 });

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

// ================================================================================
// GET
// ================================================================================
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioLogado();
    if (!usuario) return naoAutorizado();

    let settingsData: any = {};

    if (supabase) {
      let empresaQuery = supabase
        .from('empresas')
        .select('id, plano, nome_empresa, endereco, telefone, email, cep, lat, lon');

      if (usuario.empresaId) {
        empresaQuery = empresaQuery.eq('id', usuario.empresaId);
      } else {
        empresaQuery = empresaQuery.order('created_at', { ascending: false });
      }

      const { data: empresaData, error: empresaError } = await empresaQuery
        .limit(1)
        .maybeSingle();

      if (!empresaError && empresaData) {
        settingsData.id = empresaData.id;
        
        if (empresaData.plano) settingsData.planoAtivo = String(empresaData.plano).toLowerCase().trim();
        if (empresaData.nome_empresa) settingsData.nomeProvedor = empresaData.nome_empresa;
        if (empresaData.endereco && empresaData.endereco !== 'Não informado') settingsData.cidadeEmpresa = empresaData.endereco;
        if (empresaData.telefone) settingsData.telefone = empresaData.telefone;
        if (empresaData.email) settingsData.emailEmpresa = empresaData.email;
        if (empresaData.cep) settingsData.cep = empresaData.cep;
        if (empresaData.lat) settingsData.latEmpresa = empresaData.lat;
        if (empresaData.lon) settingsData.lonEmpresa = empresaData.lon;

        const { data: planosSupabase, error: planosError } = await supabase
          .from('planos')
          .select('id, nome, velocidade, preco')
          .eq('empresa_id', empresaData.id);

        if (planosError) {
          console.error('❌ Erro ao buscar planos:', planosError.message);
        } else if (planosSupabase) {
          settingsData.planos = planosSupabase;
        }

        const todasCtos: any[] = [];
        const tamanhoPagina = 1000;

        for (let inicio = 0; ; inicio += tamanhoPagina) {
          const { data: lote, error: ctosError } = await supabase
            .from('ctos')
            .select('*')
            .eq('provedor_id', empresaData.id)
            .order('id', { ascending: true })
            .range(inicio, inicio + tamanhoPagina - 1);

          if (ctosError) break;
          if (!lote || lote.length === 0) break;

          todasCtos.push(...lote);
          if (lote.length < tamanhoPagina) break;
        }

        if (todasCtos.length > 0) settingsData.ctos = todasCtos;
      }
    }

    return NextResponse.json(settingsData, { headers: NO_CACHE });
  } catch (error) {
    console.error('Erro na API GET /api/settings:', error);
    return NextResponse.json(null, { status: 500 });
  }
}

// ================================================================================
// POST
// ================================================================================
export async function POST(request: NextRequest) {
  try {
    const usuarioLogado = await getUsuarioLogado();
    if (!usuarioLogado) return naoAutorizado();

    const body = await request.json();

    const empresaIdAlvo: string | null = usuarioLogado.empresaId || null;
    const operadorEmail = usuarioLogado.email || 'desconhecido';
    const operadorId = usuarioLogado.id;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    if (supabase && !empresaIdAlvo) {
      return NextResponse.json(
        { success: false, error: 'Sessão sem empresa vinculada. Faça login novamente.' },
        { status: 403 }
      );
    }

    let dadosAntigos: any = { nome_empresa: '', endereco: '', telefone: '', email: '', cep: '', lat: null, lon: null };

    if (supabase && empresaIdAlvo) {
      const { data: empresaAntes } = await supabase
        .from('empresas')
        .select('nome_empresa, endereco, telefone, email, cep, lat, lon')
        .eq('id', empresaIdAlvo)
        .maybeSingle();

      if (empresaAntes) {
        dadosAntigos = empresaAntes;
      }

      // 🚀 ATUALIZAR DADOS NA TABELA EMPRESAS NO SUPABASE
      const { error: updateError } = await supabase
        .from('empresas')
        .update({
          nome_empresa: body.nomeProvedor || null,
          endereco: body.cidadeEmpresa || null,
          telefone: body.telefone || null,
          email: body.email || null,
          cep: body.cep || null,
          lat: body.latEmpresa || null,
          lon: body.lonEmpresa || null
        })
        .eq('id', empresaIdAlvo);

      if (updateError) {
        console.error('❌ Erro ao atualizar tabela empresas no Supabase:', updateError.message);
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 400 }
        );
      }

      if (body.planos && Array.isArray(body.planos)) {
        const planosParaInserir = body.planos.map((p: any) => ({
          empresa_id: empresaIdAlvo,
          nome: String(p.nome ?? '').trim(),
          velocidade: String(p.velocidade ?? '').trim(),
          preco: String(p.preco ?? '').trim(),
        }));

        const { error: deletePlanosError } = await supabase
          .from('planos')
          .delete()
          .eq('empresa_id', empresaIdAlvo);

        if (deletePlanosError) {
          return NextResponse.json(
            { success: false, error: 'Erro ao limpar planos antigos: ' + deletePlanosError.message },
            { status: 500 }
          );
        }

        if (planosParaInserir.length > 0) {
          const { error: insertPlanosError } = await supabase
            .from('planos')
            .insert(planosParaInserir);

          if (insertPlanosError) {
            return NextResponse.json(
              { success: false, error: 'Erro ao salvar planos: ' + insertPlanosError.message },
              { status: 500 }
            );
          }
        }
      }
    }

    const mudancas: string[] = [];
    if (String(dadosAntigos?.telefone || '') !== String(body.telefone || '')) mudancas.push('Telefone');
    if (String(dadosAntigos?.email || '') !== String(body.email || '')) mudancas.push('E-mail');
    if (String(dadosAntigos?.cep || '') !== String(body.cep || '')) mudancas.push('CEP');
    if (body.planos) mudancas.push('Planos');

    if (mudancas.length === 0) {
      return NextResponse.json({ success: true }, { headers: NO_CACHE });
    }

    const mensagemDetalhada = `Configurações alteradas por [${operadorEmail}] ➔ Atualizado: ${mudancas.join(', ')}`;

    await logger.info('ATUALIZAR_CONFIGURACOES', 'sistema', mensagemDetalhada, {
      empresaId: empresaIdAlvo,
      operadorId,
      operadorEmail,
      ip,
      auditoria: {
        responsavel: operadorEmail,
        operadorId,
        depois: {
          nome_empresa: body.nomeProvedor,
          endereco: body.cidadeEmpresa,
          telefone: body.telefone,
          email: body.email,
          cep: body.cep,
          lat: body.latEmpresa,
          lon: body.lonEmpresa
        }
      },
    });

    return NextResponse.json({ success: true }, { headers: NO_CACHE });
  } catch (error) {
    console.error('❌ Erro crítico na API POST /api/settings:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}