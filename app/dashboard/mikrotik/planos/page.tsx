// ============================================================
// app/dashboard/mikrotik/planos/page.tsx
// V5 FIBRA — Planos PPPoE (com Sync MikroTik)
// CORRIGIDO: Sync agora IMPORTA perfis DO MikroTik para o Supabase
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Gauge, Plus, Pencil, Trash2, Search, Loader2, RefreshCw, ArrowUpDown, Wifi, CloudUpload, Check, X, Download } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// TIPOS
// ============================================================
interface PlanoPPPoE {
  id: string
  empresa_id: string
  nome: string
  velocidade_download: string
  velocidade_upload: string
  preco: number
  mikrotik_profile: string
  server_id: string | null
  server_name?: string
  ativo: boolean
  descricao: string
  created_at: string
  updated_at: string
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

// ============================================================
// HELPERS
// ============================================================

// Formata centavos para exibicao (9990 -> "99,90")
function formatarPreco(centavos: number): string {
  const valor = (centavos / 100).toFixed(2)
  return valor.replace('.', ',')
}

// Mascara de preco: so numeros, formata como moeda
function mascararPreco(valor: string): string {
  const numeros = valor.replace(/\D/g, '')
  if (!numeros) return ''
  const centavos = parseInt(numeros, 10)
  return formatarPreco(centavos)
}

// Converte string formatada para numero decimal (ex: "99,90" -> 99.90)
function precoParaNumero(valor: string): number {
  const numeros = valor.replace(/\D/g, '')
  if (!numeros) return 0
  return parseInt(numeros, 10) / 100
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function PlanosPPPoEPage() {
  const { operador } = useAuth()
  const [planos, setPlanos] = useState<PlanoPPPoE[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [planoEditando, setPlanoEditando] = useState<PlanoPPPoE | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)

  // Sync states
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({})
  const [importandoMK, setImportandoMK] = useState(false)

  // Form state
  const [form, setForm] = useState({
    nome: '',
    velocidade_download: '',
    velocidade_upload: '',
    preco: '',
    mikrotik_profile: '',
    descricao: '',
    ativo: true,
  })

  // ============================================================
  // CARREGAR PLANOS
  // ============================================================
  const carregarPlanos = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/planos?empresa_id=${operador.empresaId}`)
      const data = await res.json()
      if (data.success) {
        setPlanos(data.data || [])
      } else {
        setPlanos([])
      }
    } catch {
      setPlanos([])
    } finally {
      setLoading(false)
    }
  }, [operador?.empresaId])

  useEffect(() => {
    carregarPlanos()
  }, [carregarPlanos])

  // ============================================================
  // IMPORTAR PERFIS DO MIKROTIK -> SUPABASE (FUNCAO PRINCIPAL DO SYNC)
  // ============================================================
  const importarDoMikroTik = async () => {
    if (!operador?.empresaId) return

    setImportandoMK(true)
    try {
      // 1. Buscar perfis PPPoE do MikroTik via Bridge
      const res = await fetch(
        `/api/mk-proxy?path=pppoe/profiles&empresa_id=${operador.empresaId}`
      )
      const data = await res.json()

      if (!data.success || !Array.isArray(data.data)) {
        toast.error(data.error || 'Erro ao buscar perfis do MikroTik')
        setImportandoMK(false)
        return
      }

      const perfisMK = data.data
      if (perfisMK.length === 0) {
        toast.error('Nenhum perfil PPPoE encontrado no MikroTik')
        setImportandoMK(false)
        return
      }

      // 2. Para cada perfil do MikroTik, salvar no Supabase se nao existir
      let importados = 0
      let jaExistem = 0
      let erros = 0

      for (const perfil of perfisMK) {
        // Pular perfil "default" e "default-encryption"
        if (perfil.name === 'default' || perfil.name === 'default-encryption') {
          continue
        }

        // Verificar se ja existe pelo nome do profile
        const jaExiste = planos.find(
          p => p.mikrotik_profile?.toLowerCase() === perfil.name?.toLowerCase() ||
               p.nome?.toLowerCase() === perfil.name?.toLowerCase()
        )

        if (jaExiste) {
          jaExistem++
          continue
        }

        // Extrair velocidades do rate-limit (formato MikroTik: "100M/50M" ou "rx/tx")
        let download = '0'
        let upload = '0'
        if (perfil['rate-limit']) {
          const partes = perfil['rate-limit'].split('/')
          if (partes.length >= 2) {
            download = partes[0].replace(/[^0-9]/g, '') || '0'
            upload = partes[1].replace(/[^0-9]/g, '') || '0'
          }
        }

        try {
          const resSave = await fetch('/api/planos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: perfil.name,
              velocidade_download: download + 'M',
              velocidade_upload: upload + 'M',
              preco: 0,
              mikrotik_profile: perfil.name,
              descricao: perfil.comment || 'Importado do MikroTik',
              ativo: true,
              empresa_id: operador.empresaId,
            }),
          })

          const dataSave = await resSave.json()
          if (dataSave.success) {
            importados++
          } else {
            console.error('Erro ao salvar perfil:', perfil.name, dataSave.error)
            erros++
          }
        } catch (err) {
          console.error('Erro ao salvar perfil:', perfil.name, err)
          erros++
        }
      }

      // 3. Recarregar lista
      await carregarPlanos()

      // 4. Mensagem de resultado
      const msgs = []
      if (importados > 0) msgs.push(`${importados} importado${importados > 1 ? 's' : ''}`)
      if (jaExistem > 0) msgs.push(`${jaExistem} ja existe${jaExistem > 1 ? 'm' : ''}`)
      if (erros > 0) msgs.push(`${erros} com erro`)

      if (importados > 0) {
        toast.success(`Perfis do MikroTik: ${msgs.join(', ')}`)
      } else if (jaExistem > 0) {
        toast.success(`Todos os ${jaExistem} perfis ja estao cadastrados`)
      } else {
        toast.error('Nenhum perfil importado')
      }
    } catch (err) {
      console.error('Erro importar MK:', err)
      toast.error('Erro ao conectar com o MikroTik')
    } finally {
      setImportandoMK(false)
    }
  }

  // ============================================================
  // SYNC INDIVIDUAL: ENVIA PLANO DO SUPABASE -> MIKROTIK
  // ============================================================
  const sincronizarPlano = async (plano: PlanoPPPoE) => {
    if (!operador?.empresaId) return

    setSyncStatus(prev => ({ ...prev, [plano.id]: 'syncing' }))

    try {
      const download = parseInt(plano.velocidade_download.replace(/[^0-9]/g, ''), 10) || 0
      const upload = parseInt(plano.velocidade_upload.replace(/[^0-9]/g, ''), 10) || 0

      const res = await fetch(`/api/mk-proxy?path=pppoe/profiles/sync&empresa_id=${operador.empresaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: plano.mikrotik_profile || plano.nome,
          download,
          upload,
          comment: `V5 Fibra - ${plano.nome}`,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSyncStatus(prev => ({ ...prev, [plano.id]: 'success' }))
        toast.success(`${plano.nome} sincronizado com MikroTik!`)
      } else {
        setSyncStatus(prev => ({ ...prev, [plano.id]: 'error' }))
        toast.error(`Erro ao sincronizar ${plano.nome}: ${data.error}`)
      }
    } catch {
      setSyncStatus(prev => ({ ...prev, [plano.id]: 'error' }))
      toast.error(`Erro ao sincronizar ${plano.nome}`)
    }

    setTimeout(() => {
      setSyncStatus(prev => ({ ...prev, [plano.id]: 'idle' }))
    }, 3000)
  }

