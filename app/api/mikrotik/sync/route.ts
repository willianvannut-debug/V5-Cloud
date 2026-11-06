// ================================================================================
// ROTA DE SINCRONIZACAO MIKROTIK → CLIENTES - V5 FIBRA
// app/api/mikrotik/sync/route.ts
//
// GET  = Preview: mostra quais clientes do MikroTik seriam importados
// POST = Executar: Sincroniza tudo (importa novos, remove órfãos e atualiza status online/offline)
// ================================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL || ''
const BRIDGE_API_KEY = process.env.MIKROTIK_BRIDGE_API_KEY || ''
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY || '')

// Validar autorizacao
async function validarAuth(request: NextRequest) {
  const cookieSessao = request.cookies.get('v5_session')
  if (cookieSessao?.value) {
    try {
      const { payload } = await jwtVerify(cookieSessao.value, JWT_SECRET)
      return {
        autorizado: true,
        empresaId: payload.empresaId as string,
        email: payload.email as string,
      }
    } catch (e) {
      console.error('Erro JWT sync:', e)
    }
  }
  return { autorizado: false, empresaId: '', email: '' }
}

// Buscar dados do MikroTik via bridge
async function buscarMikroTik(path: string, empresaId: string) {
  const url = `${BRIDGE_URL}/${path}?empresa_id=${empresaId}`
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BRIDGE_API_KEY,
      'Authorization': `Bearer ${BRIDGE_API_KEY}`,
    },
  })
  return res.json()
}

