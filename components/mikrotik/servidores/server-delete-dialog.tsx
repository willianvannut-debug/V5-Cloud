// ============================================================
// V5 FIBRA — Modal de Confirmacao para Excluir Servidor
// Estilo: dark neon V5 Cloud
// ============================================================
'use client'

import { useTransition } from 'react'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { deleteServer } from '@/lib/actions/servers'
import type { MikrotikServer } from '@/types/mikrotik'

interface ServerDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: MikrotikServer | null
  onSuccess?: () => void
}

export function ServerDeleteDialog({
  open,
  onOpenChange,
  server,
  onSuccess,
}: ServerDeleteDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!server) return

    startTransition(async () => {
      try {
        const result = await deleteServer(server.id)
        if (result.success) {
          toast.success('Servidor removido com sucesso')
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(result.error || 'Erro ao remover servidor')
        }
      } catch {
        toast.error('Erro inesperado ao remover')
      }
    })
  }

  if (!open || !server) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-black/40">
          <h3 className="text-xs uppercase font-mono tracking-wider text-red-400 font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Confirmar Exclusao
          </h3>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-200 font-mono">
                Deseja remover o servidor <strong className="text-white">{server.name}</strong>?
              </p>
              <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                IP: {server.ip_address} — Esta acao nao pode ser desfeita. Todos os dados de conexao, logs e configuracoes associadas serao perdidos.
              </p>
            </div>
          </div>

          {/* Botoes */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-mono uppercase font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-400 text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Excluir Servidor
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}