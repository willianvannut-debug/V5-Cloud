// ============================================================
// V5 FIBRA — Modal de Criar/Editar Servidor MikroTik
// Estilo: dark neon V5 Cloud (modal fullscreen overlay)
// ============================================================
'use client'

import { useState, useTransition } from 'react'
import {
  Loader2,
  Server,
  Plug,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { createServer, updateServer } from '@/lib/actions/servers'
import { useAuth } from '@/context/AuthContext'
import type { MikrotikServer } from '@/types/mikrotik'

interface ServerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server?: MikrotikServer | null
  onSuccess?: () => void
}

export function ServerFormDialog({
  open,
  onOpenChange,
  server,
  onSuccess,
}: ServerFormDialogProps) {
  const isEdit = !!server
  const { operador } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [testInfo, setTestInfo] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: server?.name || '',
    ip_address: server?.ip_address || '',
    api_port: server?.api_port || 8728,
    api_ssl: server?.api_ssl || false,
    api_user: server?.api_user || 'admin',
    api_password: '',
    notes: server?.notes || '',
  })

  function handleChange(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  async function handleTestConnection() {
    if (!form.ip_address || !form.api_user) {
      toast.error('Preencha IP e usuario antes de testar')
      return
    }
    if (!form.api_password && !isEdit) {
      toast.error('Informe a senha para testar')
      return
    }

    setIsTesting(true)
    setTestResult(null)
    setTestInfo(null)

    try {
      const res = await fetch('/api/mikrotik/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.ip_address,
          port: form.api_port,
          user: form.api_user,
          password: form.api_password,
          ssl: form.api_ssl,
        }),
      })

      const result = await res.json()

      if (result.success && result.data) {
        setTestResult('success')
        const info = result.data as Record<string, string | null>
        setTestInfo(`${info.identity || 'MikroTik'} — v${info.version || '?'} — ${info.model || '?'}`)
        toast.success('Conexao bem sucedida!')
      } else {
        setTestResult('error')
        setTestInfo(result.error || 'Falha na conexao')
        toast.error(result.error || 'Falha ao conectar')
      }
    } catch {
      setTestResult('error')
      setTestInfo('Erro de rede')
      toast.error('Erro ao testar conexao')
    } finally {
      setIsTesting(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!operador?.empresaId) {
      toast.error('Erro: empresa nao identificada. Faca login novamente.')
      return
    }

    startTransition(async () => {
      try {
        let result

        if (isEdit && server) {
          const updateData: Record<string, unknown> = { ...form }
          if (!form.api_password) delete updateData.api_password
          result = await updateServer(server.id, updateData)
        } else {
          result = await createServer(operador.empresaId, {
            name: form.name,
            ip_address: form.ip_address,
            api_port: form.api_port,
            api_user: form.api_user,
            api_password: form.api_password,
            api_ssl: form.api_ssl,
            description: form.notes,
          })
        }

        if (result.success) {
          toast.success(isEdit ? 'Servidor atualizado!' : 'Servidor adicionado!')
          onOpenChange(false)
          onSuccess?.()
          setForm({ name: '', ip_address: '', api_port: 8728, api_ssl: false, api_user: 'admin', api_password: '', notes: '' })
          setTestResult(null)
          setTestInfo(null)
        } else {
          toast.error(result.error || 'Erro ao salvar')
        }
      } catch {
        toast.error('Erro inesperado ao salvar')
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/40">
          <h3 className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-2">
            <Server className="w-4 h-4" />
            {isEdit ? 'Editar Servidor MikroTik' : 'Novo Servidor MikroTik'}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> Nome do Servidor *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: MK-Central-01"
              required
              className="w-full bg-black/50 border border-emerald-500/50 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* IP + Porta */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8 space-y-1.5">
              <label className="text-xs font-mono uppercase text-emerald-400 font-bold">IP / Hostname *</label>
              <input
                type="text"
                value={form.ip_address}
                onChange={(e) => handleChange('ip_address', e.target.value)}
                placeholder="192.168.1.1"
                required
                className="w-full bg-black/50 border border-emerald-500/50 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="col-span-4 space-y-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">Porta API</label>
              <input
                type="number"
                value={form.api_port}
                onChange={(e) => handleChange('api_port', Number(e.target.value))}
                min={1}
                max={65535}
                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Usuario + Senha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-emerald-400 font-bold">Usuario API *</label>
              <input
                type="text"
                value={form.api_user}
                onChange={(e) => handleChange('api_user', e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-black/50 border border-emerald-500/50 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">
                Senha API {isEdit ? '(em branco = manter)' : '*'}
              </label>
              <input
                type="password"
                value={form.api_password}
                onChange={(e) => handleChange('api_password', e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Senha'}
                required={!isEdit}
                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* SSL Toggle */}
          <div className="p-3 bg-black/40 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-zinc-300 font-bold uppercase block">Conexao SSL (porta 8729)</span>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Use SSL para conexoes seguras pela internet</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('api_ssl', !form.api_ssl)}
              className={`w-11 h-6 rounded-full transition-all cursor-pointer flex items-center px-0.5 ${
                form.api_ssl
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-zinc-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.api_ssl ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-zinc-400">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Localizacao, funcao, observacoes..."
              rows={2}
              className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs font-mono ${
              testResult === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}>
              {testResult === 'success' ? (
                <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 w-4 h-4 shrink-0" />
              )}
              <span>{testInfo}</span>
            </div>
          )}

          {/* Botoes */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-mono uppercase font-bold cursor-pointer transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isPending}
              className="px-4 py-2.5 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer font-mono text-xs uppercase font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5 text-emerald-400" />}
              Testar Conexao
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Salvar Alteracoes' : 'Adicionar Servidor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}