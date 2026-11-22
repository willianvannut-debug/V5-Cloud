// ============================================================
// app/api/mk-proxy/route.ts
// V5 FIBRA — Proxy para Bridge Service (sem catch-all)
// Usa ?path=test-connection&empresa_id=xxx
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'

const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL || 'http://163.176.39.250:3001'
const BRIDGE_API_KEY = process.env.MIKROTIK_BRIDGE_API_KEY || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Buscar credenciais do servidor MikroTik por ID
async function getServerConfig(serverId: string) {
  if (!serverId) return null
  const { data } = await supabase
    .from('mikrotik_servers')
    .select('ip_address, api_user, api_password')
    .eq('id', serverId)
    .single()
  return data
}

// Buscar o primeiro servidor da empresa (fallback)
async function getDefaultServer(empresaId: string) {
  if (!empresaId) return null
  const { data } = await supabase
    .from('mikrotik_servers')
    .select('id, ip_address, api_user, api_password')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  return data
}

// Montar headers com credenciais do MikroTik
async function buildHeaders(serverId: string, empresaId: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': BRIDGE_API_KEY,
  }

  let serverConfig = null
  if (serverId) {
    serverConfig = await getServerConfig(serverId)
  } else if (empresaId) {
    serverConfig = await getDefaultServer(empresaId)
  }

  if (serverConfig) {
    headers['x-mk-host'] = serverConfig.ip_address || ''
    headers['x-mk-port'] = '8728'
    headers['x-mk-user'] = serverConfig.api_user || ''
    headers['x-mk-password'] = serverConfig.api_password || ''
  }

  return headers
}

export async function GET(req: NextRequest) {
  // Verificar autenticação — rota sensível (acessa roteador MikroTik)
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const bridgePath = req.nextUrl.searchParams.get('path') || ''
    const serverId = req.nextUrl.searchParams.get('server_id') || ''
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || ''

    if (!bridgePath) {
      return NextResponse.json({ success: false, error: 'Parametro path obrigatorio' }, { status: 400 })
    }

    // Montar query string sem path/server_id/empresa_id (eles ja foram extraidos)
    const params = new URLSearchParams()
    for (const [key, value] of req.nextUrl.searchParams.entries()) {
      if (key !== 'path' && key !== 'server_id' && key !== 'empresa_id') {
        params.set(key, value)
      }
    }
    const queryString = params.toString()
    const url = `${BRIDGE_URL}/${bridgePath}${queryString ? '?' + queryString : ''}`

    const headers = await buildHeaders(serverId, empresaId)

    const response = await fetch(url, { method: 'GET', headers })
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao conectar com Bridge: ' + error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  // Verificar autenticação — rota sensível (acessa roteador MikroTik)
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const bridgePath = req.nextUrl.searchParams.get('path') || ''
    const serverId = req.nextUrl.searchParams.get('server_id') || ''
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || ''

    if (!bridgePath) {
      return NextResponse.json({ success: false, error: 'Parametro path obrigatorio' }, { status: 400 })
    }

    let bodyData: any = null
    try {
      bodyData = await req.json()
    } catch (e) {
      // body vazio, ok
    }

    // Usar server_id/empresa_id do body como fallback
    const finalServerId = serverId || bodyData?.server_id || ''
    const finalEmpresaId = empresaId || bodyData?.empresa_id || ''

    const url = `${BRIDGE_URL}/${bridgePath}`
    const headers = await buildHeaders(finalServerId, finalEmpresaId)

    // Rotas de escrita do Bridge (pppoe/secrets/add, /set, /remove, etc)
    // exigem host/user/password tambem no corpo, alem dos headers x-mk-*.
    // Sem isso o Bridge recusa com 400 "host, user, password ... obrigatorios"
    // mesmo com os headers corretos -- confirmado testando direto contra o
    // Bridge real. O spread de bodyData por ultimo deixa um valor explicito
    // enviado pelo chamador sobrescrever o resolvido aqui, se precisar.
    let serverConfig: { ip_address?: string; api_user?: string; api_password?: string } | null = null
    if (finalServerId) {
      serverConfig = await getServerConfig(finalServerId)
    } else if (finalEmpresaId) {
      serverConfig = await getDefaultServer(finalEmpresaId)
    }

    const bodyComCredenciais = bodyData
      ? {
          host: serverConfig?.ip_address || undefined,
          user: serverConfig?.api_user || undefined,
          password: serverConfig?.api_password || undefined,
          ...bodyData,
        }
      : bodyData

    const fetchOptions: any = {
      method: 'POST',
      headers,
    }

    if (bodyComCredenciais) {
      fetchOptions.body = JSON.stringify(bodyComCredenciais)
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Erro ao conectar com Bridge: ' + error.message },
      { status: 500 }
    )
  }
}