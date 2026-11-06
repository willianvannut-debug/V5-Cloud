// ============================================================
// app/dashboard/mikrotik/monitor/page.tsx
// V5 FIBRA — Monitor de Clientes MikroTik v3
// FIX: Conta TODOS os ativos corretamente (incluindo duplicados
// e conexoes sem secret correspondente)
// Detecta bloqueio por PERFIL (BLOQUEADO/Bloqueado)
// Dropdown de perfis REAIS do MikroTik para liberar cliente
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Wifi, WifiOff, Search, Loader2, RefreshCw, Users, ShieldBan, Signal, Clock, Monitor, Lock, Unlock, ChevronDown, X } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// TIPOS
// ============================================================
interface PPPoESecret {
  id: string
  name: string
  password?: string
  service: string
  profile: string
  'remote-address'?: string
  'caller-id'?: string
  disabled?: string | boolean
  comment?: string
}

interface PPPoEActive {
  id: string
  name: string
  service: string
  caller_id: string
  address: string
  uptime: string
  limit_bytes_in?: string
  limit_bytes_out?: string
  encoding?: string
}

interface MkProfile {
  id: string
  name: string
  'rate-limit'?: string
  comment?: string
}

interface ClienteCompleto {
  id: string
  login: string
  profile: string
  ip: string
  mac: string
  status: 'online' | 'offline' | 'bloqueado'
  uptime: string
  comment: string
  disabled: boolean
  bytesIn?: string
  bytesOut?: string
}

// ============================================================
// HELPERS
// ============================================================
function formatBytes(bytes: string | number): string {
  const b = typeof bytes === 'string' ? parseInt(bytes) : bytes
  if (!b || b === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatUptime(uptime: string): string {
  if (!uptime) return '-'
  return uptime
    .replace(/w/g, 'sem ')
    .replace(/d/g, 'd ')
    .replace(/h/g, 'h ')
    .replace(/m/g, 'm ')
    .replace(/s/g, 's')
    .trim()
}

// Perfis que indicam bloqueio (case-insensitive)
function isPerfilBloqueado(profile: string): boolean {
  const p = (profile || '').toLowerCase().trim()
  return p === 'bloqueado'
}

// Perfis que NAO devem aparecer no dropdown de liberar
function isPerfilSistema(name: string): boolean {
  const n = (name || '').toLowerCase().trim()
  return n === 'default' || n === 'default-encryption'
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function MonitorMikroTikPage() {
  const { operador } = useAuth()
  const [clientes, setClientes] = useState<ClienteCompleto[]>([])
  const [perfis, setPerfis] = useState<MkProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'online' | 'offline' | 'bloqueado'>('todos')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)

  // Modal de liberar (dropdown de perfis)
  const [modalLiberar, setModalLiberar] = useState<ClienteCompleto | null>(null)
  const [perfilSelecionado, setPerfilSelecionado] = useState('')
  const [processando, setProcessando] = useState<string | null>(null)

  // ============================================================
  // CARREGAR TODOS OS DADOS DO MIKROTIK
  // ============================================================
  const carregarDados = useCallback(async () => {
    if (!operador?.empresaId) return

    try {
      // Buscar tudo em paralelo: secrets, ativos e perfis
      const [resSecrets, resActive, resProfiles] = await Promise.all([
        fetch(`/api/mk-proxy?path=pppoe/secrets&empresa_id=${operador.empresaId}`),
        fetch(`/api/mk-proxy?path=pppoe/active&empresa_id=${operador.empresaId}`),
        fetch(`/api/mk-proxy?path=pppoe/profiles&empresa_id=${operador.empresaId}`),
      ])

      const [dataSecrets, dataActive, dataProfiles] = await Promise.all([
        resSecrets.json(),
        resActive.json(),
        resProfiles.json(),
      ])

      // Salvar perfis (para o dropdown)
      if (dataProfiles.success && Array.isArray(dataProfiles.data)) {
        setPerfis(dataProfiles.data)
      }

      // Lista de TODAS as conexoes ativas (sem deduplicar)
      const listaAtivos: PPPoEActive[] = []
      if (dataActive.success && Array.isArray(dataActive.data)) {
        dataActive.data.forEach((a: PPPoEActive) => {
          listaAtivos.push(a)
        })
      }

      // Guardar total real de ativos (igual ao MikroTik)
      setTotalAtivos(listaAtivos.length)

      // Mapa de ativos por nome (para cruzar com secrets)
      // Guarda ARRAY de conexoes por nome (pode ter duplicada)
      const activosMap = new Map<string, PPPoEActive[]>()
      listaAtivos.forEach((a) => {
        const lista = activosMap.get(a.name) || []
        lista.push(a)
        activosMap.set(a.name, lista)
      })

      // Set de nomes de secrets (para saber quem tem secret)
      const secretNomes = new Set<string>()

      // Montar lista completa a partir dos secrets
      const listaCompleta: ClienteCompleto[] = []

      if (dataSecrets.success && Array.isArray(dataSecrets.data)) {
        dataSecrets.data.forEach((secret: PPPoESecret) => {
          secretNomes.add(secret.name)
          const ativosList = activosMap.get(secret.name) || []
          const ativo = ativosList[0] // Pegar a primeira conexao ativa

          // Detectar status:
          // 1. Se o perfil é "BLOQUEADO" ou "Bloqueado" → BLOQUEADO
          // 2. Se tem conexão ativa → ONLINE
          // 3. Senão → OFFLINE
          let status: 'online' | 'offline' | 'bloqueado' = 'offline'
          if (isPerfilBloqueado(secret.profile)) {
            status = 'bloqueado'
          } else if (ativo) {
            status = 'online'
          }

          listaCompleta.push({
            id: secret.id,
            login: secret.name,
            profile: secret.profile || '-',
            ip: ativo?.address || secret['remote-address'] || '-',
            mac: ativo?.caller_id || '-',
            status,
            uptime: ativo?.uptime || '',
            comment: secret.comment || '',
            disabled: secret.disabled === 'true' || secret.disabled === true,
            bytesIn: ativo?.limit_bytes_in,
            bytesOut: ativo?.limit_bytes_out,
          })
        })
      }

      // Adicionar conexoes ativas que NAO tem secret correspondente
      // (aparecem no Active Connections mas nao no Secrets)
      activosMap.forEach((ativosList, nome) => {
        if (!secretNomes.has(nome)) {
          // Esse cliente esta conectado mas nao tem secret
          const ativo = ativosList[0]
          listaCompleta.push({
            id: ativo.id || `active-${nome}`,
            login: nome,
            profile: '(sem secret)',
            ip: ativo.address || '-',
            mac: ativo.caller_id || '-',
            status: 'online',
            uptime: ativo.uptime || '',
            comment: 'Conexao ativa sem secret cadastrado',
            disabled: false,
            bytesIn: ativo.limit_bytes_in,
            bytesOut: ativo.limit_bytes_out,
          })
        }
      })

      // Ordenar: online primeiro, bloqueados, offline por ultimo
      listaCompleta.sort((a, b) => {
        const ordem = { online: 0, bloqueado: 1, offline: 2 }
        return ordem[a.status] - ordem[b.status]
      })

      setClientes(listaCompleta)
      setUltimaAtualizacao(new Date())
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar dados do MikroTik')
    } finally {
      setLoading(false)
    }
  }, [operador?.empresaId])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(carregarDados, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, carregarDados])

  // ============================================================
  // BLOQUEAR CLIENTE (trocar perfil para BLOQUEADO)
  // ============================================================
  const bloquearCliente = async (cliente: ClienteCompleto) => {
    if (!confirm(`Bloquear ${cliente.login}?\n\nO perfil sera alterado para BLOQUEADO e o cliente sera desconectado.`)) return

    setProcessando(cliente.login)
    try {
      const res = await fetch(
        `/api/mk-proxy?path=pppoe/secret/set-profile&empresa_id=${operador?.empresaId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret_name: cliente.login,
            profile: 'BLOQUEADO',
          }),
        }
      )
      const data = await res.json()

      if (data.success) {
        toast.success(`${cliente.login} bloqueado! Perfil alterado para BLOQUEADO`)
        carregarDados()
      } else {
        toast.error(data.error || 'Erro ao bloquear')
      }
    } catch {
      toast.error('Erro ao bloquear cliente')
    } finally {
      setProcessando(null)
    }
  }

  // ============================================================
  // LIBERAR CLIENTE (trocar perfil de BLOQUEADO para o escolhido)
  // ============================================================
  const abrirModalLiberar = (cliente: ClienteCompleto) => {
    setModalLiberar(cliente)
    setPerfilSelecionado('')
  }

  const liberarCliente = async () => {
    if (!modalLiberar || !perfilSelecionado) {
      toast.error('Selecione um perfil para liberar o cliente')
      return
    }

    setProcessando(modalLiberar.login)
    try {
      const res = await fetch(
        `/api/mk-proxy?path=pppoe/secret/set-profile&empresa_id=${operador?.empresaId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret_name: modalLiberar.login,
            profile: perfilSelecionado,
          }),
        }
      )
      const data = await res.json()

      if (data.success) {
        toast.success(`${modalLiberar.login} liberado! Perfil alterado para ${perfilSelecionado}`)
        setModalLiberar(null)
        setPerfilSelecionado('')
        carregarDados()
      } else {
        toast.error(data.error || 'Erro ao liberar')
      }
    } catch {
      toast.error('Erro ao liberar cliente')
    } finally {
      setProcessando(null)
    }
  }

  // ============================================================
  // FILTROS
  // ============================================================
  const clientesFiltrados = clientes.filter(c => {
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false
    if (busca) {
      const termo = busca.toLowerCase()
      return (
        c.login.toLowerCase().includes(termo) ||
        c.ip.toLowerCase().includes(termo) ||
        c.mac.toLowerCase().includes(termo) ||
        c.profile.toLowerCase().includes(termo) ||
        c.comment.toLowerCase().includes(termo)
      )
    }
    return true
  })

  const totalOnline = clientes.filter(c => c.status === 'online').length
  const totalOffline = clientes.filter(c => c.status === 'offline').length
  const totalBloqueados = clientes.filter(c => c.status === 'bloqueado').length

  // Perfis disponiveis para liberar (excluindo BLOQUEADO e perfis de sistema)
  const perfisParaLiberar = perfis.filter(p =>
    !isPerfilBloqueado(p.name) && !isPerfilSistema(p.name)
  )

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-7 h-7 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-mono font-black tracking-wider text-white uppercase">
              Monitor de Clientes
            </h1>
            <p className="text-sm text-zinc-500 font-mono">
              Todos os clientes PPPoE — online, offline e bloqueados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer border ${
              autoRefresh
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
            }`}
          >
            <Signal className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'LIVE 30s' : 'PAUSADO'}
          </button>
          <button
            onClick={() => { setLoading(true); carregarDados() }}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 font-mono text-xs font-bold uppercase transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">{clientes.length}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Total Cadastrados</p>
            </div>
          </div>
        </div>

        <button onClick={() => setFiltroStatus(filtroStatus === 'online' ? 'todos' : 'online')} className={`bg-zinc-900/40 border rounded-2xl p-4 text-left transition-all cursor-pointer ${filtroStatus === 'online' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800/60 hover:border-zinc-700'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-emerald-400">{totalAtivos}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ativos ({totalOnline} unicos)</p>
            </div>
          </div>
        </button>

        <button onClick={() => setFiltroStatus(filtroStatus === 'offline' ? 'todos' : 'offline')} className={`bg-zinc-900/40 border rounded-2xl p-4 text-left transition-all cursor-pointer ${filtroStatus === 'offline' ? 'border-zinc-500/50 bg-zinc-500/5' : 'border-zinc-800/60 hover:border-zinc-700'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-700/30 border border-zinc-600/30 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-zinc-400">{totalOffline}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Offline</p>
            </div>
          </div>
        </button>

        <button onClick={() => setFiltroStatus(filtroStatus === 'bloqueado' ? 'todos' : 'bloqueado')} className={`bg-zinc-900/40 border rounded-2xl p-4 text-left transition-all cursor-pointer ${filtroStatus === 'bloqueado' ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800/60 hover:border-zinc-700'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <ShieldBan className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-red-400">{totalBloqueados}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Bloqueados</p>
            </div>
          </div>
        </button>
      </div>

      {/* BARRA DE BUSCA + FILTRO */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por login, IP, MAC, perfil..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="relative">
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as 'todos' | 'online' | 'offline' | 'bloqueado')}
            className="appearance-none pl-4 pr-10 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono cursor-pointer focus:outline-none focus:border-emerald-500/50"
          >
            <option value="todos">Todos ({clientes.length})</option>
            <option value="online">Online ({totalOnline})</option>
            <option value="offline">Offline ({totalOffline})</option>
            <option value="bloqueado">Bloqueados ({totalBloqueados})</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>

        {ultimaAtualizacao && (
          <span className="text-[10px] font-mono text-zinc-600 whitespace-nowrap">
            {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* CONTADOR */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-mono text-zinc-500">
          Mostrando <span className="text-white font-bold">{clientesFiltrados.length}</span> de <span className="text-white font-bold">{clientes.length}</span> clientes
          {totalAtivos !== totalOnline && (
            <span className="ml-2 text-yellow-400/70">
              ({totalAtivos} conexoes ativas no MikroTik)
            </span>
          )}
          {filtroStatus !== 'todos' && (
            <button onClick={() => setFiltroStatus('todos')} className="ml-2 text-cyan-400 hover:text-cyan-300 cursor-pointer">
              (limpar filtro)
            </button>
          )}
        </p>
      </div>

      {/* TABELA */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="text-left px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Login PPPoE</th>
                <th className="text-left px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Perfil</th>
                <th className="text-left px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">IP</th>
                <th className="text-left px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">MAC</th>
                <th className="text-left px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Uptime</th>
                <th className="text-left px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Trafego</th>
                <th className="text-right px-5 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 font-mono">Buscando clientes no MikroTik...</p>
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 font-mono">
                      {busca ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado no MikroTik'}
                    </p>
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente, idx) => (
                  <tr key={cliente.id + cliente.login + idx} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                    {/* STATUS */}
                    <td className="px-5 py-3.5">
                      {cliente.status === 'online' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ONLINE
                        </span>
                      )}
                      {cliente.status === 'offline' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-700/30 text-zinc-500 border border-zinc-600/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                          OFFLINE
                        </span>
                      )}
                      {cliente.status === 'bloqueado' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                          <ShieldBan className="w-3 h-3" />
                          BLOQUEADO
                        </span>
                      )}
                    </td>

                    {/* LOGIN */}
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-sm font-mono font-bold text-white">{cliente.login}</span>
                        {cliente.comment && (
                          <p className="text-[10px] font-mono text-zinc-600 truncate max-w-[180px]">{cliente.comment}</p>
                        )}
                        {cliente.disabled && (
                          <span className="text-[10px] font-mono text-yellow-500">DESATIVADO</span>
                        )}
                      </div>
                    </td>

                    {/* PERFIL */}
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                        isPerfilBloqueado(cliente.profile)
                          ? 'text-red-400 bg-red-500/10 border-red-500/20'
                          : cliente.profile === '(sem secret)'
                          ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                          : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                      }`}>
                        {cliente.profile}
                      </span>
                    </td>

                    {/* IP */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-zinc-300">{cliente.ip}</span>
                    </td>

                    {/* MAC */}
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-mono text-zinc-500">{cliente.mac}</span>
                    </td>

                    {/* UPTIME */}
                    <td className="px-5 py-3.5">
                      {cliente.uptime ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span className="text-xs font-mono text-zinc-400">{formatUptime(cliente.uptime)}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-zinc-600">-</span>
                      )}
                    </td>

                    {/* TRAFEGO */}
                    <td className="px-5 py-3.5">
                      {cliente.bytesIn || cliente.bytesOut ? (
                        <div className="text-[10px] font-mono space-y-0.5">
                          <p className="text-emerald-400">&#8595; {formatBytes(cliente.bytesIn || '0')}</p>
                          <p className="text-blue-400">&#8593; {formatBytes(cliente.bytesOut || '0')}</p>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-zinc-600">-</span>
                      )}
                    </td>

                    {/* ACOES */}
                    <td className="px-5 py-3.5 text-right">
                      {cliente.status === 'bloqueado' ? (
                        <button
                          onClick={() => abrirModalLiberar(cliente)}
                          disabled={processando === cliente.login}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                        >
                          {processando === cliente.login ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              Liberar
                            </>
                          )}
                        </button>
                      ) : cliente.profile === '(sem secret)' ? (
                        <span className="text-[10px] font-mono text-yellow-400/70">sem secret</span>
                      ) : (
                        <button
                          onClick={() => bloquearCliente(cliente)}
                          disabled={processando === cliente.login}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/30 text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                        >
                          {processando === cliente.login ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Bloquear
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: LIBERAR CLIENTE - ESCOLHER PERFIL                     */}
      {/* Dropdown com perfis REAIS do MikroTik (sincronizado)         */}
      {/* ============================================================ */}
      {modalLiberar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setModalLiberar(null); setPerfilSelecionado('') }} />

          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            {/* Botao fechar */}
            <button
              onClick={() => { setModalLiberar(null); setPerfilSelecionado('') }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Unlock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-mono font-bold text-white">Liberar Cliente</h3>
                <p className="text-xs font-mono text-zinc-500">Escolha o perfil para restaurar a conexao</p>
              </div>
            </div>

            {/* Info do cliente */}
            <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 mb-5">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-zinc-500">Login:</span>
                  <p className="text-white font-bold">{modalLiberar.login}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Perfil atual:</span>
                  <p className="text-red-400 font-bold">{modalLiberar.profile}</p>
                </div>
                {modalLiberar.ip !== '-' && (
                  <div>
                    <span className="text-zinc-500">IP:</span>
                    <p className="text-zinc-300">{modalLiberar.ip}</p>
                  </div>
                )}
                {modalLiberar.comment && (
                  <div>
                    <span className="text-zinc-500">Obs:</span>
                    <p className="text-zinc-300 truncate">{modalLiberar.comment}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dropdown de perfis */}
            <div className="mb-6">
              <label className="block text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Novo Perfil (do MikroTik)
              </label>
              <div className="relative">
                <select
                  value={perfilSelecionado}
                  onChange={e => setPerfilSelecionado(e.target.value)}
                  className="w-full appearance-none pl-4 pr-10 py-3 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-white font-mono cursor-pointer focus:outline-none focus:border-emerald-500/50 hover:border-zinc-600 transition-colors"
                >
                  <option value="">-- Selecione o perfil --</option>
                  {perfisParaLiberar.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name}{p['rate-limit'] ? ` (${p['rate-limit']})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
              <p className="mt-2 text-[10px] font-mono text-zinc-600">
                {perfisParaLiberar.length} perfis disponiveis no MikroTik (sincronizado em tempo real)
              </p>
            </div>

            {/* Botoes */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setModalLiberar(null); setPerfilSelecionado('') }}
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-mono text-zinc-400 hover:text-white hover:border-zinc-600 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={liberarCliente}
                disabled={!perfilSelecionado || processando === modalLiberar.login}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 border border-emerald-500 disabled:border-zinc-600 rounded-xl text-sm font-mono font-bold text-white transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {processando === modalLiberar.login ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Liberar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}