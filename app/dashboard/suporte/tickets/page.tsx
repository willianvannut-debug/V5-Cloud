"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Loader2,
  X,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Eye,
  StickyNote,
  MessageCircle,
  UserCog,
  Hash,
  ChevronRight,
  Phone,
  MapPin,
  User,
  Image as ImageIcon,
  Download,
} from "lucide-react";

// ── Supabase client (frontend, para Realtime) ──────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseRealtime = createClient(supabaseUrl, supabaseAnonKey);

// ── Tipos ──────────────────────────────────────────────
interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  whatsapp?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface Categoria {
  id: string;
  nome: string;
}

interface Chamado {
  id: string;
  empresa_id: string;
  protocolo: string;
  cliente_id: string;
  categoria_id: string;
  assunto: string;
  descricao: string;
  prioridade: string;
  status: string;
  origem: string;
  tecnico_id: string | null;
  prazo_sla: string;
  primeira_resposta_em: string | null;
  resolvido_em: string | null;
  created_at: string;
  updated_at: string;
  cliente: Cliente;
  categoria: Categoria | null;
}

interface Mensagem {
  id: string;
  chamado_id: string;
  autor_tipo: string;
  autor_id: string | null;
  autor_nome: string;
  mensagem: string;
  interna: boolean;
  anexo_url: string | null;
  lida: boolean;
  created_at: string;
}

// ── Constantes ────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  aberto: { label: "Aberto", color: "bg-sky-500/20 text-sky-400 border-sky-500/30", icon: Circle },
  em_andamento: { label: "Em andamento", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  aguardando_cliente: { label: "Aguardando", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: Eye },
  resolvido: { label: "Resolvido", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  fechado: { label: "Fechado", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: X },
};

const PRIORIDADE_MAP: Record<string, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-sky-500/20 text-sky-400" },
  media: { label: "Média", color: "bg-amber-500/20 text-amber-400" },
  alta: { label: "Alta", color: "bg-orange-500/20 text-orange-400" },
  urgente: { label: "Urgente", color: "bg-red-500/20 text-red-400" },
};

const STATUS_OPTIONS = ["aberto", "em_andamento", "aguardando_cliente", "resolvido", "fechado"];
const PRIORIDADE_OPTIONS = ["baixa", "media", "alta", "urgente"];

// ── Helpers ────────────────────────────────────────────
function getTenantId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("v5_tenant_id") || "";
}

async function apiFetch(url: string, options?: RequestInit) {
  const tenantId = getTenantId();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || "Erro na requisição");
  }
  return res.json();
}

function tempoDesde(dataStr: string): string {
  const agora = new Date();
  const data = new Date(dataStr);
  const diff = agora.getTime() - data.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const dias = Math.floor(hrs / 24);
  return `${dias}d`;
}

function tempoRestanteSla(prazoSla: string): { texto: string; estourado: boolean } {
  const agora = new Date();
  const prazo = new Date(prazoSla);
  const diff = prazo.getTime() - agora.getTime();
  if (diff <= 0) {
    const min = Math.abs(Math.floor(diff / 60000));
    const hrs = Math.floor(min / 60);
    if (hrs < 1) return { texto: `${min}m atrás`, estourado: true };
    if (hrs < 24) return { texto: `${hrs}h atrás`, estourado: true };
    return { texto: `${Math.floor(hrs / 24)}d atrás`, estourado: true };
  }
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(min / 60);
  if (hrs < 1) return { texto: `${min}m`, estourado: false };
  if (hrs < 24) return { texto: `${hrs}h ${min % 60}m`, estourado: false };
  return { texto: `${Math.floor(hrs / 24)}d ${hrs % 24}h`, estourado: false };
}

