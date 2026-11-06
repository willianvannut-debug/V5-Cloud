// ============================================================
// app/dashboard/mikrotik/bloqueio/page.tsx
// V5 FIBRA — Bloqueio MikroTik
// CORRIGIDO: Busca clientes bloqueados REAIS do MikroTik
// e permite bloquear manualmente via Bridge
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ShieldBan, Search, Loader2, RefreshCw, Settings, Shield, AlertTriangle, Users, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// TIPOS
// ============================================================
interface ClienteBloqueado {
  '.id': string
  address: string
  list: string
  comment?: string
  disabled?: string
  'creation-time'?: string
}

interface ClienteDB {
  id: string
  nome: string
  login_pppoe: string
  ip_fixo: string | null
  status: string
}

interface ConfigBloqueio {
  dias_atraso: number
  tipo_bloqueio: string
  address_list_name: string
  notificar_antes: boolean
  dias_notificacao: number
  mensagem: string
  bloqueio_automatico: boolean
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function BloqueioMikroTikPage() {
  const { operador } = useAuth()
  const [bloqueados, setBloqueados] = useState<ClienteBloqueado[]>([])
  const [clientes, setClientes] = useState<ClienteDB[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [bloqueando, setBloqueando] = useState<string | null>(null)
  const [desbloqueando, setDesbloqueando] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [configAberta, setConfigAberta] = useState(false)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [modalBloquearAberto, setModalBloquearAberto] = useState(false)
  const [ipManual, setIpManual] = useState('')
  const [commentManual, setCommentManual] = useState('')
  const [bloqueandoManual, setBloqueandoManual] = useState(false)

  const [config, setConfig] = useState<ConfigBloqueio>({
    dias_atraso: 5,
    tipo_bloqueio: 'address-list',
    address_list_name: 'bloqueados',
    notificar_antes: true,
    dias_notificacao: 3,
    mensagem: 'Seu acesso sera bloqueado por falta de pagamento.',
    bloqueio_automatico: false,
  })

  // ============================================================
  // CARREGAR BLOQUEADOS DO MIKROTIK (ADDRESS-LIST)
  // ============================================================
  const carregarBloqueados = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoading(true)
    try {
      // Buscar address-list do MikroTik via mk-proxy
      const res = await fetch(
        `/api/mk-proxy?path=firewall/address-list&empresa_id=${operador.empresaId}`
      )
      const data = await res.json()

      if (data.success && Array.isArray(data.data)) {
        // Filtrar apenas a lista "bloqueados"
        const listaBloqueados = data.data.filter(
          (item: ClienteBloqueado) => item.list === 'bloqueados' || item.list === config.address_list_name
        )
        setBloqueados(listaBloqueados)
      } else {
        setBloqueados([])
      }
    } catch (err) {
      console.error('Erro ao carregar bloqueados:', err)
      setBloqueados([])
    } finally {
      setLoading(false)
    }
  }, [operador?.empresaId, config.address_list_name])

  // ============================================================
  // CARREGAR CONFIG DO SUPABASE
  // ============================================================
  const carregarConfig = useCallback(async () => {
    if (!operador?.empresaId) return
    try {
      const res = await fetch(`/api/bloqueio?empresa_id=${operador.empresaId}`)
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(prev => ({ ...prev, ...data.config }))
      }
    } catch {
      // usa config padrao
    }
  }, [operador?.empresaId])

  // ============================================================
  // CARREGAR CLIENTES DO SUPABASE (para modal de bloquear)
  // ============================================================
  const carregarClientes = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoadingClientes(true)
    try {
      // Buscar PPPoE ativos do MikroTik para ter IPs reais
      const res = await fetch(
        `/api/mk-proxy?path=pppoe/active&empresa_id=${operador.empresaId}`
      )
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        // Converter conexões PPPoE ativas em lista de clientes
        const clientesAtivos = data.data.map((c: Record<string, string>) => ({
          id: c['.id'] || c.name || '',
          nome: c.name || '',
          login_pppoe: c.name || '',
          ip_fixo: c.address || c['caller-id'] || null,
          status: 'ativo',
        }))
        setClientes(clientesAtivos)
      } else {
        setClientes([])
      }
    } catch {
      setClientes([])
    } finally {
      setLoadingClientes(false)
    }
  }, [operador?.empresaId])

  useEffect(() => {
    carregarBloqueados()
    carregarConfig()
  }, [carregarBloqueados, carregarConfig])

  // ============================================================
  // BLOQUEAR MANUALMENTE (adicionar IP na address-list)
  // ============================================================
  const bloquearManual = async (ip: string, comment?: string) => {
    if (!ip) {
      toast.error('IP e obrigatorio')
      return
    }
    setBloqueandoManual(true)
    setBloqueando(ip)
    try {
      const res = await fetch(
        `/api/mk-proxy?path=firewall/address-list/add&empresa_id=${operador?.empresaId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: ip,
            list: config.address_list_name || 'bloqueados',
            comment: comment || `Bloqueio manual - ${new Date().toLocaleDateString('pt-BR')}`,
          }),
        }
      )
      const data = await res.json()

      if (data.success) {
        toast.success(`IP ${ip} adicionado a lista de bloqueados!`)
        setModalBloquearAberto(false)
        setIpManual('')
        setCommentManual('')
        carregarBloqueados()
      } else {
        toast.error(data.error || 'Erro ao bloquear')
      }
    } catch (err) {
      console.error('Erro ao bloquear:', err)
      toast.error('Erro ao bloquear cliente')
    } finally {
      setBloqueandoManual(false)
      setBloqueando(null)
    }
  }

  // ============================================================
  // DESBLOQUEAR (remover da address-list)
  // ============================================================
  const desbloquear = async (id: string, address: string) => {
    if (!confirm(`Desbloquear o IP ${address}?`)) return
    setDesbloqueando(id)
    try {
      const res = await fetch(
        `/api/mk-proxy?path=firewall/address-list/remove&empresa_id=${operador?.empresaId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        }
      )
      const data = await res.json()

      if (data.success) {
        toast.success(`IP ${address} desbloqueado!`)
        carregarBloqueados()
      } else {
        toast.error(data.error || 'Erro ao desbloquear')
      }
    } catch (err) {
      console.error('Erro ao desbloquear:', err)
      toast.error('Erro ao desbloquear')
    } finally {
      setDesbloqueando(null)
    }
  }

  // ============================================================
  // BLOQUEAR CLIENTE ATIVO (pelo PPPoE)
  // ============================================================
  const bloquearCliente = async (cliente: ClienteDB) => {
    const ip = cliente.ip_fixo
    if (!ip) {
      toast.error('Cliente sem IP atribuido')
      return
    }
    setBloqueando(cliente.login_pppoe)
    try {
      const res = await fetch(
        `/api/mk-proxy?path=bloqueio/executar&empresa_id=${operador?.empresaId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip,
            login: cliente.login_pppoe,
            comment: `Bloqueio manual - ${cliente.login_pppoe} - ${new Date().toLocaleDateString('pt-BR')}`,
          }),
        }
      )
      const data = await res.json()

      if (data.success) {
        toast.success(`Cliente ${cliente.login_pppoe} bloqueado!`)
        carregarBloqueados()
        setModalBloquearAberto(false)
      } else {
        toast.error(data.error || 'Erro ao bloquear')
      }
    } catch (err) {
      console.error('Erro ao bloquear:', err)
      toast.error('Erro ao bloquear cliente')
    } finally {
      setBloqueando(null)
    }
  }

  // ============================================================
  // SALVAR CONFIG
  // ============================================================
  const salvarConfig = async () => {
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/bloqueio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, empresa_id: operador?.empresaId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Configuracoes salvas!')
        setConfigAberta(false)
      } else {
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvandoConfig(false)
    }
  }

  // ============================================================
  // FILTRO
  // ============================================================
  const bloqueadosFiltrados = bloqueados.filter(b => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      (b.address || '').toLowerCase().includes(termo) ||
      (b.comment || '').toLowerCase().includes(termo)
    )
  })

  const clientesFiltrados = clientes.filter(c => {
    if (!buscaCliente) return true
    const termo = buscaCliente.toLowerCase()
    return (
      (c.login_pppoe || '').toLowerCase().includes(termo) ||
      (c.nome || '').toLowerCase().includes(termo) ||
      (c.ip_fixo || '').toLowerCase().includes(termo)
    )
  })

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldBan className="w-7 h-7 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-mono font-black tracking-wider text-white uppercase">
              Bloqueio MikroTik
            </h1>
            <p className="text-sm text-zinc-500 font-mono">
              Address-list de clientes bloqueados no MikroTik
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfigAberta(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl font-mono text-xs font-bold uppercase text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
          <button
            onClick={() => {
              setModalBloquearAberto(true)
              carregarClientes()
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer"
          >
            <ShieldBan className="w-4 h-4" />
            Bloquear Cliente
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <ShieldBan className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">{bloqueados.length}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Bloqueados</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">
                {bloqueados.filter(b => b.disabled === 'true').length}
              </p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Desativados</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">{config.address_list_name}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Address-List</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${config.bloqueio_automatico ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-zinc-800/60 border-zinc-700/60'} border flex items-center justify-center`}>
              {config.bloqueio_automatico ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-zinc-500" />}
            </div>
            <div>
              <p className="text-lg font-mono font-black text-white">{config.bloqueio_automatico ? 'ON' : 'OFF'}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Automatico</p>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por IP ou comentario..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          onClick={carregarBloqueados}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 font-mono text-xs font-bold uppercase transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* TABELA DE BLOQUEADOS (DADOS REAIS DO MIKROTIK) */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">IP / Endereco</th>
              <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Lista</th>
              <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Comentario</th>
              <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <Loader2 className="w-6 h-6 text-red-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-mono">Buscando address-list no MikroTik...</p>
                </td>
              </tr>
            ) : bloqueadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <Shield className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-mono">
                    {busca ? 'Nenhum resultado encontrado' : 'Nenhum cliente bloqueado no MikroTik'}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-1">
                    Address-list &quot;{config.address_list_name}&quot; esta vazia
                  </p>
                </td>
              </tr>
            ) : (
              bloqueadosFiltrados.map(item => (
                <tr key={item['.id']} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono font-bold text-white">{item.address}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                      {item.list}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-zinc-400">{item.comment || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                      item.disabled === 'true'
                        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                      {item.disabled === 'true' ? 'DESATIVADO' : 'BLOQUEADO'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => desbloquear(item['.id'], item.address)}
                      disabled={desbloqueando === item['.id']}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                    >
                      {desbloqueando === item['.id'] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                      ) : (
                        'Desbloquear'
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL BLOQUEAR CLIENTE */}
      {modalBloquearAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl mx-4 p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <ShieldBan className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-mono font-black text-white uppercase tracking-wider">
                Bloquear Cliente
              </h2>
            </div>

            {/* BLOQUEAR POR IP MANUAL */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 space-y-3">
              <p className="text-xs font-mono font-bold text-zinc-400 uppercase">Bloquear por IP</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Ex: 10.0.0.50"
                  value={ipManual}
                  onChange={e => setIpManual(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50"
                />
                <input
                  type="text"
                  placeholder="Comentario (opcional)"
                  value={commentManual}
                  onChange={e => setCommentManual(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50"
                />
                <button
                  onClick={() => bloquearManual(ipManual, commentManual)}
                  disabled={!ipManual || bloqueandoManual}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  {bloqueandoManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldBan className="w-3.5 h-3.5" />}
                  Bloquear
                </button>
              </div>
            </div>

            {/* LISTA DE CLIENTES ATIVOS PARA BLOQUEAR */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono font-bold text-zinc-400 uppercase">
                  Ou selecione um cliente ativo ({clientes.length} online)
                </p>
                <button
                  onClick={carregarClientes}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                  Atualizar
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar login ou IP..."
                  value={buscaCliente}
                  onChange={e => setBuscaCliente(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {loadingClientes ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 font-mono">Buscando clientes ativos...</p>
                  </div>
                ) : clientesFiltrados.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 font-mono">
                      {buscaCliente ? 'Nenhum resultado' : 'Nenhum cliente ativo'}
                    </p>
                  </div>
                ) : (
                  clientesFiltrados.slice(0, 50).map(cliente => (
                    <div key={cliente.id + cliente.login_pppoe} className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/40 rounded-xl px-4 py-3 hover:bg-zinc-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <p className="text-sm font-mono font-bold text-white">{cliente.login_pppoe}</p>
                          <p className="text-[10px] font-mono text-zinc-500">{cliente.ip_fixo || 'Sem IP'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => bloquearCliente(cliente)}
                        disabled={!cliente.ip_fixo || bloqueando === cliente.login_pppoe}
                        className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                      >
                        {bloqueando === cliente.login_pppoe ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Bloquear'
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setModalBloquearAberto(false); setBuscaCliente('') }}
                className="px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-400 uppercase hover:text-white transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIG */}
      {configAberta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-mono font-black text-white uppercase tracking-wider">
                Config. Bloqueio
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Bloqueio Automatico</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Bloquear clientes inadimplentes automaticamente</p>
                </div>
                <button type="button" onClick={() => setConfig({ ...config, bloqueio_automatico: !config.bloqueio_automatico })} className={`w-11 h-6 rounded-full transition-all cursor-pointer ${config.bloqueio_automatico ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.bloqueio_automatico ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Dias de atraso</label>
                  <input type="number" value={config.dias_atraso} onChange={e => setConfig({ ...config, dias_atraso: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Tipo Bloqueio</label>
                  <select value={config.tipo_bloqueio} onChange={e => setConfig({ ...config, tipo_bloqueio: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                    <option value="address-list">Address List</option>
                    <option value="queue">Simple Queue</option>
                    <option value="disable">Desabilitar PPPoE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Nome da Address-List</label>
                <input type="text" value={config.address_list_name} onChange={e => setConfig({ ...config, address_list_name: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
              </div>

              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Notificar antes</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Avisar cliente antes de bloquear</p>
                </div>
                <button type="button" onClick={() => setConfig({ ...config, notificar_antes: !config.notificar_antes })} className={`w-11 h-6 rounded-full transition-all cursor-pointer ${config.notificar_antes ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.notificar_antes ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {config.notificar_antes && (
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Dias antes para notificar</label>
                  <input type="number" value={config.dias_notificacao} onChange={e => setConfig({ ...config, dias_notificacao: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Mensagem de bloqueio</label>
                <textarea value={config.mensagem} onChange={e => setConfig({ ...config, mensagem: e.target.value })} rows={3} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setConfigAberta(false)} className="px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-400 uppercase hover:text-white transition-all cursor-pointer">Cancelar</button>
              <button onClick={salvarConfig} disabled={salvandoConfig} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50">
                {salvandoConfig && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}