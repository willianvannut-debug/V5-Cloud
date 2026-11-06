// ============================================================
// V5 FIBRA — Tipos MikroTik
// types/mikrotik.ts
// ============================================================

export interface MikrotikServer {
  id: string
  empresa_id: string

  // Dados basicos
  name: string
  description: string
  location: string
  tags: string[]

  // Conexao API
  ip_address: string
  api_port: number
  api_user: string
  api_password: string
  api_ssl: boolean

  // Info do roteador
  identity: string | null
  version: string | null
  model: string | null
  uptime: string | null

  // Recursos
  cpu_load: number | null
  memory_used: number | null
  memory_total: number | null
  hdd_used: number | null
  hdd_total: number | null

  // Status
  status: 'online' | 'offline' | 'error'
  enabled: boolean
  last_sync_at: string | null
  last_error: string | null

  // Timestamps
  created_at: string
  updated_at: string
}