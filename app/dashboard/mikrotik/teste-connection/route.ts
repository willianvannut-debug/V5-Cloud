// app/api/mikrotik/test-connection/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL
  const BRIDGE_API_KEY = process.env.MIKROTIK_BRIDGE_API_KEY

  if (!BRIDGE_URL) {
    return NextResponse.json({ success: false, error: 'Bridge nao configurada' })
  }

  try {
    const body = await req.json()

    const res = await fetch(`${BRIDGE_URL}/servers/test-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BRIDGE_API_KEY || '',
      },
      body: JSON.stringify({
        host: body.host,
        port: body.port,
        user: body.user,
        password: body.password,
        ssl: body.ssl,
      }),
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ success: false, error: 'Erro ao conectar com a Bridge' })
  }
}