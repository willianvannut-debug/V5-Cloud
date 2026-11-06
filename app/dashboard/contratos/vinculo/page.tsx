// app/dashboard/contratos/vinculo-cliente/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Calendar,
  CreditCard,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
}

interface Plano {
  id: string;
  nome: string;
  velocidade_download: number;
  velocidade_upload: number;
  valor: number;
  tipo: string;
}

export default function VinculoClientePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [planoSelecionado, setPlanoSelecionado] = useState("");
  const [billingDay, setBillingDay] = useState("10");
  const [billingType, setBillingType] = useState("BOLETO");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("v5_tenant_id") || ""
      : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
  };

  // Carregar planos ativos
  useEffect(() => {
    if (!tenantId) return;
    fetch("/api/contratos/planos?ativos=true", { headers })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlanos(data);
      })
      .catch(console.error);
  }, [tenantId]);

  // Buscar clientes com debounce
  useEffect(() => {
    if (!tenantId || buscaCliente.length < 2) {
      setClientes([]);
      setDropdownAberto(false);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoClientes(true);
      try {
        // Ajuste esta URL para o endpoint real de busca de clientes do seu projeto
        const res = await fetch(
          `/api/clientes?search=${encodeURIComponent(buscaCliente)}`,
          { headers }
        );
        const data = await res.json();
        const lista = Array.isArray(data) ? data : data.data || [];
        setClientes(lista);
        setDropdownAberto(lista.length > 0);
      } catch {
        setClientes([]);
      } finally {
        setBuscandoClientes(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [buscaCliente, tenantId]);

  // Selecionar cliente do dropdown
  function selecionarCliente(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setBuscaCliente(cliente.nome);
    setDropdownAberto(false);
  }

  // Plano selecionado (dados)
  const planoAtual = planos.find((p) => p.id === planoSelecionado);

  // Criar contrato
  async function criarContrato() {
    if (!clienteSelecionado) {
      setResultado({ tipo: "erro", msg: "Selecione um cliente" });
      return;
    }
    if (!planoSelecionado) {
      setResultado({ tipo: "erro", msg: "Selecione um plano" });
      return;
    }

    setSalvando(true);
    setResultado(null);

    try {
      const res = await fetch("/api/contratos/vinculo", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cliente_id: clienteSelecionado.id,
          plano_id: planoSelecionado,
          billing_day: Number(billingDay),
          billing_type: billingType,
          start_date: startDate,
          observacoes: observacoes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setResultado({ tipo: "erro", msg: err.error || "Erro ao criar contrato" });
        return;
      }

      setResultado({ tipo: "sucesso", msg: "Contrato criado com sucesso!" });
      // Limpar formulário
      setClienteSelecionado(null);
      setBuscaCliente("");
      setPlanoSelecionado("");
      setBillingDay("10");
      setBillingType("BOLETO");
      setObservacoes("");
    } catch {
      setResultado({ tipo: "erro", msg: "Erro de conexão" });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
          Vínculo Cliente
        </h1>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Associe um cliente a um plano para criar um contrato
        </p>
      </div>

      {/* Resultado */}
      {resultado && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
            resultado.tipo === "sucesso"
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-red-500/10 border-red-500/20"
          }`}
        >
          {resultado.tipo === "sucesso" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <p
            className={`text-xs font-mono ${
              resultado.tipo === "sucesso" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {resultado.msg}
          </p>
          <button
            onClick={() => setResultado(null)}
            className="ml-auto text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buscar Cliente */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-black uppercase font-mono text-white">
                Cliente
              </h2>
            </div>

            <div className="relative">
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                Buscar Cliente (nome ou CPF/CNPJ)
              </label>
              <input
                type="text"
                value={buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  if (clienteSelecionado) setClienteSelecionado(null);
                }}
                placeholder="Digite o nome ou CPF..."
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {buscandoClientes && (
                <Loader2 className="absolute right-3 top-8 w-4 h-4 text-emerald-500 animate-spin" />
              )}

              {/* Dropdown de clientes */}
              {dropdownAberto && (
                <div className="absolute z-10 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selecionarCliente(c)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                    >
                      <p className="text-xs font-mono font-bold text-white">
                        {c.nome}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-500">
                        {c.cpf_cnpj || "Sem documento"} · {c.email || "Sem e-mail"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cliente selecionado */}
            {clienteSelecionado && (
              <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <p className="text-xs font-mono text-emerald-400 font-bold">
                  ✓ {clienteSelecionado.nome}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {clienteSelecionado.cpf_cnpj} · {clienteSelecionado.email} ·{" "}
                  {clienteSelecionado.telefone}
                </p>
              </div>
            )}
          </div>

          {/* Selecionar Plano */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-black uppercase font-mono text-white">
                Plano
              </h2>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                Selecionar Plano
              </label>
              <select
                value={planoSelecionado}
                onChange={(e) => setPlanoSelecionado(e.target.value)}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option value="">Selecione um plano...</option>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {p.velocidade_download}/{p.velocidade_upload} Mbps — R${" "}
                    {Number(p.valor).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {planoAtual && (
              <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase text-zinc-500">
                    Download
                  </p>
                  <p className="text-xs font-mono text-white font-bold">
                    {planoAtual.velocidade_download} Mbps
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-zinc-500">
                    Upload
                  </p>
                  <p className="text-xs font-mono text-white font-bold">
                    {planoAtual.velocidade_upload} Mbps
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-zinc-500">
                    Valor
                  </p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">
                    R$ {Number(planoAtual.valor).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dados do Contrato */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-black uppercase font-mono text-white">
                Dados do Contrato
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  Dia de Vencimento
                </label>
                <select
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Dia {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  Forma de Pagamento
                </label>
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  <option value="BOLETO">Boleto</option>
                  <option value="PIX">PIX</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                Observações
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações opcionais..."
                rows={3}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Resumo lateral */}
        <div className="lg:col-span-1">
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5 sticky top-6">
            <h2 className="text-sm font-black uppercase font-mono text-white mb-4">
              Resumo do Contrato
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  Cliente
                </span>
                <span className="text-xs font-mono text-white text-right max-w-[60%]">
                  {clienteSelecionado?.nome || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  Plano
                </span>
                <span className="text-xs font-mono text-white">
                  {planoAtual?.nome || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  Valor Mensal
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {planoAtual
                    ? `R$ ${Number(planoAtual.valor).toFixed(2)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  Vencimento
                </span>
                <span className="text-xs font-mono text-white">
                  Dia {billingDay}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  Pagamento
                </span>
                <span className="text-xs font-mono text-white">
                  {billingType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  Início
                </span>
                <span className="text-xs font-mono text-white">
                  {startDate}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800">
              <button
                onClick={criarContrato}
                disabled={salvando || !clienteSelecionado || !planoSelecionado}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-mono font-bold uppercase text-xs px-4 py-3 rounded-lg transition-colors"
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Criar Contrato
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}