// ==========================================
// GET - Preview da sincronizacao
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const auth = await validarAuth(request)
    if (!auth.autorizado) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresa_id') || auth.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: 'empresa_id obrigatorio' }, { status: 400 })
    }

    if (!BRIDGE_URL || !BRIDGE_API_KEY) {
      return NextResponse.json(
        { error: 'MikroTik bridge nao configurado.' },
        { status: 500 }
      )
    }

    const [resSecrets, resActive, resProfiles] = await Promise.all([
      buscarMikroTik('pppoe/secrets', empresaId),
      buscarMikroTik('pppoe/active', empresaId),
      buscarMikroTik('pppoe/profiles', empresaId),
    ])

    if (!resSecrets.success || !Array.isArray(resSecrets.data)) {
      return NextResponse.json(
        { error: 'Erro ao buscar secrets do MikroTik', detalhes: resSecrets },
        { status: 500 }
      )
    }

    const ativosMap = new Map<string, any>()
    if (resActive.success && Array.isArray(resActive.data)) {
      resActive.data.forEach((a: any) => ativosMap.set(a.name, a))
    }

    const { data: clientesExistentes } = await supabase
      .from('clientes')
      .select('id, login_pppoe, nome')
      .eq('empresa_id', empresaId)
      .not('login_pppoe', 'eq', '')

    const loginsExistentes = new Set(
      (clientesExistentes || []).map((c: any) => c.login_pppoe?.toLowerCase())
    )

    const secrets = resSecrets.data.map((secret: any) => {
      const ativo = ativosMap.get(secret.name)
      const jaExiste = loginsExistentes.has(secret.name?.toLowerCase())

      const perfilBloqueado = (secret.profile || '').toLowerCase().trim() === 'bloqueado'
      let status: 'online' | 'offline' | 'bloqueado' = 'offline'
      if (perfilBloqueado) status = 'bloqueado'
      else if (ativo) status = 'online'

      return {
        id: secret.id,
        login: secret.name,
        profile: secret.profile || '-',
        ip: ativo?.address || secret['remote-address'] || '-',
        mac: ativo?.caller_id || '-',
        status,
        comment: secret.comment || '',
        jaExiste,
        clienteId: jaExiste
          ? (clientesExistentes || []).find((c: any) => c.login_pppoe?.toLowerCase() === secret.name?.toLowerCase())?.id
          : null,
      }
    })

    const perfis = resProfiles.success && Array.isArray(resProfiles.data)
      ? resProfiles.data.map((p: any) => ({ name: p.name, rateLimit: p['rate-limit'] || '' }))
      : []

    const novos = secrets.filter((s: any) => !s.jaExiste).length
    const existentes = secrets.filter((s: any) => s.jaExiste).length

    return NextResponse.json({
      success: true,
      total: secrets.length,
      novos,
      existentes,
      secrets,
      perfis,
    })
  } catch (error: any) {
    console.error('ERRO sync GET:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ==========================================
// POST - Executar sincronizacao completa
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const auth = await validarAuth(request)
    if (!auth.autorizado) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const empresaId = body.empresa_id || auth.empresaId

    if (!empresaId) {
      return NextResponse.json({ error: 'empresa_id obrigatorio' }, { status: 400 })
    }

    // Buscar dados atualizados do MikroTik
    const [resSecrets, resActive] = await Promise.all([
      buscarMikroTik('pppoe/secrets', empresaId),
      buscarMikroTik('pppoe/active', empresaId),
    ])

    if (!resSecrets.success || !Array.isArray(resSecrets.data)) {
      return NextResponse.json({ error: 'Erro ao buscar dados do MikroTik' }, { status: 500 })
    }

    // Mapear ativos e secrets válidos do MikroTik
    const ativosMap = new Map<string, any>()
    if (resActive.success && Array.isArray(resActive.data)) {
      resActive.data.forEach((a: any) => ativosMap.set(a.name?.toLowerCase(), a))
    }

    const secretsMkMap = new Map<string, any>()
    resSecrets.data.forEach((secret: any) => {
      if (secret.name) {
        secretsMkMap.set(secret.name.toLowerCase(), secret)
      }
    })

    // Buscar clientes cadastrados no Supabase que possuem login_pppoe preenchido
    const { data: clientesSupabase, error: fetchErr } = await supabase
      .from('clientes')
      .select('id, login_pppoe, nome, status')
      .eq('empresa_id', empresaId)
      .not('login_pppoe', 'is', null)

    if (fetchErr) throw fetchErr

    const resultados = {
      importados: 0,
      atualizados: 0,
      removidosOrfaos: 0,
      erros: 0,
      detalhes: [] as { login: string; status: 'ok' | 'erro'; mensagem: string }[],
    }

    const loginsSupabaseSet = new Set<string>()

    // 1. Processar clientes já existentes no Supabase (Atualizar status Online/Offline/Bloqueado)
    for (const cliente of clientesSupabase || []) {
      const loginLower = cliente.login_pppoe?.toLowerCase()?.trim()
      if (!loginLower) continue

      loginsSupabaseSet.add(loginLower)
      const secretMk = secretsMkMap.get(loginLower)

      // Se o cliente existe no Supabase mas NÃO existe mais no MikroTik (foi apagado lá)
      if (!secretMk) {
        // Se for um registro de teste órfão, podemos removê-lo ou inativá-lo
        const { error: delErr } = await supabase
          .from('clientes')
          .delete()
          .eq('id', cliente.id)

        if (!delErr) {
          resultados.removidosOrfaos++
        }
        continue
      }

      // Atualizar status em tempo real com base no MikroTik
      const estaAtivoNoMk = ativosMap.has(loginLower)
      const perfilBloqueado = (secretMk.profile || '').toLowerCase().trim() === 'bloqueado'

      let novoStatus = 'desconectado'
      if (perfilBloqueado) {
        novoStatus = 'bloqueado'
      } else if (estaAtivoNoMk) {
        novoStatus = 'ativo' // ou 'online' dependendo da sua regra de status
      }

      const { error: updErr } = await supabase
        .from('clientes')
        .update({
          status: novoStatus,
          perfil_radius: secretMk.profile || cliente.perfil_radius,
          ip_fixo: secretMk['remote-address'] || cliente.ip_fixo,
          mac_address: ativosMap.get(loginLower)?.caller_id || cliente.mac_address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cliente.id)

      if (!updErr) {
        resultados.atualizados++
      }
    }

    // 2. Importar novos secrets do MikroTik que ainda não estão no Supabase
    for (const [loginLower, secret] of secretsMkMap.entries()) {
      if (!loginsSupabaseSet.has(loginLower)) {
        try {
          const ativo = ativosMap.get(loginLower)
          const perfilBloqueado = (secret.profile || '').toLowerCase().trim() === 'bloqueado'
          let statusCliente = 'desconectado'
          if (perfilBloqueado) statusCliente = 'bloqueado'
          else if (ativo) statusCliente = 'ativo'

          const novoCliente = {
            empresa_id: empresaId,
            tipo_pessoa: 'PF',
            nome: secret.comment || secret.name,
            login_pppoe: secret.name,
            senha_pppoe: secret.password || '',
            perfil_radius: secret.profile || '',
            ip_fixo: secret['remote-address'] || '',
            mac_address: ativo?.caller_id || '',
            status: statusCliente,
            observacoes: `Importado do MikroTik em ${new Date().toLocaleDateString('pt-BR')}`,
            dia_vencimento: 10,
            forma_pagamento: 'boleto',
          }

          const { error: insertError } = await supabase
            .from('clientes')
            .insert([novoCliente])

          if (insertError) {
            resultados.erros++
            resultados.detalhes.push({ login: secret.name, status: 'erro', mensagem: insertError.message })
          } else {
            resultados.importados++
            resultados.detalhes.push({ login: secret.name, status: 'ok', mensagem: 'Importado com sucesso' })
          }
        } catch (err: any) {
          resultados.erros++
          resultados.detalhes.push({ login: secret.name, status: 'erro', mensagem: err.message })
        }
      }
    }

    // Registrar log da operação
    try {
      await supabase.from('logs_sistema').insert([{
        nivel: 'SUCCESS',
        acao: 'SYNC_MIKROTIK_COMPLETA',
        entidade: 'clientes',
        mensagem: `Sync: ${resultados.importados} novos, ${resultados.atualizados} atualizados, ${resultados.removidosOrfaos} órfãos removidos.`,
        operador_email: auth.email || 'sistema',
        detalhes: resultados,
        timestamp: new Date().toISOString(),
        criado_em: new Date().toISOString(),
      }])
    } catch (e) {
      console.error('Erro ao registrar log de sync:', e)
    }

    return NextResponse.json({
      success: true,
      mensagem: 'Sincronização realizada com sucesso!',
      ...resultados,
    })
  } catch (error: any) {
    console.error('ERRO sync POST:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ==========================================
// OPTIONS - CORS
// ==========================================
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}