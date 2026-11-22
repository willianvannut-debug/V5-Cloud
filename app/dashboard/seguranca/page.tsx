// ================================================================================
// 🛡️ MONITORAMENTO DE SEGURANÇA — V5 FIBRA
// app/dashboard/seguranca/page.tsx
// ================================================================================
"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldAlert, ShieldCheck, ShieldOff,
  AlertTriangle, Eye, RefreshCw, Activity,
  Lock, User, Clock, Wifi, TrendingUp,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Alertas {
  nivelAlerta: 'ok' | 'atencao' | 'critico'
  resumo: { totalEventos24h: number; totalEventos1h: number; ipsSuspeitosCount: number }
  porTipo: Record<string, number>
  ipsSuspeitos: { ip: string; tentativas: number }[]
  eventoRecentes: { acao: string; operador_email: string; detalhes: any; criado_em: string }[]
  feedAtividade: { acao: string; nivel: string; operador_email: string; detalhes: any; criado_em: string }[]
  geradoEm: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function tempoRelativo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}

function labelAcao(acao: string) {
  const map: Record<string, string> = {
    TENTATIVA_LOGIN_BLOQUEADA: 'Login bloqueado (rate limit)',
    TENTATIVA_LOGIN_EMAIL_INVALIDO: 'Email inválido',
    TENTATIVA_LOGIN_SENHA_INCORRETA: 'Senha incorreta',
    ACESSO_NEGADO: 'Acesso negado',
    TOKEN_INVALIDO: 'Token inválido',
    SESSAO_EXPIRADA: 'Sessão expirada',
    LOGIN_SUCESSO: 'Login com sucesso',
    LOGOUT: 'Logout',
  }
  return map[acao] || acao.replace(/_/g, ' ')
}

function corNivel(nivel: string) {
  if (nivel === 'ERROR' || nivel === 'WARNING') return 'text-red-400'
  if (nivel === 'SUCCESS') return 'text-emerald-400'
  return 'text-zinc-400'
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SegurancaPage() {
  const { operador, carregando: authCarregando } = useAuth()
  const router = useRouter()

  // Bloquear acesso para roles sem permissão
  useEffect(() => {
    if (authCarregando) return
    const role = operador?.role?.toLowerCase() || ''
    if (role !== 'superadmin') {
      router.replace('/dashboard')
    }
  }, [operador, authCarregando, router])

  const [dados, setDados] = useState<Alertas | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const carregar = useCallback(async () => {
    try {
      setCarregando(true)
      const res = await fetch('/api/seguranca/alertas')
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      setDados(await res.json())
      setErro('')
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Auto-refresh a cada 60 segundos
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(carregar, 60_000)
    return () => clearInterval(id)
  }, [autoRefresh, carregar])

  // ── Cores e ícones por nível de alerta ──────────────────────────────────────
  const nivelConfig = {
    ok:       { cor: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', Icon: ShieldCheck,  label: 'Sistema seguro' },
    atencao:  { cor: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30',   Icon: ShieldAlert,  label: 'Atenção necessária' },
    critico:  { cor: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',         Icon: ShieldOff,    label: 'Alerta crítico' },
  }
  const nivel = dados ? nivelConfig[dados.nivelAlerta] : nivelConfig.ok

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-400" />
            Monitoramento de Segurança
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Eventos de acesso, tentativas bloqueadas e IPs suspeitos nas últimas 24h
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              autoRefresh
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : 'border-zinc-700 text-zinc-500 bg-zinc-800'
            }`}
          >
            {autoRefresh ? '⏱ Auto (60s)' : 'Auto off'}
          </button>
          <button
            onClick={carregar}
            disabled={carregando}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* ── Erro ──────────────────────────────────────────────────────────── */}
      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}

      {dados && (
        <>
          {/* ── Status geral ──────────────────────────────────────────────── */}
          <div className={`rounded-xl border p-5 flex items-center gap-4 ${nivel.bg}`}>
            <nivel.Icon className={`w-10 h-10 ${nivel.cor}`} />
            <div>
              <p className={`text-lg font-semibold ${nivel.cor}`}>{nivel.label}</p>
              <p className="text-zinc-400 text-sm">
                Atualizado {tempoRelativo(dados.geradoEm)}
              </p>
            </div>
          </div>

          {/* ── Cards de resumo ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dados.resumo.totalEventos24h}</p>
                  <p className="text-zinc-400 text-xs">Eventos suspeitos (24h)</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dados.resumo.totalEventos1h}</p>
                  <p className="text-zinc-400 text-xs">Eventos na última hora</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Wifi className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dados.resumo.ipsSuspeitosCount}</p>
                  <p className="text-zinc-400 text-xs">IPs suspeitos (≥5 tentativas)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Eventos por tipo ────────────────────────────────────────── */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Eventos por tipo (24h)
                </h2>
                {Object.keys(dados.porTipo).length === 0 ? (
                  <p className="text-zinc-500 text-sm">Nenhum evento suspeito registrado.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(dados.porTipo)
                      .sort(([, a], [, b]) => b - a)
                      .map(([acao, count]) => (
                        <div key={acao} className="flex items-center justify-between">
                          <span className="text-zinc-300 text-sm">{labelAcao(acao)}</span>
                          <span className="bg-red-500/20 text-red-300 text-xs font-bold px-2 py-0.5 rounded-full">
                            {count}×
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── IPs suspeitos ────────────────────────────────────────────── */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-5">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  IPs suspeitos (≥5 tentativas)
                </h2>
                {dados.ipsSuspeitos.length === 0 ? (
                  <p className="text-zinc-500 text-sm">Nenhum IP com múltiplas tentativas.</p>
                ) : (
                  <div className="space-y-2">
                    {dados.ipsSuspeitos.map(({ ip, tentativas }) => (
                      <div key={ip} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                        <span className="font-mono text-sm text-zinc-200">{ip}</span>
                        <span className="text-red-400 text-xs font-semibold">{tentativas} tentativas</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Eventos recentes ────────────────────────────────────────────── */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-yellow-400" />
                Últimos eventos suspeitos
              </h2>
              {dados.eventoRecentes.length === 0 ? (
                <p className="text-zinc-500 text-sm">Nenhum evento suspeito nas últimas 24h. ✅</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {dados.eventoRecentes.map((e, i) => (
                    <div key={i} className="flex items-start gap-3 bg-zinc-800/60 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-zinc-200 font-medium">{labelAcao(e.acao)}</span>
                          <span className="text-zinc-500 text-xs shrink-0">{tempoRelativo(e.criado_em)}</span>
                        </div>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          {e.operador_email || 'desconhecido'}
                          {e.detalhes?.ip ? ` · ${e.detalhes.ip}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Feed de atividade geral ─────────────────────────────────────── */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Feed de atividade recente
              </h2>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {dados.feedAtividade.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-zinc-800 last:border-0">
                    <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className={`font-medium shrink-0 ${corNivel(e.nivel)}`}>{labelAcao(e.acao)}</span>
                    <span className="text-zinc-500 truncate flex-1">{e.operador_email || '—'}</span>
                    <span className="text-zinc-600 text-xs shrink-0">{tempoRelativo(e.criado_em)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {carregando && !dados && (
        <div className="text-center py-20 text-zinc-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          Carregando dados de segurança...
        </div>
      )}
    </div>
  )
}
