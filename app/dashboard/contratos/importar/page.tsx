// app/dashboard/contratos/importar/page.tsx
// Importar contrato existente (PDF, DOCX ou texto)
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileUp,
  Save,
  Loader2,
  FileText,
  File,
  X,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";

export default function ImportarContratoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [conteudo, setConteudo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("v5_tenant_id") || ""
      : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
  };

  function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const permitidos = ["pdf", "docx", "doc", "txt", "html"];
    if (!permitidos.includes(ext || "")) {
      setErro("Formato não suportado. Use PDF, DOCX, DOC, TXT ou HTML.");
      return;
    }
    setArquivo(file);
    setErro("");
    if (!titulo) setTitulo(file.name.replace(/\.[^.]+$/, ""));

    // Se for TXT ou HTML, ler conteúdo
    if (ext === "txt" || ext === "html" || ext === "htm") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (ext === "txt") {
          setConteudo(`<pre style="white-space: pre-wrap; font-family: 'Segoe UI', sans-serif; font-size: 13px; line-height: 1.7;">${text}</pre>`);
        } else {
          setConteudo(text);
        }
      };
      reader.readAsText(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setArrastando(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setArrastando(true);
  }

  async function salvar() {
    if (!titulo.trim()) {
      setErro("Preencha o título do contrato");
      return;
    }
    if (!arquivo && !conteudo.trim()) {
      setErro("Faça upload de um arquivo ou cole o conteúdo do contrato");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      const payload = {
        titulo: titulo.trim(),
        cliente_nome: clienteNome || null,
        cliente_documento: clienteDocumento || null,
        conteudo: conteudo || null,
        status,
        tipo: "importado",
        arquivo_nome: arquivo?.name || null,
        observacoes: observacoes || null,
      };

      const res = await fetch("/api/contratos/documentos", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar");
      setSucesso(true);
      setTimeout(() => router.push("/dashboard/contratos"), 1200);
    } catch {
      setErro("Erro ao salvar contrato importado");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard/contratos")}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
            Importar Contrato
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Importe um contrato existente (PDF, DOCX, TXT)
          </p>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </button>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs font-mono text-red-400">{erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-mono text-emerald-400">Contrato importado com sucesso! Redirecionando...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda — Upload + Dados */}
        <div className="space-y-4">
          {/* Upload */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black uppercase tracking-tight font-mono text-white">Arquivo</h2>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.doc,.txt,.html,.htm"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />

            {arquivo ? (
              <div className="flex items-center gap-3 bg-black/50 border border-zinc-800 rounded-lg px-4 py-3">
                <File className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-white truncate">{arquivo.name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">
                    {(arquivo.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => { setArquivo(null); setConteudo(""); }}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setArrastando(false)}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  arrastando
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-zinc-800 hover:border-zinc-600"
                }`}
              >
                <FileUp className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm font-mono text-zinc-400 mb-1">
                  Arraste um arquivo aqui
                </p>
                <p className="text-[10px] font-mono text-zinc-600">
                  ou clique para selecionar · PDF, DOCX, TXT, HTML
                </p>
              </div>
            )}
          </div>

          {/* Dados */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black uppercase tracking-tight font-mono text-white">Informações</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Título *</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Nome do contrato"
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={clienteDocumento}
                    onChange={(e) => setClienteDocumento(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Status</label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono appearance-none focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="ativo">Ativo</option>
                    <option value="assinado">Assinado</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Notas internas..."
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita — Conteúdo / Preview */}
        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">
          <div className="border-b border-zinc-800 px-5 py-3">
            <h2 className="text-sm font-black uppercase tracking-tight font-mono text-white">
              Conteúdo do Contrato
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Cole o texto/HTML do contrato ou faça upload de um arquivo
            </p>
          </div>
          <div className="p-4">
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              rows={28}
              placeholder="Cole aqui o conteúdo do contrato em texto ou HTML...&#10;&#10;Se fez upload de um TXT ou HTML, o conteúdo aparecerá aqui automaticamente.&#10;Para PDF e DOCX, preencha o registro e o arquivo ficará vinculado."
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}