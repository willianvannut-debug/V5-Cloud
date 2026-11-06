// ============================================================
// V5 FIBRA — Server Actions para Servidores MikroTik
// Next.js App Router — Server Actions (use server)
// ============================================================
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  serverCreateSchema,
  serverUpdateSchema,
  type ServerCreateInput,
  type ServerUpdateInput,
} from '@/lib/validations/server-schemas'
import {
  testMkConnection,
  syncMkServer,
  checkBridgeHealth,
} from '@/lib/mikrotik-bridge'

// Tipo para respostas padronizadas
interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ========================
// LISTAR SERVIDORES
// ========================
export async function getServers(): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('mikrotik_servers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    // Nunca retornar a senha para o frontend
    const sanitized = (data || []).map((s) => ({
      ...s,
      api_password: '••••••••',
    }))

    return { success: true, data: sanitized }
  } catch (err) {
    return { success: false, error: 'Erro ao buscar servidores' }
  }
}

// ========================
// BUSCAR SERVIDOR POR ID
// ========================
export async function getServerById(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('mikrotik_servers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: { ...data, api_password: '••••••••' },
    }
  } catch (err) {
    return { success: false, error: 'Erro ao buscar servidor' }
  }
}

// ========================
// CRIAR SERVIDOR
// ========================
export async function createServer(input: ServerCreateInput): Promise<ActionResult> {
  try {
    // Validar dados
    const parsed = serverCreateSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return { success: false, error: firstError.message }
    }

    const supabase = await createClient()

    // Verificar se ja existe servidor com mesmo IP
    const { data: existing } = await supabase
      .from('mikrotik_servers')
      .select('id')
      .eq('ip_address', parsed.data.ip_address)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Ja existe um servidor com este IP' }
    }

    // Inserir no banco
    const { data, error } = await supabase
      .from('mikrotik_servers')
      .insert({
        name: parsed.data.name,
        ip_address: parsed.data.ip_address,
        api_port: parsed.data.api_port,
        api_ssl: parsed.data.api_ssl,
        api_user: parsed.data.api_user,
        api_password: parsed.data.api_password,
        notes: parsed.data.notes || null,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/mikrotik/servidores')
    return { success: true, data: { ...data, api_password: '••••••••' } }
  } catch (err) {
    return { success: false, error: 'Erro ao criar servidor' }
  }
}

// ========================
// ATUALIZAR SERVIDOR
// ========================
export async function updateServer(
  id: string,
  input: ServerUpdateInput
): Promise<ActionResult> {
  try {
    const parsed = serverUpdateSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]
      return { success: false, error: firstError.message }
    }

    const supabase = await createClient()

    // Se mudou o IP, verificar duplicado
    if (parsed.data.ip_address) {
      const { data: existing } = await supabase
        .from('mikrotik_servers')
        .select('id')
        .eq('ip_address', parsed.data.ip_address)
        .neq('id', id)
        .maybeSingle()

      if (existing) {
        return { success: false, error: 'Ja existe um servidor com este IP' }
      }
    }

    // Montar objeto de update (remover campos undefined)
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updateData[key] = value
      }
    }

    const { data, error } = await supabase
      .from('mikrotik_servers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/mikrotik/servidores')
    return { success: true, data: { ...data, api_password: '••••••••' } }
  } catch (err) {
    return { success: false, error: 'Erro ao atualizar servidor' }
  }
}

// ========================
// EXCLUIR SERVIDOR
// ========================
export async function deleteServer(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('mikrotik_servers')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/mikrotik/servidores')
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Erro ao excluir servidor' }
  }
}

// ========================
// TESTAR CONEXAO
// ========================
export async function testConnection(params: {
  host: string
  port: number
  user: string
  password: string
  ssl?: boolean
}): Promise<ActionResult> {
  try {
    const result = await testMkConnection(params)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Falha ao conectar no MikroTik',
      }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, error: 'Erro ao testar conexao' }
  }
}

// ========================
// TESTAR CONEXAO DE SERVIDOR EXISTENTE
// ========================
export async function testServerConnection(serverId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Buscar dados do servidor (incluindo senha)
    const { data: server, error } = await supabase
      .from('mikrotik_servers')
      .select('*')
      .eq('id', serverId)
      .single()

    if (error || !server) {
      return { success: false, error: 'Servidor nao encontrado' }
    }

    const result = await testMkConnection({
      host: server.ip_address,
      port: server.api_port,
      user: server.api_user,
      password: server.api_password,
      ssl: server.api_ssl,
    })

    if (!result.success) {
      // Marcar como inalcancavel
      await supabase
        .from('mikrotik_servers')
        .update({ status: 'unreachable' })
        .eq('id', serverId)

      revalidatePath('/mikrotik/servidores')
      return {
        success: false,
        error: result.error || 'Falha ao conectar no MikroTik',
      }
    }

    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, error: 'Erro ao testar conexao' }
  }
}

// ========================
// SINCRONIZAR SERVIDOR
// ========================
export async function syncServer(serverId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Buscar tenant_id do usuario
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Nao autenticado' }
    }

    const tenantId = user.app_metadata?.tenant_id
    if (!tenantId) {
      return { success: false, error: 'Tenant nao configurado' }
    }

    const result = await syncMkServer(serverId, tenantId)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Falha ao sincronizar',
      }
    }

    revalidatePath('/mikrotik/servidores')
    return { success: true, data: result.data }
  } catch (err) {
    return { success: false, error: 'Erro ao sincronizar servidor' }
  }
}

// ========================
// VERIFICAR BRIDGE
// ========================
export async function checkBridge(): Promise<ActionResult<boolean>> {
  try {
    const healthy = await checkBridgeHealth()
    return { success: true, data: healthy }
  } catch {
    return { success: true, data: false }
  }
}