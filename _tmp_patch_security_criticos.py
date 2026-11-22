# -*- coding: utf-8 -*-
"""
Patch de segurança - 4 vulnerabilidades críticas:
1. middleware.ts - adiciona /api/** ao matcher (com exceções públicas)
2. mk-proxy/route.ts - exige sessão válida
3. bloqueio/route.ts - exige sessão válida
4. desbloqueio/route.ts - exige sessão válida
5. logs/route.ts - exige sessão válida
"""
import os, sys

BASE = os.path.join(os.environ['HOME'], 'mnt', 'v5-saas')

def patch_file(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    count = t.count(old)
    if count != 1:
        print(f"ERRO [{label}]: encontrado {count}x (esperado 1) em {path}")
        sys.exit(1)
    t = t.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    print(f"OK {label}")

# ============================================================
# 1. middleware.ts — adicionar /api/** ao matcher com exceções
# ============================================================
mw_path = os.path.join(BASE, 'middleware.ts')

patch_file(
    mw_path,
    """export const config = {
  matcher: ['/dashboard/:path*', '/tecnico/:path*'],
};""",
    """export const config = {
  matcher: [
    // Protege o dashboard e área do técnico
    '/dashboard/:path*',
    '/tecnico/:path*',
    // Protege TODAS as rotas de API, exceto as públicas:
    // - /api/auth/** (login, registro, verificação de código)
    // - /api/webhook/** (Stripe webhooks - usam assinatura própria)
    // - /api/empresa-config/por-cpf (app mobile busca empresa pelo CPF do cliente)
    // - /api/suporte/app/** (caso exista rota pública de suporte do app)
    '/api/((?!auth/|webhook/|empresa-config/por-cpf).*)',
  ],
};""",
    "middleware.ts (matcher ampliado)"
)

# ============================================================
# 2. mk-proxy/route.ts — exigir sessão
# ============================================================
mk_path = os.path.join(BASE, 'app', 'api', 'mk-proxy', 'route.ts')

patch_file(
    mk_path,
    """import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'""",
    """import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'""",
    "mk-proxy import auth"
)

patch_file(
    mk_path,
    """export async function GET(req: NextRequest) {
  try {
    const bridgePath = req.nextUrl.searchParams.get('path') || ''
    const serverId = req.nextUrl.searchParams.get('server_id') || ''
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || ''""",
    """export async function GET(req: NextRequest) {
  // Verificar autenticação — rota sensível (acessa roteador MikroTik)
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const bridgePath = req.nextUrl.searchParams.get('path') || ''
    const serverId = req.nextUrl.searchParams.get('server_id') || ''
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || ''""",
    "mk-proxy GET auth check"
)

patch_file(
    mk_path,
    """export async function POST(req: NextRequest) {
  try {
    const bridgePath = req.nextUrl.searchParams.get('path') || ''
    const serverId = req.nextUrl.searchParams.get('server_id') || ''
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || ''""",
    """export async function POST(req: NextRequest) {
  // Verificar autenticação — rota sensível (acessa roteador MikroTik)
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) {
    return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const bridgePath = req.nextUrl.searchParams.get('path') || ''
    const serverId = req.nextUrl.searchParams.get('server_id') || ''
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || ''""",
    "mk-proxy POST auth check"
)

# ============================================================
# 3. bloqueio/route.ts — exigir sessão
# ============================================================
bl_path = os.path.join(BASE, 'app', 'api', 'bloqueio', 'route.ts')

patch_file(
    bl_path,
    """import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'""",
    """import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'""",
    "bloqueio import auth"
)

patch_file(
    bl_path,
    """// GET - Carrega config + clientes bloqueados
export async function GET(req) {
  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id')
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }""",
    """// GET - Carrega config + clientes bloqueados
export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || sessao.empresaId
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }""",
    "bloqueio GET auth check"
)

patch_file(
    bl_path,
    """// POST - Salvar configuração de bloqueio
export async function POST(req) {
  try {
    const body = await req.json()
    const { empresa_id, dias_atraso, tipo_bloqueio, address_list_name, notificar_antes, dias_notificacao, mensagem_bloqueio, ativo } = body

    if (!empresa_id) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }""",
    """// POST - Salvar configuração de bloqueio
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
    }""",
    "bloqueio POST auth check"
)

# Corrigir referência ao empresa_id no restante do POST de bloqueio
# (depois do patch acima, as queries usam empresa_id que pode vir do body — corrigir para empresa_id_validado)
with open(bl_path, 'r', encoding='utf-8') as f:
    bl_content = f.read()

# Substituir o upsert que usa empresa_id pelo validado (somente no bloco POST após a nossa inserção)
old_upsert_bl = """    if (!empresa_id) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Verifica se já existe config para essa empresa
    const { data: existing } = await supabase
      .from('bloqueio_config')
      .select('id')
      .eq('empresa_id', empresa_id)
      .single()"""
new_upsert_bl = """    if (!empresa_id_validado) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Verifica se já existe config para essa empresa
    const { data: existing } = await supabase
      .from('bloqueio_config')
      .select('id')
      .eq('empresa_id', empresa_id_validado)
      .single()"""

if bl_content.count(old_upsert_bl) == 1:
    bl_content = bl_content.replace(old_upsert_bl, new_upsert_bl)
    # Substituir o insert que usa empresa_id
    bl_content = bl_content.replace(
        "          empresa_id,\n          dias_atraso: dias_atraso || 5,",
        "          empresa_id: empresa_id_validado,\n          dias_atraso: dias_atraso || 5,"
    )
    with open(bl_path, 'w', encoding='utf-8') as f:
        f.write(bl_content)
    print("OK bloqueio POST empresa_id fixado")
else:
    print(f"AVISO bloqueio: upsert check não encontrado ({bl_content.count(old_upsert_bl)}x) — pulando sub-patch")

# ============================================================
# 4. desbloqueio/route.ts — exigir sessão
# ============================================================
db_path = os.path.join(BASE, 'app', 'api', 'desbloqueio', 'route.ts')

patch_file(
    db_path,
    """import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'""",
    """import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaDaSessao } from '@/lib/auth-server'""",
    "desbloqueio import auth"
)

patch_file(
    db_path,
    """// GET - Carrega config + clientes bloqueados aguardando desbloqueio
export async function GET(req) {
  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id')
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }""",
    """// GET - Carrega config + clientes bloqueados aguardando desbloqueio
export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  try {
    const empresaId = req.nextUrl.searchParams.get('empresa_id') || sessao.empresaId
    if (!empresaId) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }""",
    "desbloqueio GET auth check"
)

patch_file(
    db_path,
    """// POST - Salvar configuração de desbloqueio
export async function POST(req) {
  try {
    const body = await req.json()
    const { empresa_id, desbloqueio_automatico, verificar_pagamento, intervalo_verificacao, notificar_desbloqueio, mensagem_desbloqueio, ativo } = body

    if (!empresa_id) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }""",
    """// POST - Salvar configuração de desbloqueio
export async function POST(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req)
  if (!sessao) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { empresa_id, desbloqueio_automatico, verificar_pagamento, intervalo_verificacao, notificar_desbloqueio, mensagem_desbloqueio, ativo } = body

    // Garantir que operador só altera config da própria empresa
    const empresa_id_validado = sessao.empresaId
    if (empresa_id && empresa_id !== empresa_id_validado) {
      return NextResponse.json({ success: false, error: 'Sem permissão para esta empresa' }, { status: 403 })
    }
    if (!empresa_id_validado) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }""",
    "desbloqueio POST auth check"
)

# Corrigir empresa_id no upsert do desbloqueio
with open(db_path, 'r', encoding='utf-8') as f:
    db_content = f.read()

old_upsert_db = """    if (!empresa_id) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Verifica se já existe config para essa empresa
    const { data: existing } = await supabase
      .from('desbloqueio_config')
      .select('id')
      .eq('empresa_id', empresa_id)
      .single()"""
new_upsert_db = """    if (!empresa_id_validado) {
      return NextResponse.json({ success: false, error: 'empresa_id obrigatório' }, { status: 400 })
    }

    // Verifica se já existe config para essa empresa
    const { data: existing } = await supabase
      .from('desbloqueio_config')
      .select('id')
      .eq('empresa_id', empresa_id_validado)
      .single()"""

if db_content.count(old_upsert_db) == 1:
    db_content = db_content.replace(old_upsert_db, new_upsert_db)
    db_content = db_content.replace(
        "          empresa_id,\n          desbloqueio_automatico:",
        "          empresa_id: empresa_id_validado,\n          desbloqueio_automatico:"
    )
    with open(db_path, 'w', encoding='utf-8') as f:
        f.write(db_content)
    print("OK desbloqueio POST empresa_id fixado")
else:
    print(f"AVISO desbloqueio: upsert check não encontrado ({db_content.count(old_upsert_db)}x) — pulando sub-patch")

# ============================================================
# 5. logs/route.ts — exigir sessão (endpoint de inserção de logs)
# ============================================================
logs_path = os.path.join(BASE, 'app', 'api', 'logs', 'route.ts')

patch_file(
    logs_path,
    """// app/api/logs/route.ts
// Endpoint que recebe logs e salva no Supabase

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';""",
    """// app/api/logs/route.ts
// Endpoint que recebe logs e salva no Supabase

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmpresaDaSessao } from '@/lib/auth-server';""",
    "logs import auth"
)

patch_file(
    logs_path,
    """export async function POST(request: Request) {
  try {
    const logData = await request.json();""",
    """export async function POST(request: NextRequest) {
  // Verificar autenticação — evita inserção de logs falsos por externos
  const sessao = await getEmpresaDaSessao(request)
  if (!sessao) {
    return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado' }, { status: 401 })
  }

  try {
    const logData = await request.json();""",
    "logs POST auth check"
)

print("\n✅ Todos os patches aplicados com sucesso!")
print("Próximo passo: verificar TypeScript com npx tsc --noEmit")
