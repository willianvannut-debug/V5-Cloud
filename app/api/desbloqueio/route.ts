import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET - Carrega config + clientes bloqueados aguardando desbloqueio
export async function GET(req) {
  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id')
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Buscar config de desbloqueio
    const { data: config, error: configError } = await supabase
      .from('desbloqueio_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .single()

    // Se não tem config ainda, retorna valores padrão
    const configFinal = config || {
      id: '',
      empresa_id: empresaId,
      desbloqueio_automatico: false,
      verificar_pagamento: true,
      intervalo_verificacao: 30,
      notificar_desbloqueio: true,
      mensagem_desbloqueio: 'Sua conexão foi restabelecida. Obrigado por regularizar sua situação!',
      ativo: true,
    }

    // Por enquanto retorna lista vazia de clientes
    // Quando sincronizar com MikroTik, vai buscar os clientes bloqueados reais
    return NextResponse.json({
      success: true,
      config: configFinal,
      clientes: [],
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - Salvar configuração de desbloqueio
export async function POST(req) {
  try {
    const body = await req.json()
    const { empresa_id, desbloqueio_automatico, verificar_pagamento, intervalo_verificacao, notificar_desbloqueio, mensagem_desbloqueio, ativo } = body

    if (!empresa_id) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Verifica se já existe config para essa empresa
    const { data: existing } = await supabase
      .from('desbloqueio_config')
      .select('id')
      .eq('empresa_id', empresa_id)
      .single()

    let data, error

    if (existing) {
      // Atualiza
      const result = await supabase
        .from('desbloqueio_config')
        .update({
          desbloqueio_automatico: desbloqueio_automatico !== undefined ? desbloqueio_automatico : false,
          verificar_pagamento: verificar_pagamento !== undefined ? verificar_pagamento : true,
          intervalo_verificacao: intervalo_verificacao || 30,
          notificar_desbloqueio: notificar_desbloqueio !== undefined ? notificar_desbloqueio : true,
          mensagem_desbloqueio: mensagem_desbloqueio || '',
          ativo: ativo !== undefined ? ativo : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Cria novo
      const result = await supabase
        .from('desbloqueio_config')
        .insert({
          empresa_id,
          desbloqueio_automatico: desbloqueio_automatico !== undefined ? desbloqueio_automatico : false,
          verificar_pagamento: verificar_pagamento !== undefined ? verificar_pagamento : true,
          intervalo_verificacao: intervalo_verificacao || 30,
          notificar_desbloqueio: notificar_desbloqueio !== undefined ? notificar_desbloqueio : true,
          mensagem_desbloqueio: mensagem_desbloqueio || '',
          ativo: ativo !== undefined ? ativo : true,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}