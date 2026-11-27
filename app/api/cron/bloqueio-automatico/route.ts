// ================================================================================
// CRON DE BLOQUEIO AUTOMÁTICO - v5-saas
// /api/cron/bloqueio-automatico
//
// Roda diariamente pelo Vercel Cron ou pode ser chamado manualmente.
// Encontra clientes com boletos vencidos há X dias (configurado por empresa)
// e bloqueia no MikroTik adicionando à address-list "bloqueados".
//
// MODO DRY-RUN (para testar sem bloquear ninguém):
//   GET /api/cron/bloqueio-automatico?dry_run=true
//   POST /api/cron/bloqueio-automatico  (cron real)
//
// AUTORIZAÇÃO:
//   Cron do Vercel: header Authorization: Bearer <CRON_SECRET>
//   Teste manual logado: cookie v5_session válido
// ================================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BRIDGE_URL = process.env.MIKROTIK_BRIDGE_URL || ''
const BRIDGE_API_KEY = process.env.MIKROTIK_BRIDGE_API_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

// ============================================
// Verifica autorização (cron ou sessão)
// ============================================
async function autorizar(req: NextRequest): Promise<{ ok: boolean; empresaId?: string; tipo: 'cron' | 'sessao' | 'invalido' }> {
  // 1. Token de cron do Vercel
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return { ok: true, tipo: 'cron' }
  }

  // 2. Sessão do operador logado (para testes manuais)
  const sessao = await getEmpresaDaSessao(req)
  if (sessao?.empresaId) {
    return { ok: true, empresaId: sessao.empresaId, tipo: 'sessao' }
  }

  return { ok: false, tipo: 'invalido' }
}

// ============================================
// Chama a bridge do MikroTik para bloquear IP
// ============================================
async function bloquearNaMikrotik(
  empresaId: string,
  ip: string,
  clienteNome: string,
  addressListName: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!BRIDGE_URL || !BRIDGE_API_KEY) {
    return { ok: false, erro: 'Bridge do MikroTik não configurada (MIKROTIK_BRIDGE_URL / MIKROTIK_BRIDGE_API_KEY)' }
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/address-list/add?empresa_id=${empresaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BRIDGE_API_KEY,
        Authorization: `Bearer ${BRIDGE_API_KEY}`,
      },
      body: JSON.stringify({
        address: ip,
        list: addressListName,
        comment: `bloqueio-automatico: ${clienteNome}`,
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, erro: `Bridge retornou ${res.status}: ${txt}` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, erro: err.message }
  }
}

