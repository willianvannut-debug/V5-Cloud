"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  Info,
} from "lucide-react";

// ── Tipos ──────────────────────────────────────────────
interface SlaConfig {
  id: string;
  empresa_id: string;
  prioridade: string;
  horas_resposta: number;
  horas_resolucao: number;
}

const PRIORIDADE_META: Record<
  string,
  { label: string; color: string; bgColor: string; desc: string }
> = {
  urgente: {
    label: "Urgente",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    desc: "Situações críticas que afetam vários clientes ou impedem totalmente o uso do serviço",
  },
  alta: {
    label: "Alta",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    desc: "Cliente totalmente sem serviço ou equipamento com defeito grave",
  },
  media: {
    label: "Média",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    desc: "Lentidão, instabilidade intermitente ou problemas parciais",
  },
  baixa: {
    label: "Baixa",
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
    desc: "Dúvidas, segunda via, troca de plano, mudança de endereço",
  },
};

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

function formatHoras(h: number): string {
  if (h < 24) return `${h}h`;
  const dias = Math.floor(h / 24);
  const resto = h % 24;
  if (resto === 0) return `${dias}d`;
  return `${dias}d ${resto}h`;
}

// ── Página ─────────────────────────────────────────────
export default function PrioridadesSlaPage() {
  const [configs, setConfigs] = useState<SlaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<
    Record<string, { horas_resposta: number; horas_resolucao: number }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  async function fetchSla() {
    try {
      const data = await apiFetch("/api/suporte/sla");
      setConfigs(data);
      // Inicializar valores de edição
      const values: typeof editValues = {};
      data.forEach((c: SlaConfig) => {
        values[c.id] = {
          horas_resposta: c.horas_resposta,
          horas_resolucao: c.horas_resolucao,
        };
      });
      setEditValues(values);
    } catch (e) {
      console.error("Erro ao carregar SLA:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSla();
  }, []);

  function handleChange(id: string, field: string, value: string) {
    const num = parseInt(value) || 0;
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: num },
    }));
  }

  function hasChanges(config: SlaConfig): boolean {
    const edit = editValues[config.id];
    if (!edit) return false;
    return (
      edit.horas_resposta !== config.horas_resposta ||
      edit.horas_resolucao !== config.horas_resolucao
    );
  }

  async function handleSave(config: SlaConfig) {
    const edit = editValues[config.id];
    if (!edit) return;

    setSaving(config.id);
    setErro("");

    try {
      await apiFetch("/api/suporte/sla", {
        method: "PUT",
        body: JSON.stringify({
          id: config.id,
          horas_resposta: edit.horas_resposta,
          horas_resolucao: edit.horas_resolucao,
        }),
      });
      setSaved(config.id);
      setTimeout(() => setSaved(null), 2000);
      fetchSla();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Clock size={22} className="text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
            Prioridades / SLA
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            Prazos de resposta e resolução por prioridade
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="border border-zinc-800 bg-zinc-900/40 backdrop-blur rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info size={16} className="text-emerald-500 mt-0.5 shrink-0" />
        <div className="text-xs font-mono text-zinc-400 space-y-1">
          <p>
            <strong className="text-zinc-300">Prazo de 1ª resposta:</strong> tempo
            máximo para o primeiro atendimento ao cliente.
          </p>
          <p>
            <strong className="text-zinc-300">Prazo de resolução:</strong> tempo máximo
            para resolver o chamado completamente.
          </p>
          <p className="text-zinc-500">
            Os prazos são calculados a partir da abertura do chamado. Chamados que
            ultrapassam o prazo aparecem como "atrasados" na tela de tickets.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-emerald-500" />
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="mb-4 flex items-center gap-2 text-red-400 text-xs font-mono border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-3">
          <AlertTriangle size={14} />
          {erro}
        </div>
      )}

      {/* Tabela de SLA */}
      {!loading && (
        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">
          {/* Header da tabela */}
          <div className="grid grid-cols-[1fr_200px_200px_80px] gap-4 px-5 py-3 border-b border-zinc-800 bg-zinc-900/60">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
              Prioridade
            </span>
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
              Prazo 1ª resposta
            </span>
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
              Prazo resolução
            </span>
            <span />
          </div>

          {/* Linhas */}
          {configs.map((config) => {
            const meta = PRIORIDADE_META[config.prioridade] || {
              label: config.prioridade,
              color: "text-zinc-400",
              bgColor: "bg-zinc-700",
              desc: "",
            };
            const edit = editValues[config.id];
            const changed = hasChanges(config);

            return (
              <div
                key={config.id}
                className="grid grid-cols-[1fr_200px_200px_80px] gap-4 px-5 py-4 border-b border-zinc-800/50 items-center hover:bg-zinc-800/20 transition-colors"
              >
                {/* Prioridade */}
                <div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${meta.bgColor} ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-zinc-600 mt-1.5 max-w-xs">
                    {meta.desc}
                  </p>
                </div>

                {/* Horas resposta */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={edit?.horas_resposta ?? config.horas_resposta}
                    onChange={(e) =>
                      handleChange(config.id, "horas_resposta", e.target.value)
                    }
                    className="w-20 bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono text-center focus:border-emerald-500/50 focus:outline-none transition-colors"
                  />
                  <span className="text-[11px] font-mono text-zinc-600">
                    horas ({formatHoras(edit?.horas_resposta ?? config.horas_resposta)})
                  </span>
                </div>

                {/* Horas resolução */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={edit?.horas_resolucao ?? config.horas_resolucao}
                    onChange={(e) =>
                      handleChange(config.id, "horas_resolucao", e.target.value)
                    }
                    className="w-20 bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono text-center focus:border-emerald-500/50 focus:outline-none transition-colors"
                  />
                  <span className="text-[11px] font-mono text-zinc-600">
                    horas ({formatHoras(edit?.horas_resolucao ?? config.horas_resolucao)})
                  </span>
                </div>

                {/* Botão salvar */}
                <div className="flex justify-center">
                  {changed && (
                    <button
                      onClick={() => handleSave(config)}
                      disabled={saving === config.id}
                      className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black transition-colors disabled:opacity-50"
                      title="Salvar alterações"
                    >
                      {saving === config.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : saved === config.id ? (
                        <Check size={14} />
                      ) : (
                        <Save size={14} />
                      )}
                    </button>
                  )}
                  {!changed && saved === config.id && (
                    <div className="p-2 text-emerald-500">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Vazio */}
          {configs.length === 0 && (
            <div className="text-center py-12">
              <Clock size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm font-mono text-zinc-500">
                Nenhuma configuração de SLA encontrada
              </p>
              <p className="text-xs font-mono text-zinc-600 mt-1">
                Execute o seed de SLA no Supabase
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}