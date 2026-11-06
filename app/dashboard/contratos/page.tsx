// app/dashboard/contratos/page.tsx
// Tela principal — Lista todos os contratos/documentos
"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Plus,
  Download,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  FileSignature,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface Documento {
  id: string;
  titulo: string;
  cliente_nome: string | null;
  cliente_documento: string | null;
  status: string;
  tipo: string;
  conteudo: string | null;
  arquivo_nome: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

const POR_PAGINA = 12;

export default function TodosContratosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modalDetalhe, setModalDetalhe] = useState<Documento | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);

  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("v5_tenant_id") || ""
      : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
  };

  async function carregarDocumentos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroStatus !== "todos") params.set("status", filtroStatus);
      if (busca) params.set("busca", busca);

      const res = await fetch(`/api/contratos/documentos?${params}`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setDocumentos(data);
    } catch {
      console.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tenantId) carregarDocumentos();
  }, [tenantId, filtroStatus]);

  // Busca com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tenantId) carregarDocumentos();
    }, 400);
    return () => clearTimeout(timer);
  }, [busca]);

  async function deletarDocumento(id: string) {
    if (!confirm("Tem certeza que deseja excluir este contrato?")) return;
    setDeletando(id);
    try {
      await fetch(`/api/contratos/documentos?id=${id}`, { method: "DELETE", headers });
      carregarDocumentos();
      if (modalDetalhe?.id === id) setModalDetalhe(null);
    } catch {
      console.error("Erro ao deletar");
    } finally {
      setDeletando(null);
    }
  }

  async function alterarStatus(id: string, novoStatus: string) {
    try {
      await fetch("/api/contratos/documentos", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id, status: novoStatus }),
      });
      carregarDocumentos();
      if (modalDetalhe?.id === id) setModalDetalhe(null);
    } catch {
      console.error("Erro ao alterar status");
    }
  }

  // Exportar / baixar PDF
  function exportarPDF(doc: Documento) {
    if (!doc.conteudo) return;
    const janela = window.open("", "_blank");
    if (!janela) return;
    janela.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${doc.titulo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.7; font-size: 13px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${doc.conteudo}
      <script>window.onload=function(){window.print();window.close();}<\/script>
      </body></html>
    `);
    janela.document.close();
  }

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(documentos.length / POR_PAGINA));
  const docsPagina = documentos.slice(
    (paginaAtual - 1) * POR_PAGINA,
    paginaAtual * POR_PAGINA
  );

  // Resumos
  const rascunhos = documentos.filter((d) => d.status === "rascunho").length;
  const ativos = documentos.filter((d) => d.status === "ativo").length;
  const assinados = documentos.filter((d) => d.status === "assinado").length;
  const cancelados = documentos.filter((d) => d.status === "cancelado").length;

  const statusConfig: Record<string, { label: string; cor: string; icon: any }> = {
    rascunho: { label: "Rascunho", cor: "bg-zinc-500/10 text-zinc-400", icon: Clock },
    ativo: { label: "Ativo", cor: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle },
    assinado: { label: "Assinado", cor: "bg-blue-500/10 text-blue-400", icon: FileSignature },
    cancelado: { label: "Cancelado", cor: "bg-red-500/10 text-red-400", icon: XCircle },
    expirado: { label: "Expirado", cor: "bg-amber-500/10 text-amber-400", icon: AlertTriangle },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
            Contratos
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Gerencie todos os documentos de contrato
          </p>
        </div>
        <a
          href="/dashboard/contratos/novo"
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Contrato
        </a>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Rascunhos", valor: rascunhos, icon: Clock, cor: "text-zinc-400", bg: "bg-zinc-500/10" },
          { label: "Ativos", valor: ativos, icon: CheckCircle, cor: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Assinados", valor: assinados, icon: FileSignature, cor: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Cancelados", valor: cancelados, icon: XCircle, cor: "text-red-400", bg: "bg-red-500/10" },
        ].map((c) => (
          <div key={c.label} className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${c.bg} rounded-lg`}>
                <c.icon className={`w-5 h-5 ${c.cor}`} />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500">{c.label}</p>
                <p className={`text-xl font-black font-mono ${c.cor}`}>{c.valor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
            placeholder="Buscar por título, nome ou CPF..."
            className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "todos", label: "Todos" },
            { value: "rascunho", label: "Rascunho" },
            { value: "ativo", label: "Ativos" },
            { value: "assinado", label: "Assinados" },
            { value: "cancelado", label: "Cancelados" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setFiltroStatus(f.value); setPaginaAtual(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                filtroStatus === f.value
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-mono text-zinc-500">Nenhum contrato encontrado</p>
            <a href="/dashboard/contratos/novo" className="mt-4 inline-block text-xs font-mono text-emerald-500 hover:text-emerald-400 underline">
              Criar primeiro contrato
            </a>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Título", "Cliente", "Tipo", "Status", "Data", "Ações"].map((h, i) => (
                      <th key={h} className={`text-${i === 5 ? "right" : "left"} text-[10px] font-mono uppercase text-zinc-500 px-4 py-3`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docsPagina.map((doc) => {
                    const sc = statusConfig[doc.status] || statusConfig.rascunho;
                    return (
                      <tr key={doc.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono font-bold text-white">{doc.titulo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono text-zinc-300">{doc.cliente_nome || "—"}</p>
                          <p className="text-[10px] font-mono text-zinc-500">{doc.cliente_documento || ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            doc.tipo === "importado" ? "bg-purple-500/10 text-purple-400" : "bg-cyan-500/10 text-cyan-400"
                          }`}>
                            {doc.tipo === "importado" ? "Importado" : "Gerado"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${sc.cor}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-zinc-400">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setModalDetalhe(doc)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Ver">
                              <Eye className="w-4 h-4" />
                            </button>
                            {doc.conteudo && (
                              <button onClick={() => exportarPDF(doc)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors" title="Exportar PDF">
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <a href={`/dashboard/contratos/novo?editar=${doc.id}`} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-colors" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => deletarDocumento(doc.id)}
                              disabled={deletando === doc.id}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                              title="Excluir"
                            >
                              {deletando === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <p className="text-[10px] font-mono text-zinc-500">
                  {documentos.length} contrato(s) · Página {paginaAtual} de {totalPaginas}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Detalhes */}
      {modalDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="border border-zinc-800 bg-zinc-950 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 p-5 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight font-mono text-white">
                {modalDetalhe.titulo}
              </h2>
              <button onClick={() => setModalDetalhe(null)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Cliente", value: modalDetalhe.cliente_nome || "—" },
                  { label: "Documento", value: modalDetalhe.cliente_documento || "—" },
                  { label: "Status", value: (statusConfig[modalDetalhe.status] || statusConfig.rascunho).label },
                  { label: "Tipo", value: modalDetalhe.tipo === "importado" ? "Importado" : "Gerado" },
                  { label: "Criado em", value: new Date(modalDetalhe.created_at).toLocaleDateString("pt-BR") },
                  { label: "Atualizado", value: new Date(modalDetalhe.updated_at).toLocaleDateString("pt-BR") },
                ].map((item) => (
                  <div key={item.label} className="py-2">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">{item.label}</span>
                    <span className="text-xs font-mono text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              {modalDetalhe.observacoes && (
                <div className="py-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block">Observações</span>
                  <span className="text-xs font-mono text-zinc-300">{modalDetalhe.observacoes}</span>
                </div>
              )}

              {/* Preview do conteúdo */}
              {modalDetalhe.conteudo && (
                <div className="border border-zinc-800 rounded-lg bg-white p-6 text-black text-xs leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: modalDetalhe.conteudo }} />
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800">
                {modalDetalhe.status === "rascunho" && (
                  <button onClick={() => alterarStatus(modalDetalhe.id, "ativo")}
                    className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors">
                    <CheckCircle className="w-4 h-4" /> Ativar
                  </button>
                )}
                {modalDetalhe.status === "ativo" && (
                  <button onClick={() => alterarStatus(modalDetalhe.id, "assinado")}
                    className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors">
                    <FileSignature className="w-4 h-4" /> Marcar Assinado
                  </button>
                )}
                {modalDetalhe.status !== "cancelado" && (
                  <button onClick={() => alterarStatus(modalDetalhe.id, "cancelado")}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors">
                    <XCircle className="w-4 h-4" /> Cancelar
                  </button>
                )}
                {modalDetalhe.conteudo && (
                  <button onClick={() => exportarPDF(modalDetalhe)}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors">
                    <Download className="w-4 h-4" /> Exportar PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}