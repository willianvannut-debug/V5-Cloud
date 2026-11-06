import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(req) {
  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id')
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('pppoe_plans')
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
    const { empresa_id, nome, velocidade_download, velocidade_upload, preco, mikrotik_profile, server_id, ativo, descricao } = body
    if (!empresa_id || !nome || !velocidade_download || !velocidade_upload) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios faltando' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('pppoe_plans')
      .insert({
        empresa_id, nome, velocidade_download, velocidade_upload,
        preco: preco || 0,
        mikrotik_profile: mikrotik_profile || nome.toLowerCase().replace(/\s+/g, '_'),
        server_id: server_id || null,
        ativo: ativo !== undefined ? ativo : true,
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
    const { id, nome, velocidade_download, velocidade_upload, preco, mikrotik_profile, server_id, ativo, descricao } = body
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('pppoe_plans')
      .update({
        nome, velocidade_download, velocidade_upload,
        preco: preco || 0,
        mikrotik_profile: mikrotik_profile || nome.toLowerCase().replace(/\s+/g, '_'),
        server_id: server_id || null,
        ativo: ativo !== undefined ? ativo : true,
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
      .from('pppoe_plans')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}