function formatData(d: string): string {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Modal Novo Chamado ─────────────────────────────────
function ModalNovoChamado({
  categorias,
  onClose,
  onSaved,
}: {
  categorias: Categoria[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [categoriaId, setCategoriaId] = useState("");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [buscando, setBuscando] = useState(false);

  async function buscarClientes() {
    if (buscaCliente.length < 2) return;
    setBuscando(true);
    try {
      const tenantId = getTenantId();
      const res = await fetch(`/api/clientes?busca=${encodeURIComponent(buscaCliente)}`, {
        headers: { "x-tenant-id": tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setClientes(Array.isArray(data) ? data.slice(0, 10) : data.data?.slice(0, 10) || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuscando(false);
    }
  }

  async function handleSave() {
    if (!clienteSel || !assunto.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/suporte/chamados", {
        method: "POST",
        body: JSON.stringify({
          cliente_id: clienteSel.id,
          categoria_id: categoriaId || null,
          assunto: assunto.trim(),
          descricao: descricao.trim(),
          origem: "painel",
        }),
      });
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-zinc-800 bg-zinc-900/95 backdrop-blur rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight font-mono text-white">
            Novo Chamado
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Buscar cliente */}
          {!clienteSel ? (
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1.5">Cliente</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarClientes()}
                  placeholder="Buscar por nome ou CPF..."
                  className="flex-1 bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                  autoFocus
                />
                <button onClick={buscarClientes} disabled={buscando} className="px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                  {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                </button>
              </div>
              {clientes.length > 0 && (
                <div className="mt-2 border border-zinc-800 rounded-lg max-h-40 overflow-y-auto">
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setClienteSel(c); setClientes([]); }}
                      className="w-full text-left px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 border-b border-zinc-800/50 last:border-0 transition-colors"
                    >
                      <span className="text-white font-bold">{c.nome}</span>
                      <span className="text-zinc-500 ml-2">{c.cpf}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3.5 py-2.5">
              <div>
                <span className="text-xs font-mono font-bold text-white">{clienteSel.nome}</span>
                <span className="text-[11px] font-mono text-zinc-500 ml-2">{clienteSel.cpf}</span>
              </div>
              <button onClick={() => setClienteSel(null)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
            </div>
          )}

          {/* Categoria */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1.5">Categoria</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500/50 focus:outline-none"
            >
              <option value="">Selecione...</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Assunto */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1.5">Assunto</label>
            <input
              type="text"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Resumo do problema..."
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1.5">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes do atendimento..."
              rows={3}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-800 text-xs font-mono font-bold uppercase text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !clienteSel || !assunto.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Abrir Chamado
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────
export default function TicketsPage() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chamadoDetalhe, setChamadoDetalhe] = useState<Chamado | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [novaMsg, setNovaMsg] = useState("");
  const [isInterna, setIsInterna] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [busca, setBusca] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  // ── Fetch chamados ───────────────────────────────────
  const fetchChamados = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.set("status", filtroStatus);
      if (filtroPrioridade) params.set("prioridade", filtroPrioridade);
      if (busca) params.set("busca", busca);
      const data = await apiFetch(`/api/suporte/chamados?${params}`);
      setChamados(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, filtroPrioridade, busca]);

  const fetchCategorias = useCallback(async () => {
    try {
      const data = await apiFetch("/api/suporte/categorias");
      setCategorias(data.filter((c: any) => c.ativo));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchChamados(); fetchCategorias(); }, [fetchChamados, fetchCategorias]);

  // ── Realtime: novos chamados ─────────────────────────
  useEffect(() => {
    const channel = supabaseRealtime
      .channel("chamados-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, () => {
        fetchChamados();
      })
      .subscribe();

    return () => { supabaseRealtime.removeChannel(channel); };
  }, [fetchChamados]);

  // ── Selecionar chamado ───────────────────────────────
  async function selectChamado(id: string) {
    setSelectedId(id);
    setLoadingMsgs(true);
    try {
      const [detalhe, msgs] = await Promise.all([
        apiFetch(`/api/suporte/chamados?id=${id}`),
        apiFetch(`/api/suporte/mensagens?chamado_id=${id}`),
      ]);
      setChamadoDetalhe(detalhe);
      setMensagens(msgs);
    } catch (e) { console.error(e); }
    finally { setLoadingMsgs(false); }
  }

  // ── Realtime: novas mensagens ────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabaseRealtime
      .channel(`msgs-${selectedId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chamado_mensagens",
        filter: `chamado_id=eq.${selectedId}`,
      }, (payload) => {
        setMensagens((prev) => [...prev, payload.new as Mensagem]);
      })
      .subscribe();

    return () => { supabaseRealtime.removeChannel(channel); };
  }, [selectedId]);

  // ── Scroll chat ──────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensagens]);

  // ── Enviar mensagem ──────────────────────────────────
  async function enviarMensagem() {
    if (!novaMsg.trim() || !selectedId) return;
    setEnviando(true);
    try {
      await apiFetch("/api/suporte/mensagens", {
        method: "POST",
        body: JSON.stringify({
          chamado_id: selectedId,
          mensagem: novaMsg.trim(),
          interna: isInterna,
          autor_nome: "Atendente",
        }),
      });
      setNovaMsg("");
      // Refresh do detalhe para pegar status atualizado
      const detalhe = await apiFetch(`/api/suporte/chamados?id=${selectedId}`);
      setChamadoDetalhe(detalhe);
      fetchChamados();
    } catch (e) { console.error(e); }
    finally { setEnviando(false); }
  }

  // ── Exportar conversa ─────────────────────────────────
  async function exportarConversa(incluirInternas: boolean = true) {
    if (!selectedId) return;
    try {
      const tenantId = getTenantId();
      const params = new URLSearchParams({ chamado_id: selectedId });
      if (incluirInternas) params.set("internas", "true");
      const res = await fetch(`/api/suporte/exportar?${params}`, {
        headers: { "x-tenant-id": tenantId },
      });
      if (!res.ok) throw new Error("Erro ao exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chamado-${chamadoDetalhe?.protocolo || selectedId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro ao exportar:", e);
    }
  }

  // ── Atualizar chamado ────────────────────────────────
  async function atualizarChamado(campo: string, valor: string) {
    if (!selectedId) return;
    try {
      await apiFetch("/api/suporte/chamados", {
        method: "PATCH",
        body: JSON.stringify({ id: selectedId, [campo]: valor }),
      });
      const detalhe = await apiFetch(`/api/suporte/chamados?id=${selectedId}`);
      setChamadoDetalhe(detalhe);
      fetchChamados();
    } catch (e) { console.error(e); }
  }

  // ── Cards de resumo ──────────────────────────────────
  const abertos = chamados.filter((c) => c.status === "aberto").length;
  const emAndamento = chamados.filter((c) => c.status === "em_andamento").length;
  const atrasados = chamados.filter((c) =>
    c.status !== "resolvido" && c.status !== "fechado" && c.prazo_sla && new Date(c.prazo_sla) < new Date()
  ).length;
  const resolvidosHoje = chamados.filter((c) => {
    if (!c.resolvido_em) return false;
    const hoje = new Date().toISOString().slice(0, 10);
    return c.resolvido_em.slice(0, 10) === hoje;
  }).length;

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Ticket size={20} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">Tickets</h1>
          </div>
          <button
            onClick={() => setModalNovo(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase transition-colors"
          >
            <Phone size={14} />
            Novo (Telefone)
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Abertos", valor: abertos, cor: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
            { label: "Em andamento", valor: emAndamento, cor: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
            { label: "Atrasados", valor: atrasados, cor: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
            { label: "Resolvidos hoje", valor: resolvidosHoje, cor: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          ].map((card) => (
            <div key={card.label} className={`border rounded-xl p-3 ${card.bg}`}>
              <p className="text-[10px] font-mono uppercase text-zinc-500">{card.label}</p>
              <p className={`text-2xl font-black font-mono ${card.cor} mt-1`}>{card.valor}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar protocolo ou assunto..."
              className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500/50 focus:outline-none"
          >
            <option value="">Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>)}
          </select>
          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500/50 focus:outline-none"
          >
            <option value="">Prioridade</option>
            {PRIORIDADE_OPTIONS.map((p) => <option key={p} value={p}>{PRIORIDADE_MAP[p]?.label || p}</option>)}
          </select>
        </div>
      </div>

      {/* Conteúdo: Lista + Detalhe */}
      <div className="flex-1 flex min-h-0 px-4 pb-4 gap-3">
        {/* === LISTA (esquerda) === */}
        <div className="w-[420px] shrink-0 border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={20} className="animate-spin text-emerald-500" />
              </div>
            )}

            {!loading && chamados.length === 0 && (
              <div className="text-center py-16">
                <Ticket size={32} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-sm font-mono text-zinc-500">Nenhum chamado encontrado</p>
              </div>
            )}

            {!loading && chamados.map((ch) => {
              const st = STATUS_MAP[ch.status] || STATUS_MAP.aberto;
              const pr = PRIORIDADE_MAP[ch.prioridade] || PRIORIDADE_MAP.media;
              const sla = ch.prazo_sla ? tempoRestanteSla(ch.prazo_sla) : null;
              const isSelected = selectedId === ch.id;

              return (
                <button
                  key={ch.id}
                  onClick={() => selectChamado(ch.id)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-all hover:bg-zinc-800/30 ${
                    isSelected ? "bg-zinc-800/50 border-l-2 border-l-emerald-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">
                      #{ch.protocolo}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      {tempoDesde(ch.created_at)}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-white truncate mb-1">
                    {ch.assunto}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500 truncate mb-2">
                    {ch.cliente?.nome || "—"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${st.color}`}>
                      {st.label}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${pr.color}`}>
                      {pr.label}
                    </span>
                    {ch.categoria && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono text-zinc-500 bg-zinc-800">
                        {ch.categoria.nome}
                      </span>
                    )}
                    {sla && ch.status !== "resolvido" && ch.status !== "fechado" && (
                      <span className={`text-[9px] font-mono font-bold ${sla.estourado ? "text-red-400" : "text-zinc-500"}`}>
                        <Clock size={10} className="inline mr-0.5" />
                        {sla.estourado ? "SLA " : ""}{sla.texto}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* === DETALHE (direita) === */}
        <div className="flex-1 border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden flex flex-col">
          {!selectedId && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ChevronRight size={40} className="mx-auto text-zinc-800 mb-3" />
                <p className="text-sm font-mono text-zinc-600">Selecione um chamado</p>
              </div>
            </div>
          )}

          {selectedId && loadingMsgs && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          )}

          {selectedId && !loadingMsgs && chamadoDetalhe && (
            <>
              {/* Cabeçalho do chamado */}
              <div className="p-4 border-b border-zinc-800 shrink-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Hash size={14} className="text-emerald-500" />
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        {chamadoDetalhe.protocolo}
                      </span>
                    </div>
                    <h2 className="text-sm font-bold font-mono text-white">
                      {chamadoDetalhe.assunto}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportarConversa(true)}
                      title="Exportar conversa"
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-colors"
                    >
                      <Download size={14} />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-600">
                      {formatData(chamadoDetalhe.created_at)}
                    </span>
                  </div>
                </div>

                {/* Info do cliente */}
                <div className="flex items-center gap-4 mb-3 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <User size={12} className="text-zinc-600" />
                    {chamadoDetalhe.cliente?.nome}
                  </span>
                  {chamadoDetalhe.cliente?.cpf && (
                    <span className="text-zinc-600">{chamadoDetalhe.cliente.cpf}</span>
                  )}
                  {chamadoDetalhe.cliente?.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} className="text-zinc-600" />
                      {chamadoDetalhe.cliente.telefone}
                    </span>
                  )}
                </div>

                {/* Seletores: status, prioridade */}
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-zinc-600 mb-1">Status</label>
                    <select
                      value={chamadoDetalhe.status}
                      onChange={(e) => atualizarChamado("status", e.target.value)}
                      className="bg-black/50 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-emerald-500/50 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{STATUS_MAP[s]?.label || s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-zinc-600 mb-1">Prioridade</label>
                    <select
                      value={chamadoDetalhe.prioridade}
                      onChange={(e) => atualizarChamado("prioridade", e.target.value)}
                      className="bg-black/50 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-emerald-500/50 focus:outline-none"
                    >
                      {PRIORIDADE_OPTIONS.map((p) => (
                        <option key={p} value={p}>{PRIORIDADE_MAP[p]?.label || p}</option>
                      ))}
                    </select>
                  </div>
                  {chamadoDetalhe.prazo_sla && chamadoDetalhe.status !== "resolvido" && chamadoDetalhe.status !== "fechado" && (
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-zinc-600 mb-1">SLA</label>
                      {(() => {
                        const sla = tempoRestanteSla(chamadoDetalhe.prazo_sla);
                        return (
                          <span className={`text-[11px] font-mono font-bold px-2.5 py-1.5 rounded-lg border ${
                            sla.estourado
                              ? "bg-red-500/10 border-red-500/30 text-red-400"
                              : "bg-zinc-800/50 border-zinc-700 text-zinc-300"
                          }`}>
                            {sla.estourado ? "⚠ Estourado " : ""}
                            {sla.texto}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat */}
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {mensagens.length === 0 && (
                  <p className="text-center text-xs font-mono text-zinc-600 py-8">
                    Nenhuma mensagem ainda
                  </p>
                )}

                {mensagens.map((msg) => {
                  const isCliente = msg.autor_tipo === "cliente";
                  const isSistema = msg.autor_tipo === "sistema";
                  const isInternaMsg = msg.interna;

                  if (isSistema) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[11px] font-mono text-zinc-500 bg-zinc-800/50 px-3 py-1.5 rounded-full">
                          {msg.mensagem}
                        </span>
                      </div>
                    );
                  }

                  if (isInternaMsg) {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[75%] bg-amber-500/10 border border-amber-500/20 rounded-xl rounded-tr-sm px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <StickyNote size={10} className="text-amber-400" />
                            <span className="text-[9px] font-mono font-bold uppercase text-amber-400">
                              Interna — cliente não vê
                            </span>
                          </div>
                          <p className="text-xs font-mono text-amber-200/80">{msg.mensagem}</p>
                          <span className="text-[9px] font-mono text-amber-500/50 mt-1 block">
                            {msg.autor_nome} · {formatData(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isCliente ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 ${
                        isCliente
                          ? "bg-zinc-800/60 border border-zinc-700/50 rounded-tl-sm"
                          : "bg-emerald-500/10 border border-emerald-500/20 rounded-tr-sm"
                      }`}>
                        <p className={`text-xs font-mono ${isCliente ? "text-zinc-200" : "text-emerald-100"}`}>
                          {msg.mensagem}
                        </p>
                        {msg.anexo_url && (
                          <a href={msg.anexo_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 mt-1.5 text-[10px] font-mono text-sky-400 hover:text-sky-300">
                            <ImageIcon size={11} /> Ver anexo
                          </a>
                        )}
                        <span className={`text-[9px] font-mono mt-1 block ${isCliente ? "text-zinc-600" : "text-emerald-500/50"}`}>
                          {msg.autor_nome} · {formatData(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Campo de envio */}
              <div className="p-3 border-t border-zinc-800 shrink-0">
                {/* Toggle interna/resposta */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setIsInterna(false)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      !isInterna
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    <MessageCircle size={11} /> Responder cliente
                  </button>
                  <button
                    onClick={() => setIsInterna(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                      isInterna
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    }`}
                  >
                    <StickyNote size={11} /> Nota interna
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaMsg}
                    onChange={(e) => setNovaMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviarMensagem()}
                    placeholder={isInterna ? "Nota interna (cliente não vê)..." : "Responder ao cliente..."}
                    className={`flex-1 bg-black/50 border rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      isInterna
                        ? "border-amber-500/30 focus:border-amber-500/50"
                        : "border-zinc-800 focus:border-emerald-500/50"
                    }`}
                  />
                  <button
                    onClick={enviarMensagem}
                    disabled={enviando || !novaMsg.trim()}
                    className={`px-4 py-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors disabled:opacity-50 flex items-center gap-2 ${
                      isInterna
                        ? "bg-amber-500 hover:bg-amber-400 text-black"
                        : "bg-emerald-500 hover:bg-emerald-400 text-black"
                    }`}
                  >
                    {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Enviar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalNovo && (
        <ModalNovoChamado
          categorias={categorias}
          onClose={() => setModalNovo(false)}
          onSaved={() => { setModalNovo(false); fetchChamados(); }}
        />
      )}
    </div>
  );
}