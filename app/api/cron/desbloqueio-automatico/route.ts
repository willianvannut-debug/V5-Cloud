// ================================================================================
// CRON DE DESBLOQUEIO AUTOMÁTICO - v5-saas
// /api/cron/desbloqueio-automatico
//
// Roda diariamente pelo Vercel Cron ou pode ser chamado manualmente.
// Encontra clientes bloqueados que pagaram a fatura e remove da address-list.
//
// MODO DRY-RUN (para simular sem desbloquear ninguém):
//   GET /api/cron/desbloqueio-automatico?dry_run=true
//   POST /api/cron/desbloqueio-automatico  (cron real)
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

// ============================================================
// Autorização (cron ou sessão logada)
// ============================================================
async function autorizar(req: NextRequest): Promise<{ ok: boolean; empresaId?: string }> {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return { ok: true }
  }
  const sessao = await getEmpresaDaSessao(req)
  if (sessao?.empresaId) return { ok: true, empresaId: sessao.empresaId }
  return { ok: false }
}

// ============================================================
// Remove IP da address-list via bridge MikroTik
// ============================================================
async function desbloquearNaMikrotik(
  empresaId: string,
  ip: string,
  addressListName: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!BRIDGE_URL || !BRIDGE_API_KEY) {
    return { ok: false, erro: 'Bridge do MikroTik não configurada' }
  }
  try {
    // 1. Buscar o ID do item na address-list pelo IP
    const listRes = await fetch(
      `${BRIDGE_URL}/address-list/find?empresa_id=${empresaId}&address=${ip}&list=${addressListName}`,
      { headers: { 'X-API-Key': BRIDGE_API_KEY, Authorization: `Bearer ${BRIDGE_API_KEY}` } }
    )
    const listData = await listRes.json()
    const itemId = listData?.id || listData?.['.id']
    if (!itemId) return { ok: false, erro: `IP ${ip} não encontrado na address-list "${addressListName}"` }

    // 2. Remover da lista
    const removeRes = await fetch(`${BRIDGE_URL}/address-list/remove?empresa_id=${empresaId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BRIDGE_API_KEY,
        Authorization: `Bearer ${BRIDGE_API_KEY}`,
      },
      body: JSON.stringify({ id: itemId }),
    })
    if (!removeRes.ok) {
      const txt = await removeRes.text()
      return { ok: false, erro: `Bridge retornou ${removeRes.status}: ${txt}` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, erro: err.message }
  }
}

// ============================================================
// Lógica principal de desbloqueio
// ============================================================
async function executarDesbloqueio(empresaId: string | null, dryRun: boolean) {
  const resultados: {
    empresa_id: string
    cliente_id: string
    nome: string
    ip: string
    acao: 'desbloqueado' | 'ja_ativo' | 'sem_ip' | 'fatura_pendente' | 'erro' | 'dry_run'
    detalhe?: string
  }[] = []

  // Buscar empresas (ou só a da sessão)
  const queryEmpresas = supabase.from('empresas').select('id')
  if (empresaId) queryEmpresas.eq('id', empresaId)
  const { data: empresas } = await queryEmpresas
  if (!empresas?.length) return { resultados, total_empresas: 0 }

  for (const empresa of empresas) {
    // Buscar config de desbloqueio desta empresa
    const { data: config } = await supabase
      .from('desbloqueio_config')
      .select('*')
      .eq('empresa_id', empresa.id)
      .maybeSingle()

    if (!config || !config.ativo || !config.desbloqueio_automatico) continue

    const addressListName = 'bloqueados'

    // Buscar clientes com status 'bloqueado' no Supabase
    const { data: clientesBloqueados } = await supabase
      .from('clientes')
      .select('id, nome, ip_fixo, status')
      .eq('empresa_id', empresa.id)
      .eq('status', 'bloqueado')

    for (const cliente of clientesBloqueados || []) {
      if (!cliente.ip_fixo) {
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: '-',
          acao: 'sem_ip',
          detalhe: 'Cliente sem ip_fixo — não é possível verificar',
        })
        continue
      }

      // Verificar se tem fatura paga recentemente (status RECEIVED)
      const { data: faturasPagas } = await supabase
        .from('faturas')
        .select('id, data_pagamento, status')
        .eq('cliente_id', cliente.id)
        .eq('empresa_id', empresa.id)
        .eq('status', 'RECEIVED')
        .order('data_pagamento', { ascending: false })
        .limit(1)

      if (!faturasPagas?.length) {
        // Sem fatura paga — mantém bloqueado
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo,
          acao: 'fatura_pendente',
          detalhe: 'Nenhuma fatura paga encontrada — mantém bloqueado',
        })
        continue
      }

      // Tem fatura paga — pode desbloquear!
      if (dryRun) {
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo,
          acao: 'dry_run',
          detalhe: `Seria desbloqueado (fatura paga em ${faturasPagas[0].data_pagamento || 'data desconhecida'})`,
        })
        continue
      }

      // DESBLOQUEIO REAL: remover da address-list
      const { ok, erro } = await desbloquearNaMikrotik(empresa.id, cliente.ip_fixo, addressListName)

      if (ok) {
        // Atualizar status no Supabase
        await supabase
          .from('clientes')
          .update({ status: 'ativo', updated_at: new Date().toISOString() })
          .eq('id', cliente.id)

        // Log
        await supabase.from('logs_sistema').insert([{
          nivel: 'SUCCESS',
          acao: 'DESBLOQUEIO_AUTOMATICO',
          entidade: 'clientes',
          mensagem: `Cliente ${cliente.nome} desbloqueado automaticamente após confirmação de pagamento`,
          empresa_id: empresa.id,
          detalhes: { cliente_id: cliente.id, ip: cliente.ip_fixo, fatura_id: faturasPagas[0].id },
          timestamp: new Date().toISOString(),
          criado_em: new Date().toISOString(),
        }]).catch(() => {})

        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo,
          acao: 'desbloqueado',
          detalhe: `Removido da address-list "${addressListName}"`,
        })
      } else {
        resultados.push({
          empresa_id: empresa.id,
          cliente_id: cliente.id,
          nome: cliente.nome,
          ip: cliente.ip_fixo,
          acao: 'erro',
          detalhe: erro,
        })
      }
    }
  }

  return { resultados, total_empresas: empresas?.length ?? 0 }
}

// ============================================================
// GET — Simulação (dry_run)
// ============================================================
export async function GET(req: NextRequest) {
  const auth = await autorizar(req)
  if (!auth.ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const dryRun = req.nextUrl.searchParams.get('dry_run') !== 'false'
  const { resultados, total_empresas } = await executarDesbloqueio(auth.empresaId || null, dryRun)

  return NextResponse.json({
    ok: true,
    resumo: {
      dry_run: dryRun,
      total_empresas,
      total_analisados: resultados.length,
      seriam_desbloqueados: resultados.filter(r => r.acao === 'dry_run').length,
      fatura_pendente: resultados.filter(r => r.acao === 'fatura_pendente').length,
      sem_ip: resultados.filter(r => r.acao === 'sem_ip').length,
      desbloqueados: resultados.filter(r => r.acao === 'desbloqueado').length,
      erros: resultados.filter(r => r.acao === 'erro').length,
    },
    clientes: resultados,
  })
}

// ============================================================
// POST — Execução real (Vercel Cron)
// ============================================================
export async function POST(req: NextRequest) {
  const auth = await autorizar(req)
  if (!auth.ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { resultados, total_empresas } = await executarDesbloqueio(auth.empresaId || null, false)

  return NextResponse.json({
    ok: true,
    resumo: {
      dry_run: false,
      total_empresas,
      desbloqueados: resultados.filter(r => r.acao === 'desbloqueado').length,
      fatura_pendente: resultados.filter(r => r.acao === 'fatura_pendente').length,
      sem_ip: resultados.filter(r => r.acao === 'sem_ip').length,
      erros: resultados.filter(r => r.acao === 'erro').length,
    },
    clientes: resultados,
  })
}
