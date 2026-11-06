// ============================================================
// app/dashboard/mikrotik/backup/page.tsx
// V5 FIBRA — Backup MikroTik
// CORRIGIDO: Agora cria backup REAL no MikroTik via Bridge
// ============================================================
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { HardDrive, Download, Loader2, RefreshCw, Server, Clock, CheckCircle, AlertTriangle, Plus, Trash2, Settings, FileArchive, List } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// TIPOS
// ============================================================
interface BackupItem {
  id: string
  empresa_id: string
  server_id: string
  server_name: string
  nome_arquivo: string
  tipo: 'backup' | 'export'
  tamanho: number
  status: 'concluido' | 'erro' | 'em_andamento'
  erro_msg: string | null
  created_at: string
}

interface ServidorOption {
  id: string
  name: string
  status: string
}

interface ConfigBackup {
  backup_automatico: boolean
  intervalo_horas: number
  manter_ultimos: number
  tipo_padrao: 'backup' | 'export' | 'ambos'
  horario_preferido: string
}

interface BackupMKFile {
  name: string
  size: string
  type: string
  'creation-date': string
}

// ============================================================
// HELPER
// ============================================================
function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function tempoAtras(data: string): string {
  const agora = new Date()
  const d = new Date(data)
  const diff = Math.floor((agora.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atras`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atras`
  return `${Math.floor(diff / 86400)}d atras`
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function BackupMikroTikPage() {
  const { operador } = useAuth()
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [backupsMK, setBackupsMK] = useState<BackupMKFile[]>([])
  const [servidores, setServidores] = useState<ServidorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMK, setLoadingMK] = useState(false)
  const [loadingServidores, setLoadingServidores] = useState(true)
  const [criandoBackup, setCriandoBackup] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [configAberta, setConfigAberta] = useState(false)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'mikrotik'>('mikrotik')

  // Form novo backup
  const [novoBackupAberto, setNovoBackupAberto] = useState(false)
  const [novoBackup, setNovoBackup] = useState({
    server_id: '',
    tipo: 'backup' as 'backup' | 'export',
  })

  const [config, setConfig] = useState<ConfigBackup>({
    backup_automatico: false,
    intervalo_horas: 24,
    manter_ultimos: 10,
    tipo_padrao: 'backup',
    horario_preferido: '03:00',
  })

  // ============================================================
  // CARREGAR SERVIDORES
  // ============================================================
  const carregarServidores = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoadingServidores(true)
    try {
      const res = await fetch(`/api/servidores?empresa_id=${operador.empresaId}`)
      const data = await res.json()
      if (data.success && data.data) {
        setServidores(data.data)
        if (data.data.length > 0 && !novoBackup.server_id) {
          setNovoBackup(prev => ({ ...prev, server_id: data.data[0].id }))
        }
      }
    } catch {
      // sem servidores
    } finally {
      setLoadingServidores(false)
    }
  }, [operador?.empresaId, novoBackup.server_id])

  // ============================================================
  // CARREGAR BACKUPS DO SUPABASE (HISTORICO)
  // ============================================================
  const carregarBackups = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/backup?empresa_id=${operador.empresaId}`)
      const data = await res.json()
      if (data.success) {
        setBackups(data.data || [])
        if (data.config) setConfig(data.config)
      } else {
        setBackups([])
      }
    } catch {
      setBackups([])
    } finally {
      setLoading(false)
    }
  }, [operador?.empresaId])

  // ============================================================
  // CARREGAR BACKUPS DO MIKROTIK (ARQUIVOS REAIS)
  // ============================================================
  const carregarBackupsMK = useCallback(async () => {
    if (!operador?.empresaId) return
    setLoadingMK(true)
    try {
      const res = await fetch(
        `/api/mk-proxy?path=backup/list&empresa_id=${operador.empresaId}`
      )
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setBackupsMK(data.data)
      } else {
        setBackupsMK([])
      }
    } catch {
      setBackupsMK([])
    } finally {
      setLoadingMK(false)
    }
  }, [operador?.empresaId])

  useEffect(() => {
    carregarServidores()
    carregarBackups()
    carregarBackupsMK()
  }, [carregarServidores, carregarBackups, carregarBackupsMK])

  // ============================================================
  // CRIAR BACKUP NO MIKROTIK (REAL!)
  // ============================================================
  const criarBackup = async () => {
    if (!novoBackup.server_id) {
      toast.error('Selecione um servidor')
      return
    }
    setCriandoBackup(true)
    try {
      // 1. Criar backup REAL no MikroTik via Bridge
      const resMK = await fetch(
        `/api/mk-proxy?path=backup/criar&empresa_id=${operador?.empresaId}&server_id=${novoBackup.server_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: novoBackup.tipo }),
        }
      )
      const dataMK = await resMK.json()

      let backupStatus: 'concluido' | 'erro' = 'concluido'
      let erroMsg: string | null = null
      let nomeArquivo = ''
      let tamanho = 0

      if (dataMK.success) {
        nomeArquivo = dataMK.data?.name || dataMK.data?.filename || ''
        tamanho = dataMK.data?.size ? parseInt(dataMK.data.size) : 0
        toast.success(`Backup ${novoBackup.tipo} criado no MikroTik!`)
      } else {
        backupStatus = 'erro'
        erroMsg = dataMK.error || 'Erro ao criar backup no MikroTik'
        toast.error(erroMsg)
      }

      // 2. Buscar nome do servidor para o registro
      const servidor = servidores.find(s => s.id === novoBackup.server_id)
      const serverName = servidor?.name || 'MikroTik'

      if (!nomeArquivo) {
        const agora = new Date()
        const dataStr = agora.toISOString().replace(/[-:T]/g, '').slice(0, 14)
        const extensao = novoBackup.tipo === 'export' ? '.rsc' : '.backup'
        nomeArquivo = `${serverName.replace(/\s+/g, '_')}_${dataStr}${extensao}`
      }

      // 3. Salvar registro no Supabase (historico)
      await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_id: novoBackup.server_id,
          tipo: novoBackup.tipo,
          empresa_id: operador?.empresaId,
          nome_arquivo: nomeArquivo,
          tamanho,
          status: backupStatus,
          erro_msg: erroMsg,
        }),
      })

      setNovoBackupAberto(false)
      carregarBackups()
      carregarBackupsMK()
    } catch (err) {
      console.error('Erro backup:', err)
      toast.error('Erro ao criar backup')
    } finally {
      setCriandoBackup(false)
    }
  }

  // ============================================================
  // DELETAR BACKUP DO HISTORICO
  // ============================================================
  const deletarBackup = async (id: string) => {
    if (!confirm('Excluir este registro de backup?')) return
    setDeletando(id)
    try {
      const res = await fetch(`/api/backup?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Registro excluido!')
        carregarBackups()
      } else {
        toast.error(data.error || 'Erro ao excluir')
      }
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDeletando(null)
    }
  }

  // ============================================================
  // SALVAR CONFIG
  // ============================================================
  const salvarConfig = async () => {
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/backup', {
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

  const totalConcluidos = backups.filter(b => b.status === 'concluido').length
  const totalErros = backups.filter(b => b.status === 'erro').length
  const ultimoBackup = backups.length > 0 ? backups[0] : null

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="w-7 h-7 text-zinc-400" />
          <div>
            <h1 className="text-2xl font-mono font-black tracking-wider text-white uppercase">
              Backup MikroTik
            </h1>
            <p className="text-sm text-zinc-500 font-mono">
              Backups e exports dos roteadores MikroTik
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
            onClick={() => setNovoBackupAberto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Backup
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <FileArchive className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">{backupsMK.length}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">No MikroTik</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">{totalConcluidos}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Concluidos</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-mono font-black text-white">{totalErros}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Com Erro</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-lg font-mono font-black text-white truncate">
                {ultimoBackup ? tempoAtras(ultimoBackup.created_at) : 'Nunca'}
              </p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Ultimo Backup</p>
            </div>
          </div>
        </div>
      </div>

      {/* ABAS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setAbaAtiva('mikrotik'); carregarBackupsMK() }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
            abaAtiva === 'mikrotik'
              ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400'
              : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          Arquivos no MikroTik
        </button>
        <button
          onClick={() => { setAbaAtiva('historico'); carregarBackups() }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all cursor-pointer ${
            abaAtiva === 'historico'
              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
              : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <List className="w-4 h-4" />
          Historico
        </button>
        <div className="flex-1" />
        <button
          onClick={() => abaAtiva === 'mikrotik' ? carregarBackupsMK() : carregarBackups()}
          className="flex items-center gap-2 px-3 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 font-mono text-xs font-bold uppercase transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* TABELA - ABA MIKROTIK (ARQUIVOS REAIS) */}
      {abaAtiva === 'mikrotik' && (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Arquivo</th>
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Tamanho</th>
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Data Criacao</th>
              </tr>
            </thead>
            <tbody>
              {loadingMK ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 font-mono">Buscando arquivos no MikroTik...</p>
                  </td>
                </tr>
              ) : backupsMK.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <HardDrive className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 font-mono">Nenhum arquivo de backup no MikroTik</p>
                    <button
                      onClick={() => setNovoBackupAberto(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold text-emerald-400 uppercase transition-all cursor-pointer hover:bg-emerald-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Criar Primeiro Backup
                    </button>
                  </td>
                </tr>
              ) : (
                backupsMK.map((file, idx) => {
                  const isBackup = file.name?.endsWith('.backup')
                  const sizeNum = file.size ? parseInt(file.size) : 0
                  return (
                    <tr key={idx} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileArchive className={`w-4 h-4 ${isBackup ? 'text-blue-400' : 'text-purple-400'}`} />
                          <span className="text-sm font-mono font-bold text-white">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${
                          isBackup
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}>
                          {isBackup ? '.BACKUP' : '.RSC'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-zinc-400">{formatBytes(sizeNum)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-zinc-300">
                          {file['creation-date'] || '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TABELA - ABA HISTORICO (SUPABASE) */}
      {abaAtiva === 'historico' && (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Servidor</th>
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Arquivo</th>
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Data</th>
                <th className="text-left px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 font-mono">Carregando historico...</p>
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <HardDrive className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 font-mono">Nenhum backup registrado</p>
                  </td>
                </tr>
              ) : (
                backups.map(backup => (
                  <tr key={backup.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-sm font-mono font-bold text-white">{backup.server_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${backup.tipo === 'backup' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'}`}>
                        {backup.tipo === 'backup' ? '.BACKUP' : '.RSC'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-zinc-300">{backup.nome_arquivo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-xs font-mono text-zinc-300">
                          {new Date(backup.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <p className="text-[10px] font-mono text-zinc-600">
                          {new Date(backup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                        backup.status === 'concluido' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        backup.status === 'em_andamento' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                        'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {backup.status === 'concluido' ? 'OK' : backup.status === 'em_andamento' ? 'RODANDO' : 'ERRO'}
                      </span>
                      {backup.erro_msg && (
                        <p className="text-[10px] font-mono text-red-400/70 mt-1 max-w-[200px] truncate">{backup.erro_msg}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deletarBackup(backup.id)}
                        disabled={deletando === backup.id}
                        className="p-2 rounded-lg bg-zinc-800/60 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
                        title="Excluir registro"
                      >
                        {deletando === backup.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL NOVO BACKUP */}
      {novoBackupAberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-mono font-black text-white uppercase tracking-wider">
                Novo Backup
              </h2>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3">
              <p className="text-[11px] font-mono text-cyan-400">
                O backup sera criado diretamente no MikroTik via Bridge Service.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Servidor *</label>
                <select
                  value={novoBackup.server_id}
                  onChange={e => setNovoBackup({ ...novoBackup, server_id: e.target.value })}
                  disabled={loadingServidores}
                  className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  {loadingServidores ? (
                    <option>Carregando...</option>
                  ) : servidores.length === 0 ? (
                    <option>Nenhum servidor cadastrado</option>
                  ) : (
                    servidores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Tipo de Backup</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNovoBackup({ ...novoBackup, tipo: 'backup' })}
                    className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${novoBackup.tipo === 'backup' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                  >
                    <HardDrive className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-xs font-mono font-bold uppercase">.backup</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">Binario completo</p>
                    <p className="text-[10px] font-mono text-zinc-600">Restaura tudo</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoBackup({ ...novoBackup, tipo: 'export' })}
                    className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${novoBackup.tipo === 'export' ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                  >
                    <FileArchive className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-xs font-mono font-bold uppercase">.rsc (export)</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-1">Texto legivel</p>
                    <p className="text-[10px] font-mono text-zinc-600">Editavel</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setNovoBackupAberto(false)} className="px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-400 uppercase hover:text-white transition-all cursor-pointer">Cancelar</button>
              <button onClick={criarBackup} disabled={criandoBackup || servidores.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50">
                {criandoBackup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Criar Backup
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
                Config. Backup Auto
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-mono font-bold text-white uppercase">Backup Automatico</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Executar backups automaticamente</p>
                </div>
                <button type="button" onClick={() => setConfig({ ...config, backup_automatico: !config.backup_automatico })} className={`w-11 h-6 rounded-full transition-all cursor-pointer ${config.backup_automatico ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${config.backup_automatico ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Intervalo (horas)</label>
                  <input type="number" value={config.intervalo_horas} onChange={e => setConfig({ ...config, intervalo_horas: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-emerald-400 uppercase mb-1.5">Horario preferido</label>
                  <input type="time" value={config.horario_preferido} onChange={e => setConfig({ ...config, horario_preferido: e.target.value })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Manter ultimos</label>
                  <input type="number" value={config.manter_ultimos} onChange={e => setConfig({ ...config, manter_ultimos: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 uppercase mb-1.5">Tipo padrao</label>
                  <select value={config.tipo_padrao} onChange={e => setConfig({ ...config, tipo_padrao: e.target.value as 'backup' | 'export' | 'ambos' })} className="w-full px-4 py-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                    <option value="backup">.backup (binario)</option>
                    <option value="export">.rsc (export)</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
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