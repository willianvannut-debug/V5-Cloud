// ================================================================================
// API ORDENS DE SERVICO - MVP (usando operadores em vez de tecnicos)
// Caminho: app/api/ordens-servico/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

async function getSession(request: NextRequest) {
  const cookie = request.cookies.get('v5_session');
  if (cookie?.value) {
    try {
      const { payload } = await jwtVerify(cookie.value, JWT_SECRET);
      return {
        empresaId: payload.empresaId as string,
        operadorId: (payload.operadorId as string) || '',
        role: (payload.role as string) || 'gerente',
        nome: (payload.nome as string) || '',
      };
    } catch (e) {}
  }
  return null;
}

// Helper: buscar OS e juntar nome do tecnico manualmente (sem FK para tecnicos)
async function enriquecerOS(ordens: any[]) {
  if (!ordens || ordens.length === 0) return ordens;

  // Pegar IDs unicos dos tecnicos
  const tecIds = [...new Set(ordens.map(o => o.tecnico_id).filter(Boolean))];
  
  if (tecIds.length === 0) return ordens.map(o => ({ ...o, tecnico: null }));

  const { data: tecs } = await supabase
    .from('operadores')
    .select('id, nome')
    .in('id', tecIds);

  const tecMap = new Map((tecs || []).map(t => [t.id, t]));

  return ordens.map(o => ({
    ...o,
    tecnico: o.tecnico_id ? tecMap.get(o.tecnico_id) || null : null,
  }));
}

// GET - Listar OS ou buscar por ID
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const tipo = searchParams.get('tipo');
    const busca = searchParams.get('busca');

    if (id) {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, clientes(id, nome, cpf, telefone, logradouro, numero, bairro, cidade, uf)')
        .eq('id', id)
        .eq('empresa_id', session.empresaId)
        .single();

      if (error) return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });

      // Buscar tecnico
      let tecnico = null;
      if (data.tecnico_id) {
        const { data: tec } = await supabase.from('operadores').select('id, nome').eq('id', data.tecnico_id).single();
        tecnico = tec;
      }

      return NextResponse.json({ ...data, tecnico });
    }

    // Listar
    let query = supabase
      .from('ordens_servico')
      .select('*, clientes(id, nome, cpf, telefone, bairro, cidade)')
      .eq('empresa_id', session.empresaId)
      .order('created_at', { ascending: false })
      .limit(200);

    // Técnico só vê as OS atribuídas a ele
    if (session.role === 'tecnico' && session.operadorId) {
      query = query.eq('tecnico_id', session.operadorId);
    }

    if (status) query = query.eq('status', status);
    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Erro ao buscar OS' }, { status: 500 });

    let resultado = await enriquecerOS(data || []);

    if (busca) {
      const termo = busca.toLowerCase();
      resultado = resultado.filter((os: any) =>
        (os.numero && os.numero.toLowerCase().includes(termo)) ||
        (os.clientes?.nome && os.clientes.nome.toLowerCase().includes(termo)) ||
        (os.clientes?.cpf && os.clientes.cpf.includes(termo))
      );
    }

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar nova OS
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    if (!body.tipo) return NextResponse.json({ error: 'Tipo é obrigatório' }, { status: 400 });

    let endereco = body.endereco || '';
    if (body.cliente_id && !body.endereco) {
      const { data: cli } = await supabase
        .from('clientes')
        .select('logradouro, numero, bairro, cidade, uf')
        .eq('id', body.cliente_id)
        .single();
      if (cli) endereco = [cli.logradouro, cli.numero, cli.bairro, cli.cidade, cli.uf].filter(Boolean).join(', ');
    }

    let statusInicial = 'aberta';
    if (body.tecnico_id && body.agendada_para) statusInicial = 'agendada';

    const { data, error } = await supabase
      .from('ordens_servico')
      .insert({
        empresa_id: session.empresaId,
        tipo: body.tipo,
        cliente_id: body.cliente_id || null,
        endereco,
        descricao: body.descricao || null,
        prioridade: body.prioridade || 'media',
        status: statusInicial,
        tecnico_id: body.tecnico_id || null,
        agendada_para: body.agendada_para || null,
      })
      .select('*, clientes(id, nome, cpf, telefone, bairro, cidade)')
      .single();

    if (error) {
      console.error('Erro ao criar OS:', error);
      return NextResponse.json({ error: 'Erro ao criar OS' }, { status: 500 });
    }

    // Buscar tecnico
    let tecnico = null;
    if (data.tecnico_id) {
      const { data: tec } = await supabase.from('operadores').select('id, nome').eq('id', data.tecnico_id).single();
      tecnico = tec;
    }

    return NextResponse.json({ ...data, tecnico }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH - Atualizar OS
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const update: any = {};
    if (body.status !== undefined) update.status = body.status;
    if (body.tecnico_id !== undefined) update.tecnico_id = body.tecnico_id;
    if (body.agendada_para !== undefined) update.agendada_para = body.agendada_para;
    if (body.observacoes_tecnico !== undefined) update.observacoes_tecnico = body.observacoes_tecnico;
    if (body.motivo_cancelamento !== undefined) update.motivo_cancelamento = body.motivo_cancelamento;
    if (body.prioridade !== undefined) update.prioridade = body.prioridade;
    if (body.descricao !== undefined) update.descricao = body.descricao;

    if (body.status === 'em_deslocamento') update.deslocamento_em = new Date().toISOString();
    if (body.status === 'em_execucao') update.iniciada_em = new Date().toISOString();
    if (body.status === 'concluida') update.concluida_em = new Date().toISOString();
    if (body.tecnico_id && body.agendada_para && !body.status) update.status = 'agendada';

    const { data, error } = await supabase
      .from('ordens_servico')
      .update(update)
      .eq('id', body.id)
      .eq('empresa_id', session.empresaId)
      .select('*, clientes(id, nome, cpf, telefone, bairro, cidade)')
      .single();

    if (error) return NextResponse.json({ error: 'Erro ao atualizar OS' }, { status: 500 });

    let tecnico = null;
    if (data.tecnico_id) {
      const { data: tec } = await supabase.from('operadores').select('id, nome').eq('id', data.tecnico_id).single();
      tecnico = tec;
    }

    // Se concluiu OS e tem chamado vinculado, resolver o chamado + push
    if (body.status === 'concluida' && data.chamado_id) {
      // Resolver chamado
      await supabase
        .from('chamados')
        .update({ status: 'resolvido', resolvido_em: new Date().toISOString() })
        .eq('id', data.chamado_id)
        .eq('empresa_id', session.empresaId);

      // Buscar info do chamado pra push
      const { data: chamadoInfo } = await supabase
        .from('chamados')
        .select('cliente_id, protocolo')
        .eq('id', data.chamado_id)
        .single();

      if (chamadoInfo) {
        // Enviar push pro cliente
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('cliente_id', chamadoInfo.cliente_id)
          .eq('empresa_id', session.empresaId)
          .eq('ativo', true);

        if (tokens && tokens.length > 0) {
          const messages = tokens.map((t: any) => ({
            to: t.token,
            sound: 'default',
            title: 'Chamado resolvido!',
            body: `Seu chamado #${chamadoInfo.protocolo} foi resolvido pelo tecnico. Avalie o atendimento!`,
            data: { tipo: 'chamado_resolvido', chamado_id: data.chamado_id },
          }));
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(messages),
            });
          } catch (e) { console.error('Erro push:', e); }
        }
      }
    }

    // Se técnico saiu em deslocamento, enviar push pro cliente
    if (body.status === 'em_deslocamento' && data.cliente_id) {
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('cliente_id', data.cliente_id)
        .eq('empresa_id', session.empresaId)
        .eq('ativo', true);

      if (tokens && tokens.length > 0) {
        const messages = tokens.map((t: any) => ({
          to: t.token,
          sound: 'default',
          title: 'Tecnico a caminho!',
          body: 'Um tecnico esta indo ate voce. Acompanhe em tempo real no app!',
          data: { tipo: 'tecnico_a_caminho', os_id: data.id },
        }));
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
          });
        } catch (e) { console.error('Erro push:', e); }
      }
    }

    return NextResponse.json({ ...data, tecnico });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}