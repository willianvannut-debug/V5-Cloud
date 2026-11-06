// ================================================================================
// ORDENS DE SERVIÇO - APP DO TÉCNICO (mobile-first)
// Caminho: app/tecnico/ordens/page.tsx
// v5 — com aviso de "sem conexão" e rascunho automático
// ================================================================================

"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Wrench, ArrowLeft, Clock, Zap, CheckCircle2, MapPin, Phone,
  User, ChevronRight, Loader2, AlertTriangle, MessageCircle,
  Navigation, X, Send, WifiOff
} from 'lucide-react';

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
  clientes: { id: string; nome: string; cpf: string; telefone: string; bairro: string; cidade: string } | null;
  tecnico: { id: string; nome: string } | null;
}

const TIPOS: Record<string, string> = {
  reparo: 'Reparo', manutencao: 'Manutenção',
  troca_equipamento: 'Troca Equipamento', mudanca_endereco: 'Mudança Endereço', retirada: 'Retirada',
};

const PRIO_CONF: Record<string, { label: string; cor: string; bg: string }> = {
  baixa: { label: 'Baixa', cor: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  media: { label: 'Média', cor: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  alta: { label: 'Alta', cor: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  urgente: { label: 'Urgente', cor: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
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

export default function TecnicoOrdensPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [detalhe, setDetalhe] = useState<OS | null>(null);
  const [observacao, setObservacao] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'hoje' | 'proximas' | 'concluidas'>('hoje');
  const [gpsApp, setGpsApp] = useState('google');

  // ==================== DETECTOR DE CONEXÃO ====================
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const ficarOnline = () => setOnline(true);
    const ficarOffline = () => setOnline(false);
    window.addEventListener('online', ficarOnline);
    window.addEventListener('offline', ficarOffline);
    return () => {
      window.removeEventListener('online', ficarOnline);
      window.removeEventListener('offline', ficarOffline);
    };
  }, []);

  // ==================== RASCUNHO AUTOMÁTICO ====================
  // Salva a observação no localStorage a cada tecla
  const salvarRascunho = (osId: string, texto: string) => {
    try { localStorage.setItem(`v5_rascunho_os_${osId}`, texto); } catch (e) {}
  };

  // Carrega rascunho quando abre uma OS
  const carregarRascunho = (osId: string): string => {
    try { return localStorage.getItem(`v5_rascunho_os_${osId}`) || ''; } catch (e) { return ''; }
  };

  // Limpa rascunho quando conclui a OS
  const limparRascunho = (osId: string) => {
    try { localStorage.removeItem(`v5_rascunho_os_${osId}`); } catch (e) {}
  };

  // Quando o técnico muda a observação, salva como rascunho
  const handleObservacaoChange = (texto: string) => {
    setObservacao(texto);
    if (detalhe?.id) salvarRascunho(detalhe.id, texto);
  };

  // Carregar preferência de GPS
  useEffect(() => {
    try {
      const pref = localStorage.getItem('v5_gps_app');
      if (pref) setGpsApp(pref);
    } catch (e) {}
  }, []);

  const carregarOS = useCallback(async () => {
    try {
      const res = await fetch('/api/ordens-servico');
      if (res.ok) {
        const data = await res.json();
        setOrdens(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao carregar OS:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarOS(); }, [carregarOS]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('tec-os-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens_servico' }, () => carregarOS())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [carregarOS]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => carregarOS(), 30000);
    return () => clearInterval(interval);
  }, [carregarOS]);

  // ==================== SEPARAÇÃO DAS OS POR ABA ====================
  const hojeStr = new Date().toISOString().slice(0, 10);

  const pendentes = ordens.filter(os => ['aberta', 'agendada', 'em_deslocamento', 'em_execucao'].includes(os.status))
    .sort((a, b) => {
      const ordem: Record<string, number> = { em_execucao: 0, em_deslocamento: 1, agendada: 2, aberta: 3 };
      const diff = (ordem[a.status] ?? 3) - (ordem[b.status] ?? 3);
      if (diff !== 0) return diff;
      return new Date(a.agendada_para || a.created_at).getTime() - new Date(b.agendada_para || b.created_at).getTime();
    });

  const hoje = pendentes.filter(os => {
    if (os.status === 'em_execucao' || os.status === 'em_deslocamento') return true;
    const dataOS = os.agendada_para || os.created_at;
    return dataOS.slice(0, 10) <= hojeStr;
  });

  const proximas = pendentes.filter(os => {
    if (os.status === 'em_execucao' || os.status === 'em_deslocamento') return false;
    const dataOS = os.agendada_para || os.created_at;
    return dataOS.slice(0, 10) > hojeStr;
  });

  const concluidas = ordens.filter(os => ['concluida', 'cancelada'].includes(os.status))
    .sort((a, b) => new Date(b.concluida_em || b.created_at).getTime() - new Date(a.concluida_em || a.created_at).getTime());

  const emExecucao = pendentes.find(os => os.status === 'em_execucao');

  // ==================== AÇÕES ====================
  const atualizarOS = async (id: string, campos: any) => {
    setAtualizando(true);
    try {
      const res = await fetch('/api/ordens-servico', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...campos }),
      });
      if (res.ok) {
        const osAtualizada = await res.json();
        carregarOS();
        if (campos.status === 'concluida') {
          limparRascunho(id);
          setDetalhe(null);
          setObservacao('');
        } else {
          setDetalhe(osAtualizada);
        }
      }
    } catch (e) {
      console.error('Erro ao atualizar:', e);
    } finally {
      setAtualizando(false);
    }
  };

  const abrirGPS = (endereco: string) => {
    const encoded = encodeURIComponent(endereco);
    if (gpsApp === 'waze') {
      window.open(`https://waze.com/ul?q=${encoded}&navigate=yes`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
    }
  };

  const abrirWhatsApp = (telefone: string, nome: string) => {
    const numero = telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${nome}, sou o técnico da sua ordem de serviço. Estou a caminho!`);
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank');
  };

  // Ao abrir detalhe, carrega o rascunho salvo
  const abrirDetalhe = (os: OS) => {
    setDetalhe(os);
    setObservacao(carregarRascunho(os.id));
  };

  // Ao fechar detalhe, mantém o rascunho salvo (não limpa)
  const fecharDetalhe = () => {
    setDetalhe(null);
    setObservacao('');
  };

  // ==================== TELA DE DETALHE ====================
  if (detalhe) {
    const prio = PRIO_CONF[detalhe.prioridade];
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

        {/* BARRA SEM CONEXÃO */}
        {!online && (
          <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 flex items-center justify-center gap-2 shrink-0">
            <WifiOff className="w-4 h-4 text-red-400" />
            <span className="text-[11px] font-mono font-bold text-red-400">SEM CONEXÃO — suas anotações estão salvas no aparelho</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-zinc-900/80 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={fecharDetalhe}
            className="text-zinc-400 hover:text-white p-1 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-black font-mono text-white">{detalhe.numero}</span>
            <p className="text-[10px] font-mono text-zinc-500">{TIPOS[detalhe.tipo] || detalhe.tipo}</p>
          </div>
          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-1 rounded-full border ${prio?.bg} ${prio?.cor}`}>
            {prio?.label}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">

          {/* Status: Em execução */}
          {detalhe.status === 'em_execucao' && detalhe.iniciada_em && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-mono font-bold text-amber-400">Em execução</p>
                <p className="text-[10px] font-mono text-amber-400/60">Há {tempoDecorrido(detalhe.iniciada_em)}</p>
              </div>
            </div>
          )}

          {/* Status: Em deslocamento */}
          {detalhe.status === 'em_deslocamento' && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex items-center gap-3">
              <Navigation className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <p className="text-xs font-mono font-bold text-purple-400">A caminho do cliente</p>
                <p className="text-[10px] font-mono text-purple-400/60">Deslocamento iniciado</p>
              </div>
            </div>
          )}

          {/* Status: Agendada */}
          {detalhe.status === 'agendada' && detalhe.agendada_para && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <p className="text-xs font-mono font-bold text-sky-400">Agendada</p>
                <p className="text-[10px] font-mono text-sky-400/60">{fmtData(detalhe.agendada_para)}</p>
              </div>
            </div>
          )}

          {/* Cliente */}
          {detalhe.clientes && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Cliente</span>
              <p className="text-base font-bold text-white">{detalhe.clientes.nome}</p>
              {detalhe.clientes.telefone && (
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" /> {detalhe.clientes.telefone}
                </p>
              )}
              {detalhe.endereco && (
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {detalhe.endereco}
                </p>
              )}

              {/* Botões GPS e WhatsApp */}
              <div className="flex gap-2 mt-3">
                {detalhe.endereco && (
                  <button onClick={() => abrirGPS(detalhe.endereco!)}
                    className="flex-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold uppercase text-[10px] py-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform min-h-[44px]">
                    <Navigation className="w-4 h-4" /> Navegar
                  </button>
                )}
                {detalhe.clientes.telefone && (
                  <button onClick={() => abrirWhatsApp(detalhe.clientes!.telefone, detalhe.clientes!.nome)}
                    className="flex-1 bg-green-500/10 border border-green-500/20 text-green-400 font-mono font-bold uppercase text-[10px] py-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform min-h-[44px]">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Descrição do problema */}
          {detalhe.descricao && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Problema Relatado</span>
              <p className="text-sm text-zinc-300 leading-relaxed">{detalhe.descricao}</p>
            </div>
          )}

          {/* Observação do técnico (para concluir) — com rascunho automático */}
          {detalhe.status === 'em_execucao' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Sua Observação</span>
                {observacao.length > 0 && (
                  <span className="text-[9px] font-mono text-emerald-500/60">Rascunho salvo</span>
                )}
              </div>
              <textarea
                value={observacao}
                onChange={(e) => handleObservacaoChange(e.target.value)}
                placeholder="O que foi feito? Ex: Troca de cabo, realinhamento da antena..."
                rows={3}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-base text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
          )}

          {/* Info de datas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Informações</span>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-mono text-zinc-500">Criada</span>
                <span className="text-[10px] font-mono text-zinc-300">{fmtData(detalhe.created_at)}</span>
              </div>
              {detalhe.agendada_para && (
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Agendada</span>
                  <span className="text-[10px] font-mono text-sky-400">{fmtData(detalhe.agendada_para)}</span>
                </div>
              )}
              {detalhe.iniciada_em && (
                <div className="flex justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Iniciada</span>
                  <span className="text-[10px] font-mono text-amber-400">{fmtData(detalhe.iniciada_em)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== BOTÕES DE AÇÃO - fixo no rodapé ==================== */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 p-4 space-y-2">
          {/* PASSO 1: INICIAR DESLOCAMENTO */}
          {(detalhe.status === 'aberta' || detalhe.status === 'agendada') && (
            <button
              onClick={() => atualizarOS(detalhe.id, { status: 'em_deslocamento' })}
              disabled={atualizando || !online}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              Iniciar Deslocamento
            </button>
          )}

          {/* PASSO 2: CHEGUEI / INICIAR SERVIÇO */}
          {detalhe.status === 'em_deslocamento' && (
            <button
              onClick={() => atualizarOS(detalhe.id, { status: 'em_execucao' })}
              disabled={atualizando || !online}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Cheguei — Iniciar Serviço
            </button>
          )}

          {/* PASSO 3: CONCLUIR */}
          {detalhe.status === 'em_execucao' && (
            <button
              onClick={() => atualizarOS(detalhe.id, { status: 'concluida', observacoes_tecnico: observacao || null })}
              disabled={atualizando || !online}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[52px]"
            >
              {atualizando ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Concluir OS
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==================== TELA PRINCIPAL (LISTA) ====================
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* BARRA SEM CONEXÃO */}
      {!online && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-[11px] font-mono font-bold text-red-400">SEM CONEXÃO</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/tecnico')}
          className="text-zinc-400 hover:text-white p-1 cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Wrench className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-base font-black uppercase font-mono text-white">Minhas OS</h1>
          <p className="text-[10px] font-mono text-zinc-500">{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* OS em execução (destaque) */}
      {emExecucao && (
        <div className="mx-4 mt-4">
          <button onClick={() => abrirDetalhe(emExecucao)}
            className="w-full bg-amber-500/10 border-2 border-amber-500/30 rounded-xl p-4 text-left cursor-pointer active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400">Executando Agora</span>
              {emExecucao.iniciada_em && (
                <span className="text-[10px] font-mono text-amber-400/60 ml-auto">
                  {tempoDecorrido(emExecucao.iniciada_em)}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-white">{emExecucao.numero} · {TIPOS[emExecucao.tipo] || emExecucao.tipo}</p>
            {emExecucao.clientes && (
              <p className="text-xs text-zinc-400 mt-1">{emExecucao.clientes.nome}</p>
            )}
            {emExecucao.endereco && (
              <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {emExecucao.endereco}
              </p>
            )}
            <div className="flex items-center justify-end mt-2">
              <span className="text-[10px] font-mono text-amber-400">Toque para ver detalhes</span>
              <ChevronRight className="w-4 h-4 text-amber-400 ml-1" />
            </div>
          </button>
        </div>
      )}

      {/* Abas: Hoje / Próximas / Feitas */}
      <div className="flex mx-4 mt-4 bg-zinc-900 rounded-lg border border-zinc-800 p-0.5">
        <button
          onClick={() => setAbaAtiva('hoje')}
          className={`flex-1 text-[10px] font-mono font-bold uppercase py-2.5 rounded-md transition-colors cursor-pointer min-h-[36px] ${
            abaAtiva === 'hoje' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Hoje ({hoje.length})
        </button>
        <button
          onClick={() => setAbaAtiva('proximas')}
          className={`flex-1 text-[10px] font-mono font-bold uppercase py-2.5 rounded-md transition-colors cursor-pointer min-h-[36px] ${
            abaAtiva === 'proximas' ? 'bg-sky-500/20 text-sky-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Próximas ({proximas.length})
        </button>
        <button
          onClick={() => setAbaAtiva('concluidas')}
          className={`flex-1 text-[10px] font-mono font-bold uppercase py-2.5 rounded-md transition-colors cursor-pointer min-h-[36px] ${
            abaAtiva === 'concluidas' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Feitas ({concluidas.length})
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 px-4 py-3 space-y-2 pb-6">
        {carregando ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
        ) : (
          <>
            {/* ABA HOJE */}
            {abaAtiva === 'hoje' && (
              <>
                {hoje.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mx-auto mb-3" />
                    <p className="text-sm font-mono text-zinc-500">Nenhuma OS para hoje</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">Você está em dia!</p>
                  </div>
                ) : (
                  hoje
                    .filter(os => os.id !== emExecucao?.id)
                    .map(os => (
                      <OSCard key={os.id} os={os} onClick={() => abrirDetalhe(os)} />
                    ))
                )}
              </>
            )}

            {/* ABA PRÓXIMAS */}
            {abaAtiva === 'proximas' && (
              <>
                {proximas.length === 0 ? (
                  <div className="text-center py-16">
                    <Clock className="w-12 h-12 text-sky-500/30 mx-auto mb-3" />
                    <p className="text-sm font-mono text-zinc-500">Nenhuma OS agendada</p>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">Novas OS aparecerão aqui</p>
                  </div>
                ) : (
                  proximas.map(os => (
                    <OSCard key={os.id} os={os} onClick={() => abrirDetalhe(os)} />
                  ))
                )}
              </>
            )}

            {/* ABA FEITAS */}
            {abaAtiva === 'concluidas' && (
              <>
                {concluidas.length === 0 ? (
                  <div className="text-center py-16">
                    <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm font-mono text-zinc-500">Nenhuma OS no histórico</p>
                  </div>
                ) : (
                  concluidas.map(os => (
                    <OSCard key={os.id} os={os} onClick={() => abrirDetalhe(os)} />
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==================== COMPONENTE CARD ====================
function OSCard({ os, onClick }: { os: OS; onClick: () => void }) {
  const prio = PRIO_CONF[os.prioridade];
  const isConcluida = os.status === 'concluida';
  const isCancelada = os.status === 'cancelada';
  const isAgendada = os.status === 'agendada';
  const isDeslocamento = os.status === 'em_deslocamento';

  return (
    <button onClick={onClick}
      className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-left flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform hover:border-zinc-700 min-h-[64px]">

      {/* Ícone de status */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        isConcluida ? 'bg-emerald-500/20' :
        isCancelada ? 'bg-red-500/20' :
        isDeslocamento ? 'bg-purple-500/20' :
        isAgendada ? 'bg-sky-500/20' :
        'bg-zinc-800'
      }`}>
        {isConcluida ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
         isCancelada ? <X className="w-5 h-5 text-red-400" /> :
         isDeslocamento ? <Navigation className="w-5 h-5 text-purple-400" /> :
         isAgendada ? <Clock className="w-5 h-5 text-sky-400" /> :
         <Wrench className="w-5 h-5 text-zinc-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-white">{os.numero}</span>
          <span className={`text-[10px] font-mono font-bold ${prio?.cor}`}>● {prio?.label}</span>
        </div>
        <p className="text-[11px] font-mono text-zinc-500">{TIPOS[os.tipo] || os.tipo}</p>
        {os.clientes && (
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{os.clientes.nome}</p>
        )}
      </div>

      <div className="text-right shrink-0">
        {isDeslocamento && (
          <span className="text-[10px] font-mono text-purple-400">A caminho</span>
        )}
        {isAgendada && os.agendada_para && (
          <span className="text-[10px] font-mono text-sky-400">{fmtData(os.agendada_para)}</span>
        )}
        {isConcluida && os.concluida_em && (
          <span className="text-[10px] font-mono text-emerald-400/60">{fmtData(os.concluida_em)}</span>
        )}
        {isCancelada && (
          <span className="text-[10px] font-mono text-red-400/60">Cancelada</span>
        )}
        <ChevronRight className="w-4 h-4 text-zinc-700 ml-auto mt-0.5" />
      </div>
    </button>
  );
}