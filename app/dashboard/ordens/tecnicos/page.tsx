// ================================================================================
// PAINEL TÉCNICOS - Visão geral dos técnicos e suas OS
// Caminho: app/dashboard/ordens/tecnicos/page.tsx
// ================================================================================

"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users, User, Wrench, Clock, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, ChevronDown, Loader2, MapPin, Phone, Zap, X
} from 'lucide-react';

interface Tecnico {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
}

interface OS {
  id: string;
  numero: string;
  tipo: string;
  status: string;
  prioridade: string;
  descricao: string | null;
  endereco: string | null;
  agendada_para: string | null;
  iniciada_em: string | null;
  concluida_em: string | null;
  created_at: string;
  cliente_nome: string | null;
  cliente_bairro: string | null;
}

interface TecnicoComOS extends Tecnico {
  os_atual: OS | null;       // OS em execução agora
  os_agendadas: OS[];        // Próximas OS agendadas
  total_concluidas: number;
  total_canceladas: number;
  historico: OS[];            // Últimas OS concluídas/canceladas
}

const TIPOS: Record<string, string> = {
  reparo: 'Reparo', manutencao: 'Manutenção',
  troca_equipamento: 'Troca Equip.', mudanca_endereco: 'Mudança End.', retirada: 'Retirada',
};

