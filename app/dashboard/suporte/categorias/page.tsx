"use client";

import { useEffect, useState } from "react";
import {
  Tag,
  Plus,
  Pencil,
  Power,
  PowerOff,
  AlertTriangle,
  ArrowUpDown,
  Loader2,
  X,
  Check,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────
interface Categoria {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string;
  prioridade_padrao: string;
  ativo: boolean;
  created_at: string;
}

const PRIORIDADES = [
  { value: "baixa", label: "Baixa", color: "bg-sky-500/20 text-sky-400" },
  { value: "media", label: "Média", color: "bg-amber-500/20 text-amber-400" },
  { value: "alta", label: "Alta", color: "bg-orange-500/20 text-orange-400" },
  { value: "urgente", label: "Urgente", color: "bg-red-500/20 text-red-400" },
];

function getPrioridadeBadge(p: string) {
  const found = PRIORIDADES.find((x) => x.value === p);
  if (!found) return { label: p, color: "bg-zinc-700 text-zinc-300" };
  return found;
}

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

// ── Modal de Criar/Editar ──────────────────────────────
function ModalCategoria({
  categoria,
  onClose,
  onSaved,
}: {
  categoria?: Categoria | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!categoria;
  const [nome, setNome] = useState(categoria?.nome || "");
  const [descricao, setDescricao] = useState(categoria?.descricao || "");
  const [prioridade, setPrioridade] = useState(categoria?.prioridade_padrao || "media");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSave() {
    if (!nome.trim()) {
      setErro("Nome é obrigatório");
      return;
    }
    setSaving(true);
    setErro("");
    try {
      if (isEdit) {
        await apiFetch("/api/suporte/categorias", {
          method: "PATCH",
          body: JSON.stringify({
            id: categoria!.id,
            nome: nome.trim(),
            descricao: descricao.trim(),
            prioridade_padrao: prioridade,
          }),
        });
      } else {
        await apiFetch("/api/suporte/categorias", {
          method: "POST",
          body: JSON.stringify({
            nome: nome.trim(),
            descricao: descricao.trim(),
            prioridade_padrao: prioridade,
          }),
        });
      }
      onSaved();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/95 backdrop-blur rounded-xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight font-mono text-white">
            {isEdit ? "Editar Categoria" : "Nova Categoria"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1.5">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Sem conexão"
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1.5">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição breve da categoria..."
              rows={2}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1.5">
              Prioridade padrão
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORIDADES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPrioridade(p.value)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-mono font-bold uppercase border transition-all ${
                    prioridade === p.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "border-zinc-800 bg-black/30 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-xs font-mono">
            <AlertTriangle size={14} />
            {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-800 text-xs font-mono font-bold uppercase text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {isEdit ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ───────────────────────────────────
export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    categoria?: Categoria | null;
  }>({ open: false });

  async function fetchCategorias() {
    try {
      const data = await apiFetch("/api/suporte/categorias");
      setCategorias(data);
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategorias();
  }, []);

  async function toggleAtivo(cat: Categoria) {
    try {
      await apiFetch("/api/suporte/categorias", {
        method: "PATCH",
        body: JSON.stringify({ id: cat.id, ativo: !cat.ativo }),
      });
      fetchCategorias();
    } catch (e) {
      console.error("Erro ao alterar status:", e);
    }
  }

  const ativas = categorias.filter((c) => c.ativo);
  const inativas = categorias.filter((c) => !c.ativo);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Tag size={22} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
              Categorias
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              Categorias de chamados do suporte
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true, categoria: null })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase transition-colors"
        >
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-emerald-500" />
        </div>
      )}

      {/* Lista de categorias ativas */}
      {!loading && (
        <div className="space-y-6">
          {/* Ativas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                Ativas ({ativas.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {ativas.map((cat) => {
                const badge = getPrioridadeBadge(cat.prioridade_padrao);
                return (
                  <div
                    key={cat.id}
                    className="group border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-4 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold font-mono text-white truncate">
                          {cat.nome}
                        </h3>
                        {cat.descricao && (
                          <p className="text-[11px] font-mono text-zinc-500 mt-1 line-clamp-2">
                            {cat.descricao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ open: true, categoria: cat })}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleAtivo(cat)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                          title="Desativar"
                        >
                          <PowerOff size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-600">
                        Prioridade padrão:
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inativas */}
          {inativas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-zinc-600" />
                <span className="text-[10px] font-mono uppercase text-zinc-600 tracking-wider">
                  Inativas ({inativas.length})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {inativas.map((cat) => {
                  const badge = getPrioridadeBadge(cat.prioridade_padrao);
                  return (
                    <div
                      key={cat.id}
                      className="group border border-zinc-900/50 bg-zinc-900/20 backdrop-blur rounded-xl p-4 opacity-60 hover:opacity-80 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold font-mono text-zinc-400 truncate line-through">
                            {cat.nome}
                          </h3>
                          {cat.descricao && (
                            <p className="text-[11px] font-mono text-zinc-600 mt-1 line-clamp-2">
                              {cat.descricao}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModal({ open: true, categoria: cat })}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => toggleAtivo(cat)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-colors"
                            title="Reativar"
                          >
                            <Power size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-zinc-700">
                          Prioridade padrão:
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase opacity-50 ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vazio */}
          {categorias.length === 0 && (
            <div className="text-center py-16">
              <Tag size={40} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-sm font-mono text-zinc-500">
                Nenhuma categoria cadastrada
              </p>
              <p className="text-xs font-mono text-zinc-600 mt-1">
                Crie a primeira categoria para organizar os chamados
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <ModalCategoria
          categoria={modal.categoria}
          onClose={() => setModal({ open: false })}
          onSaved={() => {
            setModal({ open: false });
            fetchCategorias();
          }}
        />
      )}
    </div>
  );
}