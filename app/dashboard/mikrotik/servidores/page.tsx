// ============================================================
// V5 FIBRA — Pagina de Servidores MikroTik
// /dashboard/mikrotik/servidores
// Estilo: dark neon V5 Cloud
// ============================================================
'use client'

import { Server } from 'lucide-react'
import { ServersTable } from '@/components/mikrotik/servidores'
import { BridgeStatus } from '@/components/mikrotik/servidores'

export default function ServidoresPage() {
  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-white font-sans relative">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-emerald-400" />
            Servidores MikroTik
          </h1>
        </div>

        <BridgeStatus />
      </div>

      {/* Descricao */}
      <p className="text-xs font-mono text-zinc-500">
        Gerencie seus roteadores e concentradores PPPoE conectados ao sistema.
      </p>

      {/* Tabela de servidores */}
      <ServersTable />
    </div>
  )
}