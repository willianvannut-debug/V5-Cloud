// ============================================================
// app/api/webhook/mikrotik/route.js
// V5 FIBRA — Webhook que recebe dados do script MikroTik
// O script roda no scheduler do MikroTik do cliente
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// POST - Receber dados do MikroTik
export async function POST(req) {
  try {
    const body = await req.json()
    const { server_id, token, identity, version, uptime, cpu_load, memory_free, memory_total, pppoe_active, pppoe_count } = body

    if (!server_id || !token) {
      return NextResponse.json({ success: false, error: 'server_id e token obrigatorios' }, { status: 400 })
    }

    // Verificar se o servidor existe e o token bate
    const { data: server, error: serverError } = await supabase
      .from('mikrotik_servers')
      .select('id, empresa_id, name, integration_token')
      .eq('id', server_id)
      .single()

    if (serverError || !server) {
      return NextResponse.json({ success: false, error: 'Servidor nao encontrado' }, { status: 404 })
    }

    if (server.integration_token !== token) {
      return NextResponse.json({ success: false, error: 'Token invalido' }, { status: 401 })
    }

    // Atualizar informacoes do servidor
    const updateData = {
      status: 'online',
      last_sync_at: new Date().toISOString(),
    }
    if (identity) updateData.identity = identity
    if (version) updateData.version = version
    if (uptime) updateData.uptime = uptime
    if (cpu_load) updateData.cpu_load = cpu_load
    if (memory_free) updateData.memory_free = memory_free
    if (memory_total) updateData.memory_total = memory_total

    await supabase
      .from('mikrotik_servers')
      .update(updateData)
      .eq('id', server_id)

    // Se enviou dados de PPPoE ativos, salvar no cache
    if (pppoe_active && Array.isArray(pppoe_active)) {
      await supabase
        .from('mikrotik_cache')
        .upsert({
          server_id: server_id,
          empresa_id: server.empresa_id,
          cache_type: 'pppoe_active',
          data: pppoe_active,
          pppoe_count: pppoe_count || pppoe_active.length,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'server_id,cache_type' })
    }

    return NextResponse.json({
      success: true,
      message: 'Dados recebidos com sucesso',
      server_name: server.name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('WEBHOOK MIKROTIK ERROR:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// GET - Health check do webhook
export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'V5 Fibra - MikroTik Webhook',
    timestamp: new Date().toISOString(),
  })
}