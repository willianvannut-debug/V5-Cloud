// app/api/mikrotik/bridge-health/route.ts
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getEmpresaDaSessao } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  // Exige autenticação — evita que externos descubram se o Bridge está online
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) return NextResponse.json({ online: false, error: 'Não autenticado' }, { status: 401 })

  const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL

  if (!BRIDGE_URL) {
    // Nunca expor nomes de variáveis de ambiente na resposta
    return NextResponse.json({ online: false, error: 'Bridge não configurada' })
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({ online: true, ...data })
    }
    return NextResponse.json({ online: false, error: `Status ${res.status}` })
  } catch {
    return NextResponse.json({ online: false, error: 'Bridge não respondeu' })
  }
}
