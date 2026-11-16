// ============================================================
// components/mikrotik/servidores/script-dialog.tsx
// V5 FIBRA — Dialog com script de integracao MikroTik
// Gera script personalizado para o cliente colar no MikroTik
// ============================================================
'use client'

import { useState } from 'react'
import { X, Copy, Check, Terminal, Info } from 'lucide-react'
import type { MikrotikServer } from '@/types/mikrotik'

interface ScriptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: MikrotikServer | null
}

export function ScriptDialog({ open, onOpenChange, server }: ScriptDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!open || !server) return null

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/mikrotik`
    : 'https://v5-cloud.vercel.app/api/webhook/mikrotik'

  // Gerar o script MikroTik
  const script = `# ============================================================
# V5 FIBRA - Script de Integracao
# Servidor: ${server.name}
# Gerado automaticamente pelo V5 Cloud
# ============================================================
# INSTRUCOES:
# 1. Abra o terminal do seu MikroTik (New Terminal)
# 2. Cole TODO este script e pressione Enter
# 3. O script vai criar um agendamento automatico
# 4. Os dados serao enviados a cada 5 minutos
# ============================================================

# Criar o script de coleta
/system script add name="v5fibra-sync" policy=read,write,test source={
  :local serverId "${server.id}"
  :local token "${(server as any).integration_token || server.id}"
  :local webhookUrl "${webhookUrl}"

  # Coletar informacoes do sistema
  :local identity [/system identity get name]
  :local version [/system resource get version]
  :local uptime [/system resource get uptime]
  :local cpuLoad [/system resource get cpu-load]
  :local freeMemory [/system resource get free-memory]
  :local totalMemory [/system resource get total-memory]

  # Contar PPPoE ativos
  :local pppoeCount [:len [/ppp active find]]

  # Montar JSON
  :local jsonData "{\\"server_id\\":\\"$serverId\\",\\"token\\":\\"$token\\",\\"identity\\":\\"$identity\\",\\"version\\":\\"$version\\",\\"uptime\\":\\"$uptime\\",\\"cpu_load\\":\\"$cpuLoad\\",\\"memory_free\\":\\"$freeMemory\\",\\"memory_total\\":\\"$totalMemory\\",\\"pppoe_count\\":$pppoeCount}"

  # Enviar para o webhook
  :do {
    /tool fetch url=$webhookUrl mode=https http-method=post http-header-field="Content-Type: application/json" http-data=$jsonData output=none
    :log info "V5 Fibra: Sync OK - $pppoeCount clientes ativos"
  } on-error={
    :log warning "V5 Fibra: Erro ao enviar dados para o webhook"
  }
}

# Criar agendamento para rodar a cada 5 minutos
/system scheduler add name="v5fibra-scheduler" interval=5m on-event="/system script run v5fibra-sync" policy=read,write,test start-time=startup

# Executar uma vez agora para testar
/system script run v5fibra-sync

:log info "V5 Fibra: Integracao configurada com sucesso!"
`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = script
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-mono font-bold text-white">Script de Integracao</h3>
              <p className="text-xs font-mono text-zinc-500">{server.name}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instrucoes */}
        <div className="px-6 pt-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs font-mono text-blue-300 space-y-1">
              <p className="font-bold text-blue-200">Como usar:</p>
              <p>1. Abra o <span className="text-white font-bold">Terminal</span> do MikroTik (New Terminal)</p>
              <p>2. Clique em <span className="text-white font-bold">Copiar Script</span> abaixo</p>
              <p>3. Cole no terminal do MikroTik e pressione <span className="text-white font-bold">Enter</span></p>
              <p>4. O MikroTik vai enviar dados automaticamente a cada 5 minutos</p>
            </div>
          </div>
        </div>

        {/* Script */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-black/60 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">MikroTik Script</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-600'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Script
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono text-emerald-300/80 overflow-x-auto whitespace-pre leading-relaxed">
              {script}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-800">
          <p className="text-[10px] font-mono text-zinc-600">
            Webhook: {webhookUrl}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm font-mono text-zinc-400 hover:text-white hover:border-zinc-600 transition-all cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 rounded-xl text-sm font-mono font-bold text-white transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar Script'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}