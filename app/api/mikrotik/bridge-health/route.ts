// app/api/mikrotik/bridge-health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // DEBUG - vamos ver quais env vars existem
  const envKeys = Object.keys(process.env).filter(k => 
    k.includes('MIKROTIK') || k.includes('BRIDGE')
  )
  
  console.log('ENV KEYS COM MIKROTIK/BRIDGE:', envKeys)
  console.log('MIKROTIK_BRIDGE_URL:', process.env.MIKROTIK_BRIDGE_URL)
  
  const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL

  if (!BRIDGE_URL) {
    return NextResponse.json({ 
      online: false, 
      error: 'BRIDGE_URL nao configurada',
      debug_keys: envKeys 
    })
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
    return NextResponse.json({ online: false, error: 'Bridge nao respondeu' })
  }
}