import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// GET - Carrega config + clientes bloqueados
export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || sessao.empresaId
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Buscar config de bloqueio
    const { data: config, error: configError } = await supabase
      .from('bloqueio_config')
      .select('*')
      .eq('empresa_id', empresaId)
      .single()

    // Se não tem config ainda, retorna valores padrão
    const configFinal = config || {
      id: '',
      empresa_id: empresaId,
      dias_atraso: 5,
      tipo_bloqueio: 'address-list',
      address_list_name: 'bloqueados',
      notificar_antes: true,
      dias_notificacao: 3,
      mensagem_bloqueio: 'Sua conexão foi suspensa por falta de pagamento. Regularize sua situação para restabelecer o serviço.',
      ativo: true,
    }

    // Por enquanto retorna lista vazia de clientes
    // Quando sincronizar com MikroTik, vai buscar os clientes reais
    return NextResponse.json({
      success: true,
      config: configFinal,
      clientes: [],
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - Salvar configuração de bloqueio
export async function POST(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { empresa_id, dias_atraso, tipo_bloqueio, address_list_name, notificar_antes, dias_notificacao, mensagem_bloqueio, ativo } = body

    // Garantir que operador só altera config da própria empresa
    const empresaIdFinal = sessao.empresaId
    if (empresa_id && empresa_id !== empresaIdFinal) {
      return NextResponse.json({ success: false, error: 'Sem permissão para esta empresa' }, { status: 403 })
    }
    const empresa_id_validado = empresaIdFinal
    if (!empresa_id_validado) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Verifica se já existe config para essa empresa
    const { data: existing } = await supabase
      .from('bloqueio_config')
      .select('id')
      .eq('empresa_id', empresa_id_validado)
      .single()

    let data, error

    if (existing) {
      // Atualiza
      const result = await supabase
        .from('bloqueio_config')
        .update({
          dias_atraso: dias_atraso || 5,
          tipo_bloqueio: tipo_bloqueio || 'address-list',
          address_list_name: address_list_name || 'bloqueados',
          notificar_antes: notificar_antes !== undefined ? notificar_antes : true,
          dias_notificacao: dias_notificacao || 3,
          mensagem_bloqueio: mensagem_bloqueio || '',
          ativo: ativo !== undefined ? ativo : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Cria novo
      const result = await supabase
        .from('bloqueio_config')
        .insert({
          empresa_id: empresa_id_validado,
          dias_atraso: dias_atraso || 5,
          tipo_bloqueio: tipo_bloqueio || 'address-list',
          address_list_name: address_list_name || 'bloqueados',
          notificar_antes: notificar_antes !== undefined ? notificar_antes : true,
          dias_notificacao: dias_notificacao || 3,
          mensagem_bloqueio: mensagem_bloqueio || '',
          ativo: ativo !== undefined ? ativo : true,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) throw error

    // LGPD: registrar alteração de config de bloqueio (ação sobre dados de clientes)
    await supabase.from('logs_sistema').insert([{
      nivel: 'INFO' as const, acao: 'BLOQUEIO_CONFIG_ALTERADA', entidade: 'bloqueio',
      mensagem: `Configuração de bloqueio automático atualizada`,
      operador_id: sessao.operadorId, empresa_id: empresa_id_validado,
      detalhes: { dias_atraso, tipo_bloqueio, ativo },
      timestamp: new Date().toISOString(), criado_em: new Date().toISOString(),
    }]).catch(() => {});

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}