// ============================================================
// V5 FIBRA — Dashboard do Modulo MikroTik
// /dashboard/mikrotik — Visao geral com cards dos sub-modulos
// Estilo: dark neon V5 Cloud
// ============================================================
'use client'

import Link from 'next/link'
import {
  Server,
  Globe,
  Network,
  Shield,
  Activity,
  BarChart3,
  Ban,
  HardDrive,
  Radio,
  ArrowRight,
} from 'lucide-react'

const modules = [
  {
    title: 'Servidores',
    description: 'Gerencie seus roteadores MikroTik conectados',
    href: '/dashboard/mikrotik/servidores',
    icon: Server,
  },
  {
    title: 'Planos PPPoE',
    description: 'Perfis de velocidade e regras de banda',
    href: '/dashboard/mikrotik/planos',
    icon: Globe,
  },
  {
    title: 'Pools de IP',
    description: 'Faixas de endereco IP para distribuicao',
    href: '/dashboard/mikrotik/pools',
    icon: Network,
  },
  {
    title: 'RADIUS',
    description: 'Autenticacao centralizada FreeRADIUS',
    href: '/dashboard/mikrotik/radius',
    icon: Shield,
  },
  {
    title: 'Monitor Online',
    description: 'Conexoes ativas em tempo real',
    href: '/dashboard/mikrotik/monitor',
    icon: Activity,
  },
  {
    title: 'Consumo de Banda',
    description: 'Graficos de trafego e uso de rede',
    href: '/dashboard/mikrotik/consumo',
    icon: BarChart3,
  },
  {
    title: 'Bloqueio Automatico',
    description: 'Regras de corte por inadimplencia',
    href: '/dashboard/mikrotik/bloqueio',
    icon: Ban,
  },
  {
    title: 'Backup MikroTik',
    description: 'Backup automatico dos roteadores',
    href: '/dashboard/mikrotik/backup',
    icon: HardDrive,
  },
  {
    title: 'Integracao OLT',
    description: 'Gerencia de equipamentos GPON/ONU',
    href: '/dashboard/mikrotik/olt',
    icon: Radio,
  },
]

export default function MikrotikPage() {
  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-white font-sans relative">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
          <Server className="w-6 h-6 text-emerald-400" />
          Modulo MikroTik
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-2">
          Gerencie roteadores, planos, conexoes e automacoes
        </p>
      </div>

      {/* Grid de modulos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon
          return (
            <Link key={mod.href} href={mod.href}>
              <div className="group border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5 cursor-pointer transition-all hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wide">
                      {mod.title}
                    </h3>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
                </div>
                <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                  {mod.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}