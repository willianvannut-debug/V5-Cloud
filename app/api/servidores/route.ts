import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Lista servidores MikroTik da empresa
export async function GET(req: Request) {
  try {
    const sessao = await getEmpresaDaSessao(req)
    if (!sessao) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('mikrotik_servers')
      .select('id, name, status, ip_address, identity, version, model')
      .eq('empresa_id', sessao.empresaId)
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}