// ============================================================
// app/dashboard/mikrotik/pools/page.tsx
// V5 FIBRA — Pools de IP (com Sync MikroTik)
// CORRIGIDO: Sync agora IMPORTA pools DO MikroTik para o Supabase
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Globe, Plus, Pencil, Trash2, Search, Loader2, RefreshCw, Network, CloudUpload, Check, X, Download } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// TIPOS
// ============================================================
interface PoolIP {
  id: string
  empresa_id: string
  nome: string
  range_inicio: string
  range_fim: string
  gateway: string
  mascara: string
  dns_primario: string
  dns_secundario: string
  server_id: string | null
  mikrotik_pool_name: string
  ativo: boolean
  total_ips: number
  ips_usados: number
  descricao: string
  created_at: string
  updated_at: string
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function PoolsIPPage() {
  const { operador } = useAuth()
  const [pools, setPools] = useState<PoolIP[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [poolEditando, setPoolEditando] = useState<PoolIP | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)

  // Sync states
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({})
  const [importandoMK, setImportandoMK] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    range_inicio: '',
    range_fim: '',
    gateway: '',
    mascara: '255.255.255.0',
    dns_primario: '8.8.8.8',
    dns_secundario: '8.8.4.4',
    mikrotik_pool_name: '',
    descricao: '',
    ativo: true,
  })

  // ============================================================
  // CARREGAR POOLS
  // ============================================================
  const carregarPools = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pools?empresa_id=${operador.empresaId}`)
      const data = await res.json()
      if (data.success) {
        setPools(data.data || [])
      } else {
        setPools([])
      }
    } catch {
      setPools([])
    } finally {
      setLoading(false)
    }
  }, [operador?.empresaId])

  useEffect(() => {
    carregarPools()
  }, [carregarPools])

  // ============================================================
  // IMPORTAR POOLS DO MIKROTIK -> SUPABASE (FUNCAO PRINCIPAL DO SYNC)
  // ============================================================
  const importarDoMikroTik = async () => {
    if (!operador?.empresaId) return

    setImportandoMK(true)
    try {
      // 1. Buscar pools de IP do MikroTik via Bridge
      const res = await fetch(
        `/api/mk-proxy?path=ip/pool&empresa_id=${operador.empresaId}`
      )
      const data = await res.json()

      if (!data.success || !Array.isArray(data.data)) {
        toast.error(data.error || 'Erro ao buscar pools do MikroTik')
        setImportandoMK(false)
        return
      }

      const poolsMK = data.data
      if (poolsMK.length === 0) {
        toast.error('Nenhum pool de IP encontrado no MikroTik')
        setImportandoMK(false)
        return
      }

      // 2. Para cada pool do MikroTik, salvar no Supabase se nao existir
      let importados = 0
      let jaExistem = 0
      let erros = 0

      for (const pool of poolsMK) {
        // Verificar se ja existe pelo nome do pool
        const jaExiste = pools.find(
          p => p.mikrotik_pool_name?.toLowerCase() === pool.name?.toLowerCase() ||
               p.nome?.toLowerCase() === pool.name?.toLowerCase()
        )

        if (jaExiste) {
          jaExistem++
          continue
        }

        // Extrair range de IPs (formato MikroTik: "10.0.0.2-10.0.0.254")
        let rangeInicio = ''
        let rangeFim = ''
        if (pool.ranges) {
          // MikroTik pode ter multiplos ranges separados por virgula
          const primeiroRange = pool.ranges.split(',')[0].trim()
          const partes = primeiroRange.split('-')
          if (partes.length >= 2) {
            rangeInicio = partes[0].trim()
            rangeFim = partes[1].trim()
          }
        }

        // Pular pools sem ranges validos (ex: pools vazios ou sem IP definido)
        if (!rangeInicio || !rangeFim) {
          console.warn('Pool sem ranges validos, pulando:', pool.name, pool.ranges)
          erros++
          continue
        }

        // Calcular total de IPs
        let totalIps = 0
        const inicioPartes = rangeInicio.split('.').map(Number)
        const fimPartes = rangeFim.split('.').map(Number)
        if (inicioPartes.length === 4 && fimPartes.length === 4) {
          const inicioNum = (inicioPartes[0] << 24) + (inicioPartes[1] << 16) + (inicioPartes[2] << 8) + inicioPartes[3]
          const fimNum = (fimPartes[0] << 24) + (fimPartes[1] << 16) + (fimPartes[2] << 8) + fimPartes[3]
          totalIps = Math.abs(fimNum - inicioNum) + 1
        }

        // Extrair gateway automaticamente (primeiro IP da faixa, ex: 10.0.0.1)
        let gatewayAuto = ''
        if (inicioPartes.length === 4) {
          gatewayAuto = `${inicioPartes[0]}.${inicioPartes[1]}.${inicioPartes[2]}.1`
        }

        try {
          const resSave = await fetch('/api/pools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: pool.name,
              range_inicio: rangeInicio,
              range_fim: rangeFim,
              gateway: gatewayAuto,
              mascara: '255.255.255.0',
              dns_primario: '8.8.8.8',
              dns_secundario: '8.8.4.4',
              mikrotik_pool_name: pool.name,
              descricao: pool.comment || 'Importado do MikroTik',
              ativo: true,
              total_ips: totalIps,
              ips_usados: 0,
              empresa_id: operador.empresaId,
            }),
          })

          const dataSave = await resSave.json()
          if (dataSave.success) {
            importados++
          } else {
            console.error('Erro ao salvar pool:', pool.name, dataSave.error)
            erros++
          }
        } catch (err) {
          console.error('Erro ao salvar pool:', pool.name, err)
          erros++
        }
      }

      // 3. Recarregar lista
      await carregarPools()

      // 4. Mensagem de resultado
      const msgs = []
      if (importados > 0) msgs.push(`${importados} importado${importados > 1 ? 's' : ''}`)
      if (jaExistem > 0) msgs.push(`${jaExistem} ja existe${jaExistem > 1 ? 'm' : ''}`)
      if (erros > 0) msgs.push(`${erros} com erro`)

      if (importados > 0) {
        toast.success(`Pools do MikroTik: ${msgs.join(', ')}`)
      } else if (jaExistem > 0) {
        toast.success(`Todos os ${jaExistem} pools ja estao cadastrados`)
      } else {
        toast.error('Nenhum pool importado')
      }
    } catch (err) {
      console.error('Erro importar MK:', err)
      toast.error('Erro ao conectar com o MikroTik')
    } finally {
      setImportandoMK(false)
    }
  }

  // ============================================================
  // SYNC INDIVIDUAL: ENVIA POOL DO SUPABASE -> MIKROTIK
  // ============================================================
  const sincronizarPool = async (pool: PoolIP) => {
    if (!operador?.empresaId) return

    setSyncStatus(prev => ({ ...prev, [pool.id]: 'syncing' }))

    try {
      const res = await fetch(`/api/mk-proxy?path=ip/pool/sync&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pool.mikrotik_pool_name || pool.nome,
          ranges: `${pool.range_inicio}-${pool.range_fim}`,
          comment: `V5 Fibra - ${pool.nome}`,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSyncStatus(prev => ({ ...prev, [pool.id]: 'success' }))
        toast.success(`${pool.nome} sincronizado com MikroTik!`)
      } else {
        setSyncStatus(prev => ({ ...prev, [pool.id]: 'error' }))
        toast.error(`Erro ao sincronizar ${pool.nome}: ${data.error}`)
      }
    } catch {
      setSyncStatus(prev => ({ ...prev, [pool.id]: 'error' }))
      toast.error(`Erro ao sincronizar ${pool.nome}`)
    }

    setTimeout(() => {
      setSyncStatus(prev => ({ ...prev, [pool.id]: 'idle' }))
    }, 3000)
  }

  // ============================================================
  // ABRIR MODAL
  // ============================================================
  const abrirNovo = () => {
    setPoolEditando(null)
    setForm({
      nome: '',
      range_inicio: '',
      range_fim: '',
      gateway: '',
      mascara: '255.255.255.0',
      dns_primario: '8.8.8.8',
      dns_secundario: '8.8.4.4',
      mikrotik_pool_name: '',
      descricao: '',
      ativo: true,
    })
    setModalAberto(true)
  }

  const abrirEditar = (pool: PoolIP) => {
    setPoolEditando(pool)
    setForm({
      nome: pool.nome,
      range_inicio: pool.range_inicio,
      range_fim: pool.range_fim,
      gateway: pool.gateway,
      mascara: pool.mascara,
      dns_primario: pool.dns_primario,
      dns_secundario: pool.dns_secundario,
      mikrotik_pool_name: pool.mikrotik_pool_name,
      descricao: pool.descricao,
      ativo: pool.ativo,
    })
    setModalAberto(true)
  }

  // ============================================================
  // SALVAR POOL
  // ============================================================
  const salvar = async () => {
    if (!form.nome || !form.range_inicio || !form.range_fim) {
      toast.error('Preencha todos os campos obrigatorios')
      return
    }
    setSalvando(true)
    try {
      const payload = {
        ...form,
        empresa_id: operador?.empresaId,
        mikrotik_pool_name: form.mikrotik_pool_name || form.nome.toLowerCase().replace(/\s+/g, '_'),
      }

      const res = await fetch('/api/pools', {
        method: poolEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poolEditando ? { ...payload, id: poolEditando.id } : payload),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(poolEditando ? 'Pool atualizado!' : 'Pool criado!')
        setModalAberto(false)
        carregarPools()
      } else {
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar pool')
    } finally {
      setSalvando(false)
    }
  }

  // ============================================================
  // DELETAR POOL
  // ============================================================
  const deletar = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pool?')) return
    setDeletando(id)
    try {
      const res = await fetch(`/api/pools?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Pool excluido!')
        carregarPools()
      } else {
        toast.error(data.error || 'Erro ao excluir')
      }
    } catch {
      toast.error('Erro ao excluir pool')
    } finally {
      setDeletando(null)
    }
  }

  const poolsFiltrados = pools.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.range_inicio.includes(busca)
  )

  // ============================================================
  // CALCULAR % USO
  // ============================================================
  const calcularUso = (pool: PoolIP) => {
    if (!pool.total_ips || pool.total_ips === 0) return 0
    return Math.round((pool.ips_usados / pool.total_ips) * 100)
  }

  // ============================================================
  // ICONE DE SYNC STATUS
  // ============================================================
  const SyncIcon = ({ poolId }: { poolId: string }) => {
    const status = syncStatus[poolId] || 'idle'
    if (status === 'syncing') return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
    if (status === 'success') return <Check className="w-4 h-4 text-emerald-400" />
    if (status === 'error') return <X className="w-4 h-4 text-red-400" />
    return <CloudUpload className="w-4 h-4" />
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-7 h-7 text-teal-400" />
          <div>
            <h1 className="text-2xl font-mono font-black tracking-wider text-white uppercase">
              Pools de IP
            </h1>
            <p className="text-sm text-zinc-500 font-mono">
              Gerencie as faixas de IP para distribuicao aos clientes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* BOTAO SYNC MIKROTIK - IMPORTA DO MIKROTIK - SEMPRE ATIVO */}
          <button
            onClick={importarDoMikroTik}
            disabled={importandoMK}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 font-black uppercase text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
            title="Importar pools de IP do MikroTik para o sistema"
          >
            {importandoMK ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Sync MikroTik
          </button>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Pool
          </button>
        </div>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar pool..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <button
          onClick={carregarPools}
          className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 font-mono text-xs font-bold uppercase transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* TABELA */}
      <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
              <th className="text-left p-4">Nome</th>
              <th className="text-left p-4">Range</th>
              <th className="text-left p-4">Gateway</th>
              <th className="text-left p-4">Uso</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-mono">Carregando pools...</p>
                </td>
              </tr>
            ) : poolsFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <Network className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-mono">Nenhum pool cadastrado</p>
                  <p className="text-xs text-zinc-600 font-mono mt-1">
                    Clique em &quot;Sync MikroTik&quot; para importar os pools do roteador
                  </p>
                  <button
                    onClick={importarDoMikroTik}
                    disabled={importandoMK}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs font-mono font-bold text-cyan-400 uppercase transition-all cursor-pointer hover:bg-cyan-500/20 disabled:opacity-50"
                  >
                    {importandoMK ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Importar do MikroTik
                  </button>
                </td>
              </tr>
            ) : (
              poolsFiltrados.map(pool => {
                const uso = calcularUso(pool)
                return (
                  <tr key={pool.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4">
                      <span className="text-sm font-mono font-bold text-white">{pool.nome}</span>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{pool.mikrotik_pool_name}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-mono text-teal-400">
                        {pool.range_inicio} - {pool.range_fim}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-mono text-zinc-300">{pool.gateway || '-'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${uso > 80 ? 'bg-red-500' : uso > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                            style={{ width: `${uso}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-zinc-400">
                          {pool.ips_usados}/{pool.total_ips}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold font-mono border ${pool.ativo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {pool.ativo ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => sincronizarPool(pool)}
                          disabled={syncStatus[pool.id] === 'syncing'}
                          className="p-2 rounded-lg hover:bg-cyan-500/10 text-zinc-400 hover:text-cyan-400 transition-all cursor-pointer disabled:opacity-50"
                          title="Enviar para MikroTik"
                        >
                          <SyncIcon poolId={pool.id} />
                        </button>
                        <button
                          onClick={() => abrirEditar(pool)}
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletar(pool.id)}
                          disabled={deletando === pool.id}
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {deletando === pool.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CONTAGEM */}
      {!loading && pools.length > 0 && (
        <p className="text-[11px] text-zinc-500 font-mono">
          {poolsFiltrados.length} de {pools.length} pool{pools.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* MODAL */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-mono font-black text-white uppercase tracking-wider">
                {poolEditando ? 'Editar Pool' : 'Novo Pool de IP'}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Nome *</label>
                <input
                  type="text"
                  placeholder="Ex: Pool-Clientes-01"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">IP Inicio *</label>
                  <input
                    type="text"
                    placeholder="10.0.0.2"
                    value={form.range_inicio}
                    onChange={e => setForm({ ...form, range_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">IP Fim *</label>
                  <input
                    type="text"
                    placeholder="10.0.0.254"
                    value={form.range_fim}
                    onChange={e => setForm({ ...form, range_fim: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Gateway e Mascara */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Gateway</label>
                  <input
                    type="text"
                    placeholder="10.0.0.1"
                    value={form.gateway}
                    onChange={e => setForm({ ...form, gateway: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Mascara</label>
                  <input
                    type="text"
                    value={form.mascara}
                    onChange={e => setForm({ ...form, mascara: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* DNS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">DNS Primario</label>
                  <input
                    type="text"
                    value={form.dns_primario}
                    onChange={e => setForm({ ...form, dns_primario: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">DNS Secundario</label>
                  <input
                    type="text"
                    value={form.dns_secundario}
                    onChange={e => setForm({ ...form, dns_secundario: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Pool MikroTik */}
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Nome Pool MikroTik</label>
                <input
                  type="text"
                  placeholder="Auto: nome_do_pool"
                  value={form.mikrotik_pool_name}
                  onChange={e => setForm({ ...form, mikrotik_pool_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Descricao */}
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Descricao</label>
                <textarea
                  placeholder="Observacoes..."
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Pool Ativo</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Disponivel para distribuicao</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, ativo: !form.ativo })}
                  className={`w-11 h-6 rounded-full transition-all cursor-pointer ${form.ativo ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${form.ativo ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Botoes */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-400 uppercase hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-mono font-black uppercase transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {poolEditando ? 'Salvar' : 'Criar Pool'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}