  // ============================================================
  // ABRIR MODAL
  // ============================================================
  const abrirNovo = () => {
    setPlanoEditando(null)
    setForm({
      nome: '',
      velocidade_download: '',
      velocidade_upload: '',
      preco: '',
      mikrotik_profile: '',
      descricao: '',
      ativo: true,
    })
    setModalAberto(true)
  }

  const abrirEditar = (plano: PlanoPPPoE) => {
    setPlanoEditando(plano)
    const down = plano.velocidade_download.replace(/[^0-9]/g, '')
    const up = plano.velocidade_upload.replace(/[^0-9]/g, '')
    const precoCentavos = Math.round(Number(plano.preco) * 100)
    setForm({
      nome: plano.nome,
      velocidade_download: down,
      velocidade_upload: up,
      preco: formatarPreco(precoCentavos),
      mikrotik_profile: plano.mikrotik_profile,
      descricao: plano.descricao,
      ativo: plano.ativo,
    })
    setModalAberto(true)
  }

  // ============================================================
  // SALVAR PLANO
  // ============================================================
  const salvar = async () => {
    if (!form.nome || !form.velocidade_download || !form.velocidade_upload || !form.preco) {
      toast.error('Preencha todos os campos obrigatorios')
      return
    }
    setSalvando(true)
    try {
      const payload = {
        nome: form.nome,
        velocidade_download: form.velocidade_download + 'M',
        velocidade_upload: form.velocidade_upload + 'M',
        preco: precoParaNumero(form.preco),
        mikrotik_profile: form.mikrotik_profile || form.nome.toLowerCase().replace(/\s+/g, '_'),
        descricao: form.descricao,
        ativo: form.ativo,
        empresa_id: operador?.empresaId,
      }

      const res = await fetch('/api/planos', {
        method: planoEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planoEditando ? { ...payload, id: planoEditando.id } : payload),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(planoEditando ? 'Plano atualizado!' : 'Plano criado!')
        setModalAberto(false)
        carregarPlanos()
      } else {
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar plano')
    } finally {
      setSalvando(false)
    }
  }

  // ============================================================
  // DELETAR PLANO
  // ============================================================
  const deletar = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return
    setDeletando(id)
    try {
      const res = await fetch(`/api/planos?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Plano excluido!')
        carregarPlanos()
      } else {
        toast.error(data.error || 'Erro ao excluir')
      }
    } catch {
      toast.error('Erro ao excluir plano')
    } finally {
      setDeletando(null)
    }
  }

  // ============================================================
  // FILTRO
  // ============================================================
  const planosFiltrados = planos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.velocidade_download.toLowerCase().includes(busca.toLowerCase())
  )

  // ============================================================
  // ICONE DE SYNC STATUS
  // ============================================================
  const SyncIcon = ({ planoId }: { planoId: string }) => {
    const status = syncStatus[planoId] || 'idle'
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
          <Gauge className="w-7 h-7 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-mono font-black tracking-wider text-white uppercase">
              Planos PPPoE
            </h1>
            <p className="text-sm text-zinc-500 font-mono">
              Gerencie os planos de internet e perfis PPPoE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* BOTAO SYNC MIKROTIK - IMPORTA DO MIKROTIK - SEMPRE ATIVO */}
          <button
            onClick={importarDoMikroTik}
            disabled={importandoMK}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 font-black uppercase text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
            title="Importar perfis PPPoE do MikroTik para o sistema"
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
            Novo Plano
          </button>
        </div>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar plano..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <button
          onClick={carregarPlanos}
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
              <th className="text-left p-4">
                <div className="flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  Download / Upload
                </div>
              </th>
              <th className="text-left p-4">Preco</th>
              <th className="text-left p-4">Profile MikroTik</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-mono">Carregando planos...</p>
                </td>
              </tr>
            ) : planosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <Wifi className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-mono">Nenhum plano cadastrado</p>
                  <p className="text-xs text-zinc-600 font-mono mt-1">
                    Clique em &quot;Sync MikroTik&quot; para importar os perfis do roteador
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
              planosFiltrados.map(plano => (
                <tr key={plano.id} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="p-4">
                    <span className="text-sm font-mono font-bold text-white">{plano.nome}</span>
                    {plano.descricao && (
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{plano.descricao}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-emerald-400 font-bold">&#8595; {plano.velocidade_download}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-sm font-mono text-blue-400 font-bold">&#8593; {plano.velocidade_upload}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-mono text-yellow-400 font-bold">
                      R$ {Number(plano.preco).toFixed(2).replace('.', ',')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-mono text-zinc-400 bg-black/40 border border-zinc-800 px-2 py-1 rounded-lg">
                      {plano.mikrotik_profile}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold font-mono border ${plano.ativo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {plano.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => sincronizarPlano(plano)}
                        disabled={syncStatus[plano.id] === 'syncing'}
                        className="p-2 rounded-lg hover:bg-cyan-500/10 text-zinc-400 hover:text-cyan-400 transition-all cursor-pointer disabled:opacity-50"
                        title="Enviar para MikroTik"
                      >
                        <SyncIcon planoId={plano.id} />
                      </button>
                      <button
                        onClick={() => abrirEditar(plano)}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletar(plano.id)}
                        disabled={deletando === plano.id}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
                        title="Excluir"
                      >
                        {deletando === plano.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CONTAGEM */}
      {!loading && planos.length > 0 && (
        <p className="text-[11px] text-zinc-500 font-mono">
          {planosFiltrados.length} de {planos.length} plano{planos.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* MODAL NOVO/EDITAR */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Gauge className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-mono font-black text-white uppercase tracking-wider">
                {planoEditando ? 'Editar Plano' : 'Novo Plano PPPoE'}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 100 Mega"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Velocidades */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">
                    Download (Mbps) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 100"
                      value={form.velocidade_download}
                      onChange={e => {
                        const valor = e.target.value.replace(/\D/g, '')
                        setForm({ ...form, velocidade_download: valor })
                      }}
                      className="w-full px-4 py-2.5 pr-12 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono font-bold">
                      Mbps
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">
                    Upload (Mbps) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 50"
                      value={form.velocidade_upload}
                      onChange={e => {
                        const valor = e.target.value.replace(/\D/g, '')
                        setForm({ ...form, velocidade_upload: valor })
                      }}
                      className="w-full px-4 py-2.5 pr-12 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono font-bold">
                      Mbps
                    </span>
                  </div>
                </div>
              </div>

              {/* Preco e Profile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">
                    Preco (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono font-bold">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={form.preco}
                      onChange={e => {
                        setForm({ ...form, preco: mascararPreco(e.target.value) })
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">
                    Profile MikroTik
                  </label>
                  <input
                    type="text"
                    placeholder="Auto: nome_do_plano"
                    value={form.mikrotik_profile}
                    onChange={e => setForm({ ...form, mikrotik_profile: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* Descricao */}
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">
                  Descricao (opcional)
                </label>
                <textarea
                  placeholder="Detalhes do plano..."
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {/* Ativo */}
              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Plano Ativo</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Disponivel para novos clientes</p>
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
                {planoEditando ? 'Salvar Alteracoes' : 'Criar Plano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}