const STATUS_CONF: Record<string, { label: string; cor: string; icone: string }> = {
  aberta: { label: 'Aberta', cor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30', icone: '○' },
  agendada: { label: 'Agendada', cor: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icone: '◷' },
  em_execucao: { label: 'Em Execução', cor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icone: '◉' },
  concluida: { label: 'Concluída', cor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icone: '✓' },
  cancelada: { label: 'Cancelada', cor: 'bg-red-500/20 text-red-300 border-red-500/30', icone: '✕' },
};

const PRIO_CONF: Record<string, { label: string; cor: string }> = {
  baixa: { label: 'Baixa', cor: 'text-zinc-400' }, media: { label: 'Média', cor: 'text-blue-400' },
  alta: { label: 'Alta', cor: 'text-amber-400' }, urgente: { label: 'Urgente', cor: 'text-red-400' },
};

function fmtData(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function tempoDecorrido(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? `${m}min` : ''}`;
}

export default function PainelTecnicosPage() {
  const [tecnicos, setTecnicos] = useState<TecnicoComOS[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [detalheOS, setDetalheOS] = useState<OS | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      // Buscar técnicos
      const resTec = await fetch('/api/tecnicos');
      if (!resTec.ok) return;
      const listaTec: Tecnico[] = await resTec.json();

      // Buscar todas as OS (a API já filtra por empresa_id via session)
      const resOS = await fetch('/api/ordens-servico');
      if (!resOS.ok) return;
      const listaOS: any[] = await resOS.json();

      // Montar dados por técnico
      const resultado: TecnicoComOS[] = listaTec.map(tec => {
        const osTecnico = listaOS.filter((os: any) => os.tecnico_id === tec.id || os.tecnico?.id === tec.id);

        const os_atual = osTecnico.find((os: any) => os.status === 'em_execucao') || null;
        const os_agendadas = osTecnico
          .filter((os: any) => os.status === 'agendada')
          .sort((a: any, b: any) => new Date(a.agendada_para || 0).getTime() - new Date(b.agendada_para || 0).getTime());
        const concluidas = osTecnico.filter((os: any) => os.status === 'concluida');
        const canceladas = osTecnico.filter((os: any) => os.status === 'cancelada');
        const historico = [...concluidas, ...canceladas]
          .sort((a: any, b: any) => new Date(b.concluida_em || b.created_at).getTime() - new Date(a.concluida_em || a.created_at).getTime())
          .slice(0, 10);

        // Formatar OS com dados do cliente
        const formatarOS = (os: any): OS => ({
          id: os.id,
          numero: os.numero,
          tipo: os.tipo,
          status: os.status,
          prioridade: os.prioridade,
          descricao: os.descricao,
          endereco: os.endereco,
          agendada_para: os.agendada_para,
          iniciada_em: os.iniciada_em,
          concluida_em: os.concluida_em,
          created_at: os.created_at,
          cliente_nome: os.clientes?.nome || null,
          cliente_bairro: os.clientes?.bairro || null,
        });

        return {
          ...tec,
          os_atual: os_atual ? formatarOS(os_atual) : null,
          os_agendadas: os_agendadas.map(formatarOS),
          total_concluidas: concluidas.length,
          total_canceladas: canceladas.length,
          historico: historico.map(formatarOS),
        };
      });

      // Ordenar: quem está em execução primeiro, depois por nome
      resultado.sort((a, b) => {
        if (a.os_atual && !b.os_atual) return -1;
        if (!a.os_atual && b.os_atual) return 1;
        return a.nome.localeCompare(b.nome);
      });

      setTecnicos(resultado);
    } catch (e) {
      console.error('Erro ao carregar painel:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // Realtime - atualiza quando OS muda
  useEffect(() => {
    const ch = supabase.channel('painel-tec-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, () => carregarDados())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [carregarDados]);

  // Auto-refresh a cada 30s (para atualizar o "tempo decorrido")
  useEffect(() => {
    const interval = setInterval(() => carregarDados(), 30000);
    return () => clearInterval(interval);
  }, [carregarDados]);

  const emCampo = tecnicos.filter(t => t.os_atual !== null).length;
  const totalAgendadas = tecnicos.reduce((acc, t) => acc + t.os_agendadas.length, 0);
  const totalConcluidas = tecnicos.reduce((acc, t) => acc + t.total_concluidas, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">Painel Tecnicos</h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase">Visao em tempo real</p>
          </div>
        </div>

        {/* CARDS RESUMO */}
        <div className="grid grid-cols-4 gap-3">
          <div className="border border-zinc-800 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Total Tecnicos</span>
            <p className="text-2xl font-black font-mono text-zinc-300 mt-1">{tecnicos.length}</p>
          </div>
          <div className="border border-amber-500/20 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Em Campo</span>
            <p className="text-2xl font-black font-mono text-amber-400 mt-1">{emCampo}</p>
          </div>
          <div className="border border-sky-500/20 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500">OS Agendadas</span>
            <p className="text-2xl font-black font-mono text-sky-400 mt-1">{totalAgendadas}</p>
          </div>
          <div className="border border-emerald-500/20 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Total Concluidas</span>
            <p className="text-2xl font-black font-mono text-emerald-400 mt-1">{totalConcluidas}</p>
          </div>
        </div>

        {/* LISTA DE TÉCNICOS */}
        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
        ) : tecnicos.length === 0 ? (
          <div className="border border-zinc-900 bg-zinc-900/40 rounded-xl p-12 text-center">
            <Users className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-mono">Nenhum tecnico cadastrado</p>
            <p className="text-[10px] text-zinc-600 font-mono mt-1">Tecnicos aparecem aqui quando criam conta no app</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tecnicos.map((tec) => (
              <div key={tec.id} className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">

                {/* CARD DO TÉCNICO */}
                <div
                  onClick={() => setExpandido(expandido === tec.id ? null : tec.id)}
                  className="p-4 flex items-center justify-between hover:bg-zinc-800/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar / Status */}
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono ${
                      tec.os_atual
                        ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/50'
                        : 'bg-zinc-800 text-zinc-400 border-2 border-zinc-700'
                    }`}>
                      {tec.nome.charAt(0).toUpperCase()}
                      {tec.os_atual && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                      )}
                    </div>

                    {/* Nome e info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{tec.nome}</span>
                        {tec.os_atual && (
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1 shrink-0">
                            <Zap className="w-2.5 h-2.5" /> Em campo
                          </span>
                        )}
                        {!tec.os_atual && tec.os_agendadas.length > 0 && (
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-sky-500/20 text-sky-300 border-sky-500/30 shrink-0">
                            {tec.os_agendadas.length} agendada{tec.os_agendadas.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {!tec.os_atual && tec.os_agendadas.length === 0 && (
                          <span className="text-[10px] font-mono text-zinc-600 shrink-0">Disponivel</span>
                        )}
                      </div>
                      {tec.os_atual && (
                        <p className="text-[10px] font-mono text-amber-400/70 mt-0.5 truncate">
                          {tec.os_atual.numero} · {TIPOS[tec.os_atual.tipo] || tec.os_atual.tipo}
                          {tec.os_atual.cliente_nome && ` · ${tec.os_atual.cliente_nome}`}
                          {tec.os_atual.iniciada_em && ` · ha ${tempoDecorrido(tec.os_atual.iniciada_em)}`}
                        </p>
                      )}
                      {!tec.os_atual && (
                        <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{tec.email}</p>
                      )}
                    </div>

                    {/* Stats mini */}
                    <div className="hidden md:flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <p className="text-xs font-black font-mono text-emerald-400">{tec.total_concluidas}</p>
                        <p className="text-[8px] font-mono text-zinc-600 uppercase">Concluidas</p>
                      </div>
                      {tec.total_canceladas > 0 && (
                        <div className="text-center">
                          <p className="text-xs font-black font-mono text-red-400">{tec.total_canceladas}</p>
                          <p className="text-[8px] font-mono text-zinc-600 uppercase">Canceladas</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronDown className={`w-4 h-4 text-zinc-600 shrink-0 ml-2 transition-transform ${expandido === tec.id ? 'rotate-180' : ''}`} />
                </div>

                {/* EXPANDIDO - Detalhes do técnico */}
                {expandido === tec.id && (
                  <div className="border-t border-zinc-800/50 bg-black/20 p-4 space-y-4">

                    {/* OS EM EXECUÇÃO */}
                    {tec.os_atual && (
                      <div>
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Executando Agora
                        </span>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-bold text-white">{tec.os_atual.numero}</span>
                            <span className="text-[10px] font-mono text-amber-400">
                              {tec.os_atual.iniciada_em && `ha ${tempoDecorrido(tec.os_atual.iniciada_em)}`}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-zinc-400">{TIPOS[tec.os_atual.tipo] || tec.os_atual.tipo} · {PRIO_CONF[tec.os_atual.prioridade]?.label}</p>
                          {tec.os_atual.cliente_nome && (
                            <p className="text-[10px] text-zinc-300 mt-1 flex items-center gap-1">
                              <User className="w-3 h-3 text-zinc-500" /> {tec.os_atual.cliente_nome}
                              {tec.os_atual.cliente_bairro && <span className="text-zinc-500"> · {tec.os_atual.cliente_bairro}</span>}
                            </p>
                          )}
                          {tec.os_atual.descricao && (
                            <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{tec.os_atual.descricao}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* OS AGENDADAS */}
                    {tec.os_agendadas.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Proximas Agendadas ({tec.os_agendadas.length})
                        </span>
                        <div className="space-y-1.5">
                          {tec.os_agendadas.map(os => (
                            <div key={os.id} className="bg-sky-500/5 border border-sky-500/10 rounded-lg p-2.5 flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-white">{os.numero}</span>
                                  <span className="text-[10px] font-mono text-zinc-500">{TIPOS[os.tipo] || os.tipo}</span>
                                </div>
                                {os.cliente_nome && <p className="text-[10px] text-zinc-400 truncate">{os.cliente_nome}</p>}
                              </div>
                              <span className="text-[10px] font-mono text-sky-400 shrink-0">{fmtData(os.agendada_para)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* HISTÓRICO */}
                    {tec.historico.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block mb-2">
                          Historico Recente
                        </span>
                        <div className="space-y-1">
                          {tec.historico.map(os => (
                            <div key={os.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-zinc-800/30">
                              {os.status === 'concluida' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              )}
                              <span className="text-[10px] font-mono font-bold text-zinc-300">{os.numero}</span>
                              <span className="text-[10px] font-mono text-zinc-600">{TIPOS[os.tipo] || os.tipo}</span>
                              {os.cliente_nome && <span className="text-[10px] text-zinc-500 truncate flex-1 min-w-0">{os.cliente_nome}</span>}
                              <span className="text-[10px] font-mono text-zinc-600 shrink-0">{fmtData(os.concluida_em || os.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SEM HISTÓRICO */}
                    {tec.historico.length === 0 && !tec.os_atual && tec.os_agendadas.length === 0 && (
                      <p className="text-[10px] font-mono text-zinc-600 text-center py-4">Nenhuma OS registrada para este tecnico</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}