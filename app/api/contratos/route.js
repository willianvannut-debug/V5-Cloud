import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET - Carregar contrato ativo + planos disponiveis + historico
export async function GET(req) {
  try {
    const clienteId = req.nextUrl.searchParams.get('cliente_id')
    const empresaId = req.nextUrl.searchParams.get('empresa_id')
    const tipo = req.nextUrl.searchParams.get('tipo') // 'contrato' | 'historico' | 'planos' | 'tudo'

    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Buscar tudo de uma vez
    if (tipo === 'tudo' && clienteId) {
      const [contratoRes, planosRes, historicoRes] = await Promise.all([
        supabase
          .from('contratos')
          .select('*')
          .eq('cliente_id', clienteId)
          .eq('status', 'ativo')
          .single(),
        supabase
          .from('planos')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('nome'),
        supabase
          .from('contratos')
          .select('*, planos(nome, velocidade, preco)')
          .eq('cliente_id', clienteId)
          .in('status', ['encerrado', 'cancelado'])
          .order('created_at', { ascending: false }),
      ])

      return NextResponse.json({
        success: true,
        contrato: contratoRes.data || null,
        planos: planosRes.data || [],
        historico: historicoRes.data || [],
      })
    }

    // Buscar só planos
    if (tipo === 'planos') {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome')
      if (error) throw error
      return NextResponse.json({ success: true, data })
    }

    // Buscar contrato ativo
    if (tipo === 'contrato' && clienteId) {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('status', 'ativo')
        .single()
      return NextResponse.json({ success: true, data: data || null })
    }

    // Buscar historico
    if (tipo === 'historico' && clienteId) {
      const { data, error } = await supabase
        .from('contratos')
        .select('*, planos(nome, velocidade, preco)')
        .eq('cliente_id', clienteId)
        .in('status', ['encerrado', 'cancelado'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    return NextResponse.json({ success: false, error: 'Parâmetros inválidos' }, { status: 400 })
  } catch (error) {
    console.error('ERRO CONTRATOS POST:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - Vincular plano / Cancelar contrato
export async function POST(req) {
  try {
    const body = await req.json()
    const { acao, empresa_id, cliente_id, plano_id, fidelidade_meses, contrato_id, observacoes } = body

    if (!empresa_id || !cliente_id) {
      return NextResponse.json({ success: false, error: 'empresa_id e cliente_id obrigatórios' }, { status: 400 })
    }

    // VINCULAR / TROCAR PLANO
    if (acao === 'vincular') {
      if (!plano_id) {
        return NextResponse.json({ success: false, error: 'plano_id obrigatório' }, { status: 400 })
      }

      const hoje = new Date()
      const dataInicio = hoje.toISOString().split('T')[0]
      let dataVencimento = null
      if (fidelidade_meses > 0) {
        const venc = new Date(hoje)
        venc.setMonth(venc.getMonth() + fidelidade_meses)
        dataVencimento = venc.toISOString().split('T')[0]
      }

      // Se tem contrato ativo, encerra
      if (contrato_id) {
        await supabase
          .from('contratos')
          .update({
            status: 'encerrado',
            observacoes: observacoes || `Plano alterado em ${hoje.toLocaleDateString('pt-BR')}`,
            updated_at: hoje.toISOString(),
          })
          .eq('id', contrato_id)
      }

      // Cria novo contrato
      const { data, error } = await supabase
        .from('contratos')
        .insert({
          empresa_id,
          cliente_id,
          plano_id,
          data_inicio: dataInicio,
          data_vencimento: dataVencimento,
          fidelidade_meses: fidelidade_meses || 0,
          status: 'ativo',
          observacoes: observacoes || null,
        })
        .select()
        .single()

      if (error) throw error

      // LGPD: registrar alteração de contrato (dado pessoal)
      await supabase.from('logs_sistema').insert([{
        nivel: 'INFO', acao: 'CONTRATO_VINCULADO', entidade: 'contratos',
        mensagem: `Contrato vinculado ao cliente ${cliente_id}`,
        empresa_id, entidade_id: String(cliente_id),
        detalhes: { contrato_id: data?.id, plano_id, fidelidade_meses },
        timestamp: new Date().toISOString(), criado_em: new Date().toISOString(),
      }]).catch(() => {});

      return NextResponse.json({ success: true, data })
    }

    // CANCELAR CONTRATO
    if (acao === 'cancelar') {
      if (!contrato_id) {
        return NextResponse.json({ success: false, error: 'contrato_id obrigatório' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('contratos')
        .update({
          status: 'cancelado',
          observacoes: observacoes || `Cancelado em ${new Date().toLocaleDateString('pt-BR')}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contrato_id)
        .select()
        .single()

      if (error) throw error

      // LGPD: registrar cancelamento de contrato (dado pessoal)
      await supabase.from('logs_sistema').insert([{
        nivel: 'WARNING', acao: 'CONTRATO_CANCELADO', entidade: 'contratos',
        mensagem: `Contrato ${contrato_id} cancelado`,
        empresa_id, entidade_id: String(contrato_id),
        detalhes: { contrato_id, cliente_id, observacoes },
        timestamp: new Date().toISOString(), criado_em: new Date().toISOString(),
      }]).catch(() => {});

      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ success: false, error: 'acao inválida' }, { status: 400 })
  } catch (error) {
    console.error('ERRO CONTRATOS POST:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}