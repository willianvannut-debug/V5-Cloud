// ============================================================
// app/api/backup/route.js
// V5 FIBRA — API Backup
// ATUALIZADO: Aceita nome_arquivo, tamanho, status, erro_msg
// do frontend (que já cria backup real no MikroTik via mk-proxy)
// ============================================================
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET - Lista backups + config
export async function GET(req) {
  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id')
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Buscar backups
    const { data: backups, error: backupsError } = await supabase
      .from('backup_items')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (backupsError) throw backupsError

    // Buscar config
    const { data: config } = await supabase
      .from('backup_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .single()

    const configFinal = config || {
      backup_automatico: false,
      intervalo_horas: 24,
      manter_ultimos: 10,
      tipo_padrao: 'backup',
      horario_preferido: '03:00',
    }

    return NextResponse.json({ success: true, data: backups || [], config: configFinal })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - Salvar config OU criar registro de backup
export async function POST(req) {
  try {
    const body = await req.json()

    // Se tem server_id e tipo, é criação de registro de backup
    if (body.server_id && body.tipo) {
      return await criarRegistroBackup(body)
    }

    // Senão, é salvar config
    return await salvarConfig(body)
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE - Deletar backup
export async function DELETE(req) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 })
    }
    const { error } = await supabase
      .from('backup_items')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// ============================================================
// FUNCOES INTERNAS
// ============================================================

async function criarRegistroBackup(body) {
  const { server_id, tipo, empresa_id, nome_arquivo, tamanho, status, erro_msg } = body
  if (!empresa_id || !server_id) {
    return NextResponse.json({ success: false, error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  // Buscar nome do servidor
  const { data: servidor } = await supabase
    .from('mikrotik_servers')
    .select('name')
    .eq('id', server_id)
    .single()

  const serverName = servidor?.name || 'Desconhecido'

  // Usar nome_arquivo e tamanho do frontend (que já criou o backup no MikroTik)
  // Se não vier, gera um nome padrão
  let nomeArquivoFinal = nome_arquivo
  if (!nomeArquivoFinal) {
    const agora = new Date()
    const dataStr = agora.toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const extensao = tipo === 'export' ? '.rsc' : '.backup'
    nomeArquivoFinal = `${serverName.replace(/\s+/g, '_')}_${dataStr}${extensao}`
  }

  const { data, error } = await supabase
    .from('backup_items')
    .insert({
      empresa_id,
      server_id,
      server_name: serverName,
      nome_arquivo: nomeArquivoFinal,
      tipo,
      tamanho: tamanho || 0,
      status: status || 'concluido',
      erro_msg: erro_msg || null,
    })
    .select()
    .single()

  if (error) throw error
  return NextResponse.json({ success: true, data })
}

async function salvarConfig(body) {
  const { empresa_id, backup_automatico, intervalo_horas, manter_ultimos, tipo_padrao, horario_preferido } = body
  if (!empresa_id) {
    return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
  }

  // Verifica se já existe config
  const { data: existing } = await supabase
    .from('backup_config')
    .select('id')
    .eq('empresa_id', empresa_id)
    .single()

  let data, error

  if (existing) {
    const result = await supabase
      .from('backup_config')
      .update({
        backup_automatico: backup_automatico !== undefined ? backup_automatico : false,
        intervalo_horas: intervalo_horas || 24,
        manter_ultimos: manter_ultimos || 10,
        tipo_padrao: tipo_padrao || 'backup',
        horario_preferido: horario_preferido || '03:00',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from('backup_config')
      .insert({
        empresa_id,
        backup_automatico: backup_automatico !== undefined ? backup_automatico : false,
        intervalo_horas: intervalo_horas || 24,
        manter_ultimos: manter_ultimos || 10,
        tipo_padrao: tipo_padrao || 'backup',
        horario_preferido: horario_preferido || '03:00',
      })
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) throw error
  return NextResponse.json({ success: true, data })
}