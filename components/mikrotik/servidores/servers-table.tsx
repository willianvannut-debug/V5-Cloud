// ============================================================
// V5 FIBRA — Tabela de Servidores MikroTik
// Estilo: dark neon V5 Cloud (sem shadcn — HTML puro)
// ============================================================
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Pencil,
  Trash2,
  Plug,
  RefreshCw,
  Loader2,
  Server,
  Plus,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

import { ServerStatusBadge } from './server-status-badge'
import { ServerFormDialog } from './server-form-dialog'
import { ServerDeleteDialog } from './server-delete-dialog'
import {
  getServers,
  testServerConnection,
  syncServer,
} from '@/lib/actions/servers'
import type { MikrotikServer } from '@/types/mikrotik'

// Formata data para exibicao
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const date = new Date(dateStr)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ServersTable() {
  const [servers, setServers] = useState<MikrotikServer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialogs
  const [formOpen, setFormOpen] = useState(false)
  const [editServer, setEditServer] = useState<MikrotikServer | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MikrotikServer | null>(null)

  // Action states (por servidor)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  // Menu de acoes aberto
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carregar servidores
  const loadServers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getServers()
      if (result.success) {
        setServers(result.data as MikrotikServer[])
      } else {
        toast.error(result.error || 'Erro ao carregar servidores')
      }
    } catch {
      toast.error('Erro ao carregar servidores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadServers()
  }, [loadServers])

  // Filtrar por busca
  const filtered = servers.filter((s) => {
    const term = searchTerm.toLowerCase()
    return (
      s.name.toLowerCase().includes(term) ||
      s.ip_address.toLowerCase().includes(term) ||
      (s.identity || '').toLowerCase().includes(term) ||
      (s.version || '').toLowerCase().includes(term)
    )
  })

  // Testar conexao de um servidor
  async function handleTest(server: MikrotikServer) {
    setTestingId(server.id)
    try {
      const result = await testServerConnection(server.id)
      if (result.success) {
        const info = result.data as Record<string, string | null>
        toast.success(
          `Conectado! ${info.identity || server.name} - v${info.version || '?'}`
        )
      } else {
        toast.error(`Falha: ${result.error}`)
      }
      await loadServers()
    } catch {
      toast.error('Erro ao testar conexao')
    } finally {
      setTestingId(null)
    }
  }

  // Sincronizar servidor
  async function handleSync(server: MikrotikServer) {
    setSyncingId(server.id)
    try {
      const result = await syncServer(server.id)
      if (result.success) {
        toast.success(`${server.name} sincronizado!`)
      } else {
        toast.error(`Falha: ${result.error}`)
      }
      await loadServers()
    } catch {
      toast.error('Erro ao sincronizar')
    } finally {
      setSyncingId(null)
    }
  }

  // Abrir edicao
  function handleEdit(server: MikrotikServer) {
    setEditServer(server)
    setFormOpen(true)
    setMenuOpenId(null)
  }

  // Abrir exclusao
  function handleDeleteClick(server: MikrotikServer) {
    setDeleteTarget(server)
    setDeleteOpen(true)
    setMenuOpenId(null)
  }

  return (
    <div className="space-y-4">
      {/* Barra superior: busca + botao novo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar servidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
          />
        </div>

        <button
          onClick={() => {
            setEditServer(null)
            setFormOpen(true)
          }}
          className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Servidor
        </button>
      </div>

      {/* Tabela */}
      <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">IP / Porta</th>
                <th className="p-4 text-left">Identidade</th>
                <th className="p-4 text-left">Versao</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Ultima Sinc.</th>
                <th className="p-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                      <span>Carregando servidores...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                      <Server className="h-8 w-8 opacity-40" />
                      {searchTerm ? (
                        <p className="text-xs font-mono">Nenhum servidor encontrado para &quot;{searchTerm}&quot;</p>
                      ) : (
                        <>
                          <p className="text-xs font-mono">Nenhum servidor cadastrado</p>
                          <button
                            onClick={() => {
                              setEditServer(null)
                              setFormOpen(true)
                            }}
                            className="px-4 py-2 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer font-mono text-xs uppercase font-bold flex items-center gap-2"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Adicionar primeiro servidor
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((server) => (
                  <tr key={server.id} className="hover:bg-zinc-900/30 transition-colors">
                    {/* Nome */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-emerald-500/60 shrink-0" />
                        <div>
                          <p className="text-white font-bold">{server.name}</p>
                          {server.model && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">{server.model}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* IP:Porta */}
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-lg bg-black/40 text-zinc-300 border border-zinc-800">
                        {server.ip_address}:{server.api_port}
                      </span>
                      {server.api_ssl && (
                        <span className="ml-1.5 text-[10px] text-emerald-400 font-bold uppercase">SSL</span>
                      )}
                    </td>

                    {/* Identidade */}
                    <td className="p-4 text-zinc-400">
                      {server.identity || '—'}
                    </td>

                    {/* Versao */}
                    <td className="p-4 text-zinc-400">
                      {server.version || '—'}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <ServerStatusBadge status={server.status} />
                    </td>

                    {/* Ultima Sincronizacao */}
                    <td className="p-4 text-zinc-500">
                      {formatDate(server.last_sync_at)}
                    </td>

                    {/* Acoes */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Testar Conexao */}
                        <button
                          onClick={() => handleTest(server)}
                          disabled={testingId === server.id}
                          title="Testar Conexao"
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {testingId === server.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plug className="h-4 w-4" />
                          )}
                        </button>

                        {/* Sincronizar */}
                        <button
                          onClick={() => handleSync(server)}
                          disabled={syncingId === server.id}
                          title="Sincronizar"
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {syncingId === server.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => handleEdit(server)}
                          title="Editar"
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => handleDeleteClick(server)}
                          title="Excluir"
                          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contagem */}
      {!loading && servers.length > 0 && (
        <p className="text-[11px] text-zinc-500 font-mono">
          {filtered.length} de {servers.length} servidor{servers.length !== 1 ? 'es' : ''}
        </p>
      )}

      {/* Dialogs */}
      <ServerFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditServer(null)
        }}
        server={editServer}
        onSuccess={loadServers}
      />

      <ServerDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        server={deleteTarget}
        onSuccess={loadServers}
      />
    </div>
  )
}