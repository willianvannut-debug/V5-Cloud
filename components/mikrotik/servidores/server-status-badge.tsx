// ============================================================
// V5 FIBRA — Badge de status do servidor MikroTik
// Estilo: dark neon V5 Cloud
// ============================================================
'use client'

import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'

interface ServerStatusBadgeProps {
  status: string
}

const statusConfig = {
  active: {
    label: 'ATIVO',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: Wifi,
  },
  online: {
    label: 'ATIVO',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: Wifi,
  },
  inactive: {
    label: 'INATIVO',
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    icon: WifiOff,
  },
  offline: {
    label: 'INATIVO',
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    icon: WifiOff,
  },
  unreachable: {
    label: 'INACESSIVEL',
    className: 'bg-red-500/10 text-red-400 border-red-500/30',
    icon: AlertTriangle,
  },
}

export function ServerStatusBadge({ status }: ServerStatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold font-mono border ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}