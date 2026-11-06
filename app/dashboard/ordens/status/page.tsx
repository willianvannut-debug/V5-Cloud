// ================================================================================
// STATUS OS - MVP (VERSÃO FINAL CORRIGIDA)
// Caminho: app/dashboard/ordens/status/page.tsx
// ================================================================================

"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Wrench, Plus, X, Search, Loader2, User, MapPin, Phone,
  CheckCircle2, XCircle, ChevronRight, FileText, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OS {
  id: string; numero: string; tipo: string; status: string; prioridade: string;
  descricao: string | null; endereco: string | null; agendada_para: string | null;
  iniciada_em: string | null; concluida_em: string | null;
  observacoes_tecnico: string | null; motivo_cancelamento: string | null; created_at: string;
  clientes: { id: string; nome: string; cpf: string; telefone: string; bairro: string; cidade: string } | null;
  tecnico: { id: string; nome: string } | null;
}

const TIPOS: Record<string, string> = {
  reparo: 'Reparo', manutencao: 'Manutenção',
  troca_equipamento: 'Troca Equip.', mudanca_endereco: 'Mudança End.', retirada: 'Retirada',
};

const STATUS_CONF: Record<string, { label: string; cor: string }> = {
  aberta: { label: 'Aberta', cor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' },
  agendada: { label: 'Agendada', cor: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  em_execucao: { label: 'Em Execução', cor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  concluida: { label: 'Concluída', cor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  cancelada: { label: 'Cancelada', cor: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const PRIO_CONF: Record<string, { label: string; cor: string }> = {
  baixa: { label: 'Baixa', cor: 'text-zinc-400' }, media: { label: 'Média', cor: 'text-blue-400' },
  alta: { label: 'Alta', cor: 'text-amber-400' }, urgente: { label: 'Urgente', cor: 'text-red-400' },
};

function fmtData(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function StatusOSPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busca, setBusca] = useState('');

  // Detalhe
  const [detalhe, setDetalhe] = useState<OS | null>(null);

  const carregarOS = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set('status', filtroStatus);
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (busca) params.set('busca', busca);
      const res = await fetch(`/api/ordens-servico?${params}`);
      if (res.ok) setOrdens(await res.json());
    } catch (e) {} finally { setCarregando(false); }
  }, [filtroStatus, filtroTipo, busca]);

  const carregarTecnicos = async () => {
    try {
      const res = await fetch('/api/tecnicos');
      if (res.ok) {
        const data = await res.json();
        setTecnicos(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  };

  useEffect(() => { carregarOS(); carregarTecnicos(); }, [carregarOS]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('os-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, () => carregarOS())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [carregarOS]);

  const atualizarOS = async (id: string, campos: any) => {
    try {
      const res = await fetch('/api/ordens-servico', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...campos }),
      });
      if (res.ok) { carregarOS(); const d = await res.json(); if (detalhe?.id === id) setDetalhe(d); }
    } catch (e) {}
  };

  const cont = {
    aberta: ordens.filter(o => o.status === 'aberta').length,
    exec: ordens.filter(o => o.status === 'em_execucao').length,
    conc: ordens.filter(o => o.status === 'concluida' && o.concluida_em && new Date(o.concluida_em).toDateString() === new Date().toDateString()).length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Wrench className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">Ordens de Servico</h1>
          </div>
          <button onClick={() => router.push('/dashboard/ordens/criar')} className="bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" /> Nova OS
          </button>
        </div>

        {/* CARDS RESUMO */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-zinc-800 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Abertas</span>
            <p className="text-2xl font-black font-mono text-zinc-300 mt-1">{cont.aberta}</p>
          </div>
          <div className="border border-amber-500/20 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Em Execucao</span>
            <p className="text-2xl font-black font-mono text-amber-400 mt-1">{cont.exec}</p>
          </div>
          <div className="border border-emerald-500/20 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500">Concluidas Hoje</span>
            <p className="text-2xl font-black font-mono text-emerald-400 mt-1">{cont.conc}</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input type="text" placeholder="Buscar por numero, nome ou CPF..." value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50" />
          </div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none cursor-pointer">
            <option value="">Todos status</option>
            {Object.entries(STATUS_CONF).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none cursor-pointer">
            <option value="">Todos tipos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* LISTA */}
        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
        ) : ordens.length === 0 ? (
          <div className="border border-zinc-900 bg-zinc-900/40 rounded-xl p-12 text-center">
            <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-mono">Nenhuma OS encontrada</p>
            <button onClick={() => router.push('/dashboard/ordens/criar')} className="mt-4 text-emerald-400 text-xs font-mono font-bold uppercase hover:text-emerald-300 cursor-pointer">+ Criar primeira OS</button>
          </div>
        ) : (
          <div className="space-y-2">
            {ordens.map((os) => (
              <div key={os.id} onClick={() => setDetalhe(os)} className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 cursor-pointer group">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold text-white">{os.numero}</span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_CONF[os.status]?.cor}`}>{STATUS_CONF[os.status]?.label}</span>
                      <span className={`text-[10px] font-mono font-bold ${PRIO_CONF[os.prioridade]?.cor}`}>● {PRIO_CONF[os.prioridade]?.label}</span>
                    </div>
                    <p className="text-[10px] font-mono uppercase text-zinc-500">{TIPOS[os.tipo] || os.tipo}</p>
                  </div>
                  <div className="flex-1 min-w-0 hidden md:block">
                    {os.clientes ? (
                      <div><p className="text-xs text-white truncate">{os.clientes.nome}</p><p className="text-[10px] text-zinc-500 truncate">{os.clientes.bairro}{os.clientes.cidade ? `, ${os.clientes.cidade}` : ''}</p></div>
                    ) : <p className="text-[10px] text-zinc-600 font-mono">Sem cliente</p>}
                  </div>
                  <div className="hidden md:block w-32">
                    {os.tecnico ? <p className="text-xs text-zinc-300 truncate flex items-center gap-1"><User className="w-3 h-3 text-zinc-500" /> {os.tecnico.nome}</p> : <p className="text-[10px] text-zinc-600 font-mono">Sem tecnico</p>}
                  </div>
                  <div className="hidden lg:block w-28 text-right">
                    <p className="text-[10px] font-mono text-zinc-500">{fmtData(os.agendada_para || os.created_at)}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 shrink-0 ml-2" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETALHE DA OS (painel lateral) */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setDetalhe(null)} />
          <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-800 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500">Ordem de Servico</span>
                <h2 className="text-lg font-black font-mono text-white">{detalhe.numero}</h2>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full border ${STATUS_CONF[detalhe.status]?.cor}`}>{STATUS_CONF[detalhe.status]?.label}</span>
              <span className="text-[10px] font-mono uppercase text-zinc-400">{TIPOS[detalhe.tipo]}</span>
              <span className={`text-[10px] font-mono font-bold ${PRIO_CONF[detalhe.prioridade]?.cor}`}>● {PRIO_CONF[detalhe.prioridade]?.label}</span>
            </div>
            {detalhe.clientes && (
              <div className="border border-zinc-800 bg-black/30 rounded-xl p-3 mb-4">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Cliente</span>
                <p className="text-sm text-white font-bold">{detalhe.clientes.nome}</p>
                {detalhe.clientes.telefone && <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {detalhe.clientes.telefone}</p>}
                {detalhe.endereco && <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {detalhe.endereco}</p>}
              </div>
            )}
            {detalhe.descricao && <div className="mb-4"><span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Descricao</span><p className="text-xs text-zinc-300">{detalhe.descricao}</p></div>}
            <div className="mb-4">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5">Tecnico</span>
              <select value={detalhe.tecnico?.id || ''} onChange={(e) => atualizarOS(detalhe.id, { tecnico_id: e.target.value || null })}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none cursor-pointer">
                <option value="">Sem tecnico</option>
                {tecnicos.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Criada</span><span className="text-xs font-mono text-zinc-300">{fmtData(detalhe.created_at)}</span></div>
              {detalhe.agendada_para && <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Agendada</span><span className="text-xs font-mono text-sky-400">{fmtData(detalhe.agendada_para)}</span></div>}
              {detalhe.iniciada_em && <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Iniciada</span><span className="text-xs font-mono text-amber-400">{fmtData(detalhe.iniciada_em)}</span></div>}
              {detalhe.concluida_em && <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Concluida</span><span className="text-xs font-mono text-emerald-400">{fmtData(detalhe.concluida_em)}</span></div>}
            </div>
            {detalhe.observacoes_tecnico && <div className="mb-4"><span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Obs. do Tecnico</span><p className="text-xs text-zinc-300 bg-black/30 border border-zinc-800 rounded-lg p-3">{detalhe.observacoes_tecnico}</p></div>}
            {detalhe.status !== 'concluida' && detalhe.status !== 'cancelada' && (
              <div className="border-t border-zinc-800 pt-4 mt-4">
                <button onClick={() => { const m = window.prompt('Motivo do cancelamento:'); if (m) atualizarOS(detalhe.id, { status: 'cancelada', motivo_cancelamento: m }); }}
                  className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-mono font-bold uppercase text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                  <XCircle className="w-4 h-4" /> Cancelar OS
                </button>
              </div>
            )}
            {detalhe.motivo_cancelamento && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-[10px] font-mono uppercase text-red-400 block mb-1">Motivo Cancelamento</span>
                <p className="text-xs text-red-300">{detalhe.motivo_cancelamento}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}