// ============================================
// Lógica principal de bloqueio
// ============================================
async function executarBloqueio(empresaId: string | null, dryRun: boolean) {
  const agora = new Date()
  const resultados: {
    empresa_id: string
    cliente_id: string
    nome: string
    ip: string
    dias_atraso: number
    acao: 'bloqueado' | 'ja_bloqueado' | 'sem_ip' | 'erro' | 'dry_run'
    detalhe?: string
  }[] = []

  // Buscar todas empresas (ou só a empresa da sessão)
  const queryEmpresas = supabase.from('empresas').select('id')
  if (empresaId) queryEmpresas.eq('id', empresaId)
  const { data: empresas } = await queryEmpresas
  if (!empresas?.length) return { resultados, total_empresas: 0 }

  for (const empresa of empresas) {
    // Buscar config de bloqueio desta empresa
    const { data: config } = await supabase
      .from('bloqueio_config')
      .select('*')
      .eq('empresa_id', empresa.id)
      .maybeSingle()

    // Se não tem config ou está desativado, pula
    if (!config || !config.ativo) continue

    const diasAtraso = config.dias_atraso ?? 5
    const addressListName = config.address_list_name || 'bloqueados'

    // Calcular data limite: boletos vencidos há mais de X dias
    const dataLimite = new Date(agora)
    dataLimite.setDate(dataLimite.getDate() - diasAtraso)
    const dataLimiteStr = dataLimite.toISOString().split('T')[0] // YYYY-MM-DD

    // Buscar boletos vencidos e não pagos desta empresa
    // Juntando com os clientes para pegar IP e status
    const { data: boletosVencidos } = await supabase
      .from('faturas')
      .select(`
        id,
        cliente_id,
        data_vencimento,
        status,
        clientes (
          id,
          nome,
          ip_fixo,
          status,
          login_pppoe,
          empresa_id
        )
      `)
      .eq('empresa_id', empresa.id)
      .eq('status', 'PENDING')
      .lte('data_vencimento', dataLimiteStr)
      .not('clientes', 'is', null)

    for (const boleto of boletosVencidos || []) {
      const cliente = boleto.clientes as any
      if (!cliente || cliente.empresa_id !== empresa.id) continue

      const diasDeAtraso = Math.floor(
        (agora.getTime() - new Date(boleto.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)
      )

      // Já está bloqueado no sistema?
      if (cliente.status === 'bloqueado') {
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo || '-',
          dias_atraso: diasDeAtraso,
          acao: 'ja_bloqueado',
          detalhe: 'Cliente já estava marcado como bloqueado',
        })
        continue
      }

      // Sem IP para bloquear
      if (!cliente.ip_fixo) {
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: '-',
          dias_atraso: diasDeAtraso,
          acao: 'sem_ip',
          detalhe: 'Cliente sem ip_fixo cadastrado — não é possível bloquear',
        })
        continue
      }

      // DRY RUN: só reporta, não executa
      if (dryRun) {
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo,
          dias_atraso: diasDeAtraso,
          acao: 'dry_run',
          detalhe: `Seria bloqueado (${diasDeAtraso} dias em atraso, limite ${diasAtraso} dias)`,
        })
        continue
      }

      // BLOQUEIO REAL: adicionar à address-list do MikroTik
      const { ok, erro } = await bloquearNaMikrotik(empresa.id, cliente.ip_fixo, cliente.nome, addressListName)

      if (ok) {
        // Atualizar status no Supabase
        await supabase.from('clientes').update({ status: 'bloqueado', updated_at: new Date().toISOString() }).eq('id', cliente.id)

        // Log
        await supabase.from('logs_sistema').insert([{
          nivel: 'WARNING',
          acao: 'BLOQUEIO_AUTOMATICO',
          entidade: 'clientes',
          mensagem: `Cliente ${cliente.nome} bloqueado automaticamente por ${diasDeAtraso} dias em atraso`,
          empresa_id: empresa.id,
          detalhes: { cliente_id: cliente.id, ip: cliente.ip_fixo, fatura_id: boleto.id, dias_atraso: diasDeAtraso },
          timestamp: new Date().toISOString(),
          criado_em: new Date().toISOString(),
        }]).catch(() => {})

        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo,
          dias_atraso: diasDeAtraso,
          acao: 'bloqueado',
          detalhe: `Adicionado à address-list "${addressListName}"`,
        })
      } else {
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo,
          dias_atraso: diasDeAtraso,
          acao: 'erro',
          detalhe: erro,
        })
      }
    }
  }

  return { resultados, total_empresas: empresas.length }
}

// ============================================
// GET — Teste manual com dry_run
// ============================================
export async function GET(req: NextRequest) {
  const auth = await autorizar(req)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const dryRun = req.nextUrl.searchParams.get('dry_run') !== 'false'
  const { resultados, total_empresas } = await executarBloqueio(auth.empresaId || null, dryRun)

  const resumo = {
    dry_run: dryRun,
    total_empresas,
    total_clientes_analisados: resultados.length,
    seriam_bloqueados: resultados.filter((r) => r.acao === 'dry_run').length,
    ja_bloqueados: resultados.filter((r) => r.acao === 'ja_bloqueado').length,
    sem_ip: resultados.filter((r) => r.acao === 'sem_ip').length,
    bloqueados_agora: resultados.filter((r) => r.acao === 'bloqueado').length,
    erros: resultados.filter((r) => r.acao === 'erro').length,
  }

  return NextResponse.json({ ok: true, resumo, clientes: resultados })
}

// ============================================
// POST — Execução real (Vercel Cron)
// ============================================
export async function POST(req: NextRequest) {
  const auth = await autorizar(req)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { resultados, total_empresas } = await executarBloqueio(auth.empresaId || null, false)

  const resumo = {
    dry_run: false,
    total_empresas,
    bloqueados: resultados.filter((r) => r.acao === 'bloqueado').length,
    ja_bloqueados: resultados.filter((r) => r.acao === 'ja_bloqueado').length,
    sem_ip: resultados.filter((r) => r.acao === 'sem_ip').length,
    erros: resultados.filter((r) => r.acao === 'erro').length,
  }

  return NextResponse.json({ ok: true, resumo, clientes: resultados })
}
