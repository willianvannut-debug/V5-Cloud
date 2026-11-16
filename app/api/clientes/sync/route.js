import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// POST - Sincronizar clientes do MikroTik
export async function POST(req) {
  try {
    const body = await req.json()
    const { empresa_id, clientes } = body

    if (!empresa_id || !Array.isArray(clientes) || clientes.length === 0) {
      return NextResponse.json({ success: false, error: 'empresa_id e clientes obrigatórios' }, { status: 400 })
    }

    const { data: inseridos, error } = await supabase
      .from('clientes')
      .insert(clientes)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data: inseridos })
  } catch (error) {
    console.error('ERRO SYNC POST:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}