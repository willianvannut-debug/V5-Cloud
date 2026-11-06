// app/dashboard/contratos/planos/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit2,
  Power,
  PowerOff,
  Wifi,
  ArrowUpDown,
  DollarSign,
  Package,
  X,
  Save,
  Loader2,
} from "lucide-react";

interface Plano {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  velocidade_download: number;
  velocidade_upload: number;
  valor: number;
  tipo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanoForm {
  nome: string;
  descricao: string;
  velocidade_download: string;
  velocidade_upload: string;
  valor: string;
  tipo: string;
}

const FORM_INICIAL: PlanoForm = {
  nome: "",
  descricao: "",
  velocidade_download: "",
  velocidade_upload: "",
  valor: "",
  tipo: "residencial",
};

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanoForm>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("v5_tenant_id") || ""
      : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
  };

  // Buscar planos
  async function carregarPlanos() {
    setLoading(true);
    try {
      const res = await fetch("/api/contratos/planos", { headers });
      const data = await res.json();
      if (Array.isArray(data)) setPlanos(data);
    } catch {
      console.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tenantId) carregarPlanos();
  }, [tenantId]);

  // Abrir modal para novo plano
  function abrirNovo() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setErro("");
    setModalAberto(true);
  }

  // Abrir modal para editar
  function abrirEdicao(plano: Plano) {
    setForm({
      nome: plano.nome,
      descricao: plano.descricao || "",
      velocidade_download: String(plano.velocidade_download),
      velocidade_upload: String(plano.velocidade_upload),
      valor: String(plano.valor),
      tipo: plano.tipo,
    });
    setEditandoId(plano.id);
    setErro("");
    setModalAberto(true);
  }

  // Salvar (criar ou atualizar)
  async function salvar() {
    if (!form.nome || !form.velocidade_download || !form.velocidade_upload || !form.valor) {
      setErro("Preencha todos os campos obrigatórios");
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const payload = {
        ...(editandoId ? { id: editandoId } : {}),
        nome: form.nome,
        descricao: form.descricao || null,
        velocidade_download: Number(form.velocidade_download),
        velocidade_upload: Number(form.velocidade_upload),
        valor: Number(form.valor),
        tipo: form.tipo,
      };

      const res = await fetch("/api/contratos/planos", {
        method: editandoId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.error || "Erro ao salvar");
        return;
      }

      setModalAberto(false);
      carregarPlanos();
    } catch {
      setErro("Erro de conexão");
    } finally {
      setSalvando(false);
    }
  }

  // Ativar/desativar plano
  async function toggleAtivo(plano: Plano) {
    try {
      if (plano.ativo) {
        // Desativar (soft delete)
        await fetch(`/api/contratos/planos?id=${plano.id}`, {
          method: "DELETE",
          headers,
        });
      } else {
        // Reativar
        await fetch("/api/contratos/planos", {
          method: "PUT",
          headers,
          body: JSON.stringify({ id: plano.id, ativo: true }),
        });
      }
      carregarPlanos();
    } catch {
      console.error("Erro ao alterar status");
    }
  }

  // Resumo
  const planosAtivos = planos.filter((p) => p.ativo);
  const faixaPreco =
    planosAtivos.length > 0
      ? {
          min: Math.min(...planosAtivos.map((p) => Number(p.valor))),
          max: Math.max(...planosAtivos.map((p) => Number(p.valor))),
        }
      : { min: 0, max: 0 };

  const tipoLabel: Record<string, string> = {
    residencial: "Residencial",
    empresarial: "Empresarial",
    rural: "Rural",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
            Planos de Internet
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Gerencie os planos oferecidos aos clientes
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Package className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-zinc-500">
                Planos Ativos
              </p>
              <p className="text-xl font-black font-mono text-white">
                {planosAtivos.length}
              </p>
            </div>
          </div>
        </div>

        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-zinc-500">
                Faixa de Preço
              </p>
              <p className="text-xl font-black font-mono text-white">
                {planosAtivos.length > 0
                  ? `R$ ${faixaPreco.min.toFixed(2)} - R$ ${faixaPreco.max.toFixed(2)}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ArrowUpDown className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-zinc-500">
                Total Cadastrados
              </p>
              <p className="text-xl font-black font-mono text-white">
                {planos.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Planos */}
      <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : planos.length === 0 ? (
          <div className="text-center py-20">
            <Wifi className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-mono text-zinc-500">
              Nenhum plano cadastrado
            </p>
            <button
              onClick={abrirNovo}
              className="mt-4 text-xs font-mono text-emerald-500 hover:text-emerald-400 underline"
            >
              Cadastrar primeiro plano
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-[10px] font-mono uppercase text-zinc-500 px-4 py-3">
                    Nome
                  </th>
                  <th className="text-left text-[10px] font-mono uppercase text-zinc-500 px-4 py-3">
                    Velocidade
                  </th>
                  <th className="text-left text-[10px] font-mono uppercase text-zinc-500 px-4 py-3">
                    Valor
                  </th>
                  <th className="text-left text-[10px] font-mono uppercase text-zinc-500 px-4 py-3">
                    Tipo
                  </th>
                  <th className="text-left text-[10px] font-mono uppercase text-zinc-500 px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-[10px] font-mono uppercase text-zinc-500 px-4 py-3">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {planos.map((plano) => (
                  <tr
                    key={plano.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-mono font-bold text-white">
                          {plano.nome}
                        </p>
                        {plano.descricao && (
                          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            {plano.descricao}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-mono text-zinc-300">
                          {plano.velocidade_download}/{plano.velocidade_upload} Mbps
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        R$ {Number(plano.valor).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-zinc-400">
                        {tipoLabel[plano.tipo] || plano.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          plano.ativo
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {plano.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirEdicao(plano)}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleAtivo(plano)}
                          className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-colors ${
                            plano.ativo
                              ? "text-amber-400 hover:text-amber-300"
                              : "text-emerald-400 hover:text-emerald-300"
                          }`}
                          title={plano.ativo ? "Desativar" : "Ativar"}
                        >
                          {plano.ativo ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="border border-zinc-800 bg-zinc-950 rounded-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black uppercase tracking-tight font-mono text-white">
                {editandoId ? "Editar Plano" : "Novo Plano"}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {erro && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-mono text-red-400">{erro}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: 100 Mega Fibra"
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  Descrição
                </label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  placeholder="Descrição opcional"
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Velocidades */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                    Download (Mbps) *
                  </label>
                  <input
                    type="number"
                    value={form.velocidade_download}
                    onChange={(e) =>
                      setForm({ ...form, velocidade_download: e.target.value })
                    }
                    placeholder="100"
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                    Upload (Mbps) *
                  </label>
                  <input
                    type="number"
                    value={form.velocidade_upload}
                    onChange={(e) =>
                      setForm({ ...form, velocidade_upload: e.target.value })
                    }
                    placeholder="50"
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Valor e Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                    Valor Mensal (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor}
                    onChange={(e) =>
                      setForm({ ...form, valor: e.target.value })
                    }
                    placeholder="99.90"
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({ ...form, tipo: e.target.value })
                    }
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="residencial">Residencial</option>
                    <option value="empresarial">Empresarial</option>
                    <option value="rural">Rural</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors"
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editandoId ? "Atualizar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}