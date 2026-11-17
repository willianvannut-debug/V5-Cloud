// ================================================================================
// STATUS OS - V2 (TIPOS EXPANDIDOS + BOTÃO BAIXAR PDF)
// Caminho: app/dashboard/ordens/status/page.tsx
// ================================================================================

"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Wrench, Plus, X, Search, Loader2, User, MapPin, Phone,
  CheckCircle2, XCircle, ChevronRight, FileText, Clock, Download
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Users } from 'lucide-react';

interface OS {
  id: string; numero: string; tipo: string; status: string; prioridade: string;
  descricao: string | null; endereco: string | null; agendada_para: string | null;
  iniciada_em: string | null; concluida_em: string | null;
  observacoes_tecnico: string | null; motivo_cancelamento: string | null; created_at: string;
  tecnicos_ids?: string[];
  clientes: { id: string; nome: string; cpf: string; telefone: string; bairro: string; cidade: string } | null;
  tecnico: { id: string; nome: string } | null;
  tecnicos?: { id: string; nome: string }[];
}

const TIPOS: Record<string, string> = {
  // Cliente
  reparo: 'Reparo', troca_equipamento: 'Troca Equip.',
  mudanca_endereco: 'Mudança End.', retirada: 'Retirada',
  // Infraestrutura
  cto_caixa: 'CTO / Caixa', cabo_rompido: 'Cabo Rompido',
  poste_infraestrutura: 'Poste / Infra', equipamento_rede: 'Equip. Rede',
  // Outros
  manutencao_preventiva: 'Manutenção Prev.', vistoria: 'Vistoria',
  outros: 'Outros',
  // Legado
  manutencao: 'Manutenção', instalacao: 'Instalação', chamado: 'Chamado',
};

const TIPOS_FILTRO: Record<string, string> = {
  reparo: 'Reparo', troca_equipamento: 'Troca Equipamento',
  mudanca_endereco: 'Mudança Endereço', retirada: 'Retirada',
  cto_caixa: 'CTO / Caixa de Emenda', cabo_rompido: 'Cabo Rompido / Fibra',
  poste_infraestrutura: 'Poste / Infra Aérea', equipamento_rede: 'Equip. de Rede',
  manutencao_preventiva: 'Manutenção Preventiva', vistoria: 'Vistoria Técnica',
  outros: 'Outros',
};

const STATUS_CONF: Record<string, { label: string; cor: string }> = {
  aberta: { label: 'Aberta', cor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' },
  agendada: { label: 'Agendada', cor: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  em_deslocamento: { label: 'Deslocamento', cor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
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

function fmtDataCompleta(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ==================== GERADOR DE PDF ====================
function gerarPDF(os: OS) {
  const statusLabel = STATUS_CONF[os.status]?.label || os.status;
  const tipoLabel = TIPOS[os.tipo] || os.tipo;
  const prioLabel = PRIO_CONF[os.prioridade]?.label || os.prioridade;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>OS ${os.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
    .header .numero { font-size: 14px; color: #666; margin-top: 4px; }
    .badges { display: flex; gap: 8px; margin-top: 8px; }
    .badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-status { background: #d1fae5; color: #065f46; }
    .badge-prio { background: #fef3c7; color: #92400e; }
    .badge-tipo { background: #e0e7ff; color: #3730a3; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; font-weight: 700; margin-bottom: 8px; }
    .section-content { font-size: 14px; line-height: 1.6; color: #333; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 700; }
    .card-value { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
    .obs-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; }
    .cancel-box { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Ordem de Serviço</h1>
      <div class="numero">${os.numero}</div>
      <div class="badges">
        <span class="badge badge-status">${statusLabel}</span>
        <span class="badge badge-prio">${prioLabel}</span>
        <span class="badge badge-tipo">${tipoLabel}</span>
      </div>
    </div>
  </div>

  ${os.clientes ? `
  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="card">
      <div style="font-size: 16px; font-weight: 700; color: #1a1a1a;">${os.clientes.nome}</div>
      ${os.clientes.cpf ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">CPF: ${os.clientes.cpf}</div>` : ''}
      ${os.clientes.telefone ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">Tel: ${os.clientes.telefone}</div>` : ''}
      ${os.endereco ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">End: ${os.endereco}</div>` : ''}
    </div>
  </div>
  ` : ''}

  ${!os.clientes && os.endereco ? `
  <div class="section">
    <div class="section-title">Localização</div>
    <div class="card">
      <div style="font-size: 14px; color: #1a1a1a;">${os.endereco}</div>
    </div>
  </div>
  ` : ''}

  ${os.descricao ? `
  <div class="section">
    <div class="section-title">Descrição do Problema</div>
    <div class="section-content">${os.descricao}</div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Informações</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">Técnico${(os.tecnicos && os.tecnicos.length > 1) ? 's' : ''}</div>
        <div class="card-value">${os.tecnicos && os.tecnicos.length > 0 ? os.tecnicos.map(t => t.nome).join(', ') : os.tecnico?.nome || 'Não atribuído'}</div>
      </div>
      <div class="card">
        <div class="card-label">Criada em</div>
        <div class="card-value">${fmtDataCompleta(os.created_at)}</div>
      </div>
      ${os.agendada_para ? `
      <div class="card">
        <div class="card-label">Agendada para</div>
        <div class="card-value">${fmtDataCompleta(os.agendada_para)}</div>
      </div>
      ` : ''}
      ${os.iniciada_em ? `
      <div class="card">
        <div class="card-label">Iniciada em</div>
        <div class="card-value">${fmtDataCompleta(os.iniciada_em)}</div>
      </div>
      ` : ''}
      ${os.concluida_em ? `
      <div class="card">
        <div class="card-label">Concluída em</div>
        <div class="card-value">${fmtDataCompleta(os.concluida_em)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  ${os.observacoes_tecnico ? `
  <div class="section">
    <div class="section-title">Observações do Técnico</div>
    <div class="obs-box">${os.observacoes_tecnico}</div>
  </div>
  ` : ''}

  ${os.motivo_cancelamento ? `
  <div class="section">
    <div class="section-title">Motivo do Cancelamento</div>
    <div class="cancel-box">${os.motivo_cancelamento}</div>
  </div>
  ` : ''}

  <div class="footer">
    Gerado em ${new Date().toLocaleString('pt-BR')} · V5 Cloud
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => { win.print(); }, 500);
    };
  }
}

// ==================== COMPONENTE PRINCIPAL ====================
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
    exec: ordens.filter(o => o.status === 'em_execucao' || o.status === 'em_deslocamento').length,
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
            <span className="text-[10px] font-mono uppercase text-zinc-500">Em Andamento</span>
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
            {Object.entries(TIPOS_FILTRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                    ) : os.endereco ? (
                      <div><p className="text-xs text-zinc-300 truncate flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400" /> {os.endereco}</p></div>
                    ) : (
                      <p className="text-[10px] text-zinc-600 font-mono">Sem localização</p>
                    )}
                  </div>
                  <div className="hidden md:block w-36">
                    {(os as any).tecnicos && (os as any).tecnicos.length > 1 ? (
                      <p className="text-xs text-zinc-300 truncate flex items-center gap-1"><Users className="w-3 h-3 text-zinc-500" /> {(os as any).tecnicos.length} técnicos</p>
                    ) : os.tecnico ? (
                      <p className="text-xs text-zinc-300 truncate flex items-center gap-1"><User className="w-3 h-3 text-zinc-500" /> {os.tecnico.nome}</p>
                    ) : (
                      <p className="text-[10px] text-zinc-600 font-mono">Sem tecnico</p>
                    )}
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
              <div className="flex items-center gap-2">
                {/* BOTÃO BAIXAR/IMPRIMIR */}
                <button onClick={() => gerarPDF(detalhe)}
                  className="text-zinc-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
                  title="Baixar / Imprimir OS">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={() => setDetalhe(null)} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full border ${STATUS_CONF[detalhe.status]?.cor}`}>{STATUS_CONF[detalhe.status]?.label}</span>
              <span className="text-[10px] font-mono uppercase text-zinc-400">{TIPOS[detalhe.tipo] || detalhe.tipo}</span>
              <span className={`text-[10px] font-mono font-bold ${PRIO_CONF[detalhe.prioridade]?.cor}`}>● {PRIO_CONF[detalhe.prioridade]?.label}</span>
            </div>

            {/* Cliente ou Localização */}
            {detalhe.clientes && (
              <div className="border border-zinc-800 bg-black/30 rounded-xl p-3 mb-4">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Cliente</span>
                <p className="text-sm text-white font-bold">{detalhe.clientes.nome}</p>
                {detalhe.clientes.telefone && <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {detalhe.clientes.telefone}</p>}
                {detalhe.endereco && <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {detalhe.endereco}</p>}
              </div>
            )}
            {!detalhe.clientes && detalhe.endereco && (
              <div className="border border-zinc-800 bg-black/30 rounded-xl p-3 mb-4">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Localização</span>
                <p className="text-xs text-zinc-300 flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400" /> {detalhe.endereco}</p>
              </div>
            )}

            {detalhe.descricao && <div className="mb-4"><span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Descricao</span><p className="text-xs text-zinc-300">{detalhe.descricao}</p></div>}

            {/* Técnicos (multi-select) */}
            <div className="mb-4">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5">
                Técnicos {(detalhe as any).tecnicos?.length > 0 && <span className="text-emerald-500">({(detalhe as any).tecnicos.length})</span>}
              </span>

              {/* Tags dos técnicos atuais */}
              {(detalhe as any).tecnicos && (detalhe as any).tecnicos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(detalhe as any).tecnicos.map((t: any) => (
                    <span key={t.id} className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      <User className="w-2.5 h-2.5" /> {t.nome}
                      <button onClick={() => {
                        const novosIds = ((detalhe as any).tecnicos_ids || []).filter((id: string) => id !== t.id);
                        atualizarOS(detalhe.id, { tecnicos_ids: novosIds, tecnico_id: novosIds[0] || null });
                      }} className="hover:text-white ml-0.5 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}

              {/* Dropdown para adicionar técnico */}
              <select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const atuais = (detalhe as any).tecnicos_ids || (detalhe.tecnico ? [detalhe.tecnico.id] : []);
                  if (atuais.includes(e.target.value)) return;
                  const novosIds = [...atuais, e.target.value];
                  atualizarOS(detalhe.id, { tecnicos_ids: novosIds, tecnico_id: novosIds[0] });
                }}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none cursor-pointer">
                <option value="">+ Adicionar técnico...</option>
                {tecnicos
                  .filter((t: any) => !((detalhe as any).tecnicos_ids || (detalhe.tecnico ? [detalhe.tecnico.id] : [])).includes(t.id))
                  .map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Criada</span><span className="text-xs font-mono text-zinc-300">{fmtData(detalhe.created_at)}</span></div>
              {detalhe.agendada_para && <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Agendada</span><span className="text-xs font-mono text-sky-400">{fmtData(detalhe.agendada_para)}</span></div>}
              {detalhe.iniciada_em && <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Iniciada</span><span className="text-xs font-mono text-amber-400">{fmtData(detalhe.iniciada_em)}</span></div>}
              {detalhe.concluida_em && <div><span className="text-[10px] font-mono uppercase text-zinc-500 block">Concluida</span><span className="text-xs font-mono text-emerald-400">{fmtData(detalhe.concluida_em)}</span></div>}
            </div>
            {detalhe.observacoes_tecnico && <div className="mb-4"><span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Obs. do Tecnico</span><p className="text-xs text-zinc-300 bg-black/30 border border-zinc-800 rounded-lg p-3">{detalhe.observacoes_tecnico}</p></div>}

            {/* Botões de ação */}
            <div className="border-t border-zinc-800 pt-4 mt-4 space-y-2">
              {/* Baixar PDF */}
              <button onClick={() => gerarPDF(detalhe)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono font-bold uppercase text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Download className="w-4 h-4" /> Baixar / Imprimir OS
              </button>

              {/* Cancelar OS */}
              {detalhe.status !== 'concluida' && detalhe.status !== 'cancelada' && (
                <button onClick={() => { const m = window.prompt('Motivo do cancelamento:'); if (m) atualizarOS(detalhe.id, { status: 'cancelada', motivo_cancelamento: m }); }}
                  className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-mono font-bold uppercase text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
                  <XCircle className="w-4 h-4" /> Cancelar OS
                </button>
              )}
            </div>

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
