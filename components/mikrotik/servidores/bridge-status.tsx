// ============================================================
// V5 FIBRA — Indicador de status do MikroTik Bridge Service
// Estilo: dark neon V5 Cloud
// ============================================================
'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertTriangle } from 'lucide-react'

export function BridgeStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/mikrotik/bridge-health')
        const data = await res.json()
        setStatus(data.online ? 'online' : 'offline')
      } catch {
        setStatus('offline')
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [])

  if (status === 'checking') {
    return (
      <span className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 animate-pulse text-zinc-500" />
        Verificando Bridge...
      </span>
    )
  }

  if (status === 'offline') {
    return (
      <span className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 uppercase tracking-wider font-bold flex items-center gap-1.5" title="O servico MikroTik Bridge nao esta respondendo. Verifique se esta rodando no VPS.">
        <AlertTriangle className="w-3.5 h-3.5" />
        Bridge Offline
      </span>
    )
  }

  return (
    <span className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
      <Activity className="w-3.5 h-3.5" />
      Bridge Online
    </span>
  )
}