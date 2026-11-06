const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL
const BRIDGE_API_KEY = process.env.MIKROTIK_BRIDGE_API_KEY

if (!BRIDGE_URL) {
  console.warn('MIKROTIK_BRIDGE_URL nao configurada')
}

interface BridgeResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export async function bridgeFetch<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
  } = {}
): Promise<BridgeResponse<T>> {
  if (!BRIDGE_URL || !BRIDGE_API_KEY) {
    return { success: false, error: 'Bridge nao configurada' }
  }

  try {
    const url = `${BRIDGE_URL}/api${path}`
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-api-key': BRIDGE_API_KEY,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(30000),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Erro ${res.status}`,
      }
    }

    return data
  } catch (error: any) {
    console.error(`[Bridge] Erro em ${path}:`, error.message)
    return {
      success: false,
      error: error.message || 'Erro de conexao com o Bridge',
    }
  }
}

// Testar conexao com servidor MikroTik
export async function testServer(serverId: string) {
  return bridgeFetch('/servers/test', {
    method: 'POST',
    body: { serverId },
  })
}

// Sincronizar info do servidor
export async function syncServer(serverId: string) {
  return bridgeFetch('/servers/sync', {
    method: 'POST',
    body: { serverId },
  })
}

// Listar perfis PPPoE
export async function getPPPoEProfiles(serverId: string) {
  return bridgeFetch(`/pppoe/profiles/${serverId}`)
}

// Listar conexoes ativas PPPoE
export async function getActivePPPoE(serverId: string) {
  return bridgeFetch(`/pppoe/active/${serverId}`)
}

// Health check do Bridge
export async function checkBridgeHealth() {
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}