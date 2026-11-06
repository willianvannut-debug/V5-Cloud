import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Calcula total de IPs a partir do range
function calcularTotalIPs(inicio, fim) {
  try {
    const partesInicio = inicio.split('.').map(Number)
    const partesFim = fim.split('.').map(Number)
    const numInicio = (partesInicio[0] << 24) + (partesInicio[1] << 16) + (partesInicio[2] << 8) + partesInicio[3]
    const numFim = (partesFim[0] << 24) + (partesFim[1] << 16) + (partesFim[2] << 8) + partesFim[3]
    return Math.abs(numFim - numInicio) + 1
  } catch {
    return 0
  }
}

export async function GET(req) {
  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id')
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('ip_pools')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { empresa_id, nome, range_inicio, range_fim, gateway, mascara, dns_primario, dns_secundario, server_id, mikrotik_pool_name, ativo, descricao } = body
    if (!empresa_id || !nome || !range_inicio || !range_fim) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios faltando' }, { status: 400 })
    }
    const total_ips = calcularTotalIPs(range_inicio, range_fim)
    const { data, error } = await supabase
      .from('ip_pools')
      .insert({
        empresa_id, nome, range_inicio, range_fim,
        gateway: gateway || '',
        mascara: mascara || '255.255.255.0',
        dns_primario: dns_primario || '8.8.8.8',
        dns_secundario: dns_secundario || '8.8.4.4',
        server_id: server_id || null,
        mikrotik_pool_name: mikrotik_pool_name || nome.toLowerCase().replace(/\s+/g, '_'),
        ativo: ativo !== undefined ? ativo : true,
        total_ips,
        ips_usados: 0,
        descricao: descricao || '',
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req) {
  try {
    const body = await req.json()
    const { id, nome, range_inicio, range_fim, gateway, mascara, dns_primario, dns_secundario, server_id, mikrotik_pool_name, ativo, descricao } = body
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 })
    }
    const total_ips = calcularTotalIPs(range_inicio, range_fim)
    const { data, error } = await supabase
      .from('ip_pools')
      .update({
        nome, range_inicio, range_fim,
        gateway: gateway || '',
        mascara: mascara || '255.255.255.0',
        dns_primario: dns_primario || '8.8.8.8',
        dns_secundario: dns_secundario || '8.8.4.4',
        server_id: server_id || null,
        mikrotik_pool_name: mikrotik_pool_name || nome.toLowerCase().replace(/\s+/g, '_'),
        ativo: ativo !== undefined ? ativo : true,
        total_ips,
        descricao: descricao || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 })
    }
    const { error } = await supabase
      .from('ip_pools')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}