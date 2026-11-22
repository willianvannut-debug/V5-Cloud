// app/api/seguranca/alertas/route.ts
// Monitoramento de eventos de segurança — erros 401/403, tentativas de login, IPs suspeitos
import { NextRequest, NextResponse } from 'next/server'
import { getEmpresaDaSessao } from '@/lib/auth-server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Ações que indicam tentativas de acesso indevido
const ACOES_SUSPEITAS = [
  'TENTATIVA_LOGIN_BLOQUEADA',
  'TENTATIVA_LOGIN_EMAIL_INVALIDO',
  'TENTATIVA_LOGIN_SENHA_INCORRETA',
  'ACESSO_NEGADO',
  'TOKEN_INVALIDO',
  'SESSAO_EXPIRADA',
]

export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (sessao.role !== 'superadmin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const empresaId = sessao.empresaId

  // Janela de análise: últimas 24 horas
  const agora = new Date()
  const h24atras = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const h1atras  = new Date(agora.getTime() -  1 * 60 * 60 * 1000).toISOString()

  try {
    // 1. Eventos suspeitos nas últimas 24h (para esta empresa)
    const { data: eventos24h } = await supabaseAdmin
      .from('logs_sistema')
      .select('acao, operador_email, detalhes, criado_em')
      .eq('empresa_id', empresaId)
      .in('acao', ACOES_SUSPEITAS)
      .gte('criado_em', h24atras)
      .order('criado_em', { ascending: false })
      .limit(200)

    // 2. Contagem na última hora (para alerta imediato)
    const { count: eventos1h } = await supabaseAdmin
      .from('logs_sistema')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .in('acao', ACOES_SUSPEITAS)
      .gte('criado_em', h1atras)

    // 3. Últimos 20 eventos de qualquer tipo (feed de atividade)
    const { data: feedRecente } = await supabaseAdmin
      .from('logs_sistema')
      .select('acao, nivel, operador_email, detalhes, criado_em')
      .eq('empresa_id', empresaId)
      .order('criado_em', { ascending: false })
      .limit(20)

    const lista = eventos24h || []

    // Agrupar tentativas por tipo
    const porTipo: Record<string, number> = {}
    for (const e of lista) {
      porTipo[e.acao] = (porTipo[e.acao] || 0) + 1
    }

    // Detectar IPs com muitas tentativas (se detalhes.ip existir)
    const ipContagem: Record<string, number> = {}
    for (const e of lista) {
      const ip = e.detalhes?.ip || e.detalhes?.ipOrigem
      if (ip && ip !== 'unknown') {
        ipContagem[ip] = (ipContagem[ip] || 0) + 1
      }
    }
    const ipsSuspeitos = Object.entries(ipContagem)
      .filter(([, count]) => count >= 5)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, tentativas]) => ({ ip, tentativas }))

    // Nível de alerta geral
    const totalEventos = lista.length
    let nivelAlerta: 'ok' | 'atencao' | 'critico' = 'ok'
    if (totalEventos >= 50 || (eventos1h || 0) >= 10) nivelAlerta = 'critico'
    else if (totalEventos >= 10 || (eventos1h || 0) >= 3) nivelAlerta = 'atencao'

    return NextResponse.json({
      nivelAlerta,
      resumo: {
        totalEventos24h: totalEventos,
        totalEventos1h: eventos1h || 0,
        ipsSuspeitosCount: ipsSuspeitos.length,
      },
      porTipo,
      ipsSuspeitos,
      eventoRecentes: lista.slice(0, 50),
      feedAtividade: feedRecente || [],
      geradoEm: agora.toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao consultar logs', detail: err.message }, { status: 500 })
  }
}
