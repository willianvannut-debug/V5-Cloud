'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { bridgeFetch } from '@/lib/bridge'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY)

// Helper: pega empresaId do cookie (server actions suportam cookies())
async function getEmpresaId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('v5_session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return (payload.empresaId as string) || null
  } catch {
    return null
  }
}

interface ServerData {
  name: string
  ip_address: string
  api_port: number
  api_user: string
  api_password: string
  api_ssl: boolean
  description?: string
  location?: string
  tags?: string[]
}

// Listar servidores da empresa logada
export async function getServers() {
  try {
    const empresaId = await getEmpresaId()
    if (!empresaId) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabaseAdmin
      .from('mikrotik_servers')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Buscar servidor por ID (verifica se pertence à empresa)
export async function getServer(serverId: string) {
  try {
    const empresaId = await getEmpresaId()
    if (!empresaId) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabaseAdmin
      .from('mikrotik_servers')
      .select('*')
      .eq('id', serverId)
      .eq('empresa_id', empresaId)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Criar servidor
export async function createServer(empresaId: string, serverData: ServerData) {
  try {
    const sessionEmpresaId = await getEmpresaId()
    if (!sessionEmpresaId) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabaseAdmin
      .from('mikrotik_servers')
      .insert({
        empresa_id: sessionEmpresaId,
        name: serverData.name,
        ip_address: serverData.ip_address,
        api_port: serverData.api_port || 8728,
        api_user: serverData.api_user || 'admin',
        api_password: serverData.api_password,
        api_ssl: serverData.api_ssl || false,
        description: serverData.description || '',
        location: serverData.location || '',
        tags: serverData.tags || [],
        status: 'offline',
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Atualizar servidor
export async function updateServer(serverId: string, serverData: Partial<ServerData>) {
  try {
    const empresaId = await getEmpresaId()
    if (!empresaId) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabaseAdmin
      .from('mikrotik_servers')
      .update({
        ...serverData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serverId)
      .eq('empresa_id', empresaId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Deletar servidor
export async function deleteServer(serverId: string) {
  try {
    const empresaId = await getEmpresaId()
    if (!empresaId) return { success: false, error: 'Não autenticado' }

    const { error } = await supabaseAdmin
      .from('mikrotik_servers')
      .delete()
      .eq('id', serverId)
      .eq('empresa_id', empresaId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Deletar multiplos servidores
export async function bulkDeleteServers(serverIds: string[]) {
  try {
    const empresaId = await getEmpresaId()
    if (!empresaId) return { success: false, error: 'Não autenticado' }

    const { error } = await supabaseAdmin
      .from('mikrotik_servers')
      .delete()
      .in('id', serverIds)
      .eq('empresa_id', empresaId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Testar conexao com MikroTik via Bridge
export async function testServerConnection(serverId: string) {
  try {
    const empresaId = await getEmpresaId()
    if (!empresaId) return { success: false, error: 'Não autenticado' }

    const { data: server, error: dbError } = await supabaseAdmin
      .from('mikrotik_servers')
      .select('*')
      .eq('id', serverId)
      .eq('empresa_id', empresaId)
      .single()

    if (dbError || !server) {
      return { success: false, error: 'Servidor nao encontrado no banco' }
    }

    const result = await bridgeFetch('/servers/test', {
      method: 'POST',
      body: {
        server_id: serverId,
        ip_address: server.ip_address,
        api_port: server.api_port,
        api_user: server.api_user,
        api_password: server.api_password,
        api_ssl: server.api_ssl || false,
      },
    })

    return result
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao testar conexao' }
  }
}

// Sincronizar info do servidor via Bridge
export async function syncServer(serverId: string) {
  try {
    const result = await bridgeFetch('/servers/sync', {
      method: 'POST',
      body: { server_id: serverId },
    })

    return result
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao sincronizar' }
  }
}

// Ativar/desativar servidor
export async function toggleServerStatus(serverId: string, enabled: boolean) {
  try {
    const empresaId = await getEmpresaId()
    if (!empresaId) return { success: false, error: 'Não autenticado' }

    const { data, error } = await supabaseAdmin
      .from('mikrotik_servers')
      .update({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serverId)
      .eq('empresa_id', empresaId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}