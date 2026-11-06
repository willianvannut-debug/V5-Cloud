// ============================================================
// app/dashboard/mikrotik/desbloqueio/page.tsx
// V5 FIBRA — Desbloqueio MikroTik
// CORRIGIDO: Busca clientes bloqueados REAIS do MikroTik
// e permite desbloquear manualmente via Bridge
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ShieldCheck, Search, Loader2, RefreshCw, Settings, Shield, CheckCircle, Users, Wifi, WifiOff, Unlock } from 'lucide-react'
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

interface ConfigDesbloqueio {
  desbloqueio_automatico: boolean
  verificar_pagamento: boolean
  intervalo_verificacao: number
  notificar_desbloqueio: boolean
  mensagem: string
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function DesbloqueioMikroTikPage() {
  const { operador } = useAuth()
  const [bloqueados, setBloqueados] = useState<ClienteBloqueado[]>([])
  const [loading, setLoading] = useState(true)
  const [desbloqueando, setDesbloqueando] = useState<string | null>(null)
  const [desbloqueandoTodos, setDesbloqueandoTodos] = useState(false)
  const [busca, setBusca] = useState('')
  const [configAberta, setConfigAberta] = useState(false)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  const [config, setConfig] = useState<ConfigDesbloqueio>({
    desbloqueio_automatico: false,
    verificar_pagamento: true,
    intervalo_verificacao: 30,
    notificar_desbloqueio: true,
    mensagem: 'Seu acesso foi liberado. Obrigado pelo pagamento!',
  })

  // ============================================================
  // CARREGAR BLOQUEADOS DO MIKROTIK (ADDRESS-LIST)
  // ============================================================
  const carregarBloqueados = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/mk-proxy?path=firewall/address-list&empresa_id=${operador.empresaId}`
      )
      const data = await res.json()

      if (data.success && Array.isArray(data.data)) {
        // Filtrar apenas a lista "bloqueados"
        const listaBloqueados = data.data.filter(
          (item: ClienteBloqueado) => item.list === 'bloqueados'
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
  }, [operador?.empresaId])

  // ============================================================
  // CARREGAR CONFIG DO SUPABASE
  // ============================================================
  const carregarConfig = useCallback(async () => {
    if (!operador?.empresaId) return
    try {
      const res = await fetch(`/api/desbloqueio?empresa_id=${operador.empresaId}`)
      const data = await res.json()
      if (data.success && data.config) {
        setConfig(prev => ({ ...prev, ...data.config }))
      }
    } catch {
      // usa config padrao
    }
  }, [operador?.empresaId])

  useEffect(() => {
    carregarBloqueados()
    carregarConfig()
  }, [carregarBloqueados, carregarConfig])

  // ============================================================
  // DESBLOQUEAR UM CLIENTE (remover da address-list)
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
  // DESBLOQUEAR TODOS
  // ============================================================
  const desbloquearTodos = async () => {
    if (!confirm(`Desbloquear TODOS os ${bloqueados.length} clientes?`)) return
    setDesbloqueandoTodos(true)
    let sucesso = 0
    let erros = 0

    for (const item of bloqueados) {
      try {
        const res = await fetch(
          `/api/mk-proxy?path=firewall/address-list/remove&empresa_id=${operador?.empresaId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item['.id'] }),
          }
        )
        const data = await res.json()
        if (data.success) {
          sucesso++
        } else {
          erros++
        }
      } catch {
        erros++
      }
    }

    if (sucesso > 0) toast.success(`${sucesso} cliente(s) desbloqueado(s)!`)
    if (erros > 0) toast.error(`${erros} erro(s) ao desbloquear`)

    setDesbloqueandoTodos(false)
    carregarBloqueados()
  }

  // ============================================================
  // SALVAR CONFIG
  // ============================================================
  const salvarConfig = async () => {
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/desbloqueio', {
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

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-mono font-black tracking-wider text-white uppercase">
              Desbloqueio MikroTik
            </h1>
            <p className="text-sm text-zinc-500 font-mono">
              Desbloquear clientes da address-list do MikroTik
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
          {bloqueados.length > 0 && (
            <button
              onClick={desbloquearTodos}
              disabled={desbloqueandoTodos}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
            >
              {desbloqueandoTodos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Desbloquear Todos
            </button>
          )}
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">{bloqueados.length}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Aguardando</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
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
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">
                {bloqueados.filter(b => b.disabled !== 'true').length}
              </p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ativos na Lista</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${config.desbloqueio_automatico ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-zinc-800/60 border-zinc-700/60'} border flex items-center justify-center`}>
              {config.desbloqueio_automatico ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-zinc-500" />}
            </div>
            <div>
              <p className="text-lg font-mono font-black text-white">{config.desbloqueio_automatico ? 'ON' : 'OFF'}</p>
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
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-mono">Buscando bloqueados no MikroTik...</p>
                </td>
              </tr>
            ) : bloqueadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <ShieldCheck className="w-10 h-10 text-emerald-500/30 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400 font-mono font-bold">
                    {busca ? 'Nenhum resultado encontrado' : 'Nenhum cliente bloqueado!'}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-1">
                    Todos os clientes estao com acesso liberado
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
                      className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                    >
                      {desbloqueando === item['.id'] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 inline mr-1.5" />
                          Desbloquear
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CONFIG */}
      {configAberta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-mono font-black text-white uppercase tracking-wider">
                Config. Desbloqueio
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Desbloqueio Automatico</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Desbloquear automaticamente ao confirmar pagamento</p>
                </div>
                <button type="button" onClick={() => setConfig({ ...config, desbloqueio_automatico: !config.desbloqueio_automatico })} className={`w-11 h-6 rounded-full transition-all cursor-pointer ${config.desbloqueio_automatico ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.desbloqueio_automatico ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Verificar Pagamento</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Verificar se pagamento foi confirmado</p>
                </div>
                <button type="button" onClick={() => setConfig({ ...config, verificar_pagamento: !config.verificar_pagamento })} className={`w-11 h-6 rounded-full transition-all cursor-pointer ${config.verificar_pagamento ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.verificar_pagamento ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Intervalo verificacao (min)</label>
                <input type="number" value={config.intervalo_verificacao} onChange={e => setConfig({ ...config, intervalo_verificacao: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
              </div>

              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Notificar Desbloqueio</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Avisar cliente quando for desbloqueado</p>
                </div>
                <button type="button" onClick={() => setConfig({ ...config, notificar_desbloqueio: !config.notificar_desbloqueio })} className={`w-11 h-6 rounded-full transition-all cursor-pointer ${config.notificar_desbloqueio ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.notificar_desbloqueio ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Mensagem de desbloqueio</label>
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