// app/dashboard/contratos/novo/page.tsx
// Criar novo contrato a partir de modelo ou editar existente — Editor Visual
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  User,
  Eye,
  ChevronDown,
  Download,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Minus,
} from "lucide-react";

interface Modelo {
  id: string;
  nome: string;
  descricao: string | null;
  conteudo: string;
}

interface Documento {
  id: string;
  titulo: string;
  cliente_nome: string | null;
  cliente_documento: string | null;
  conteudo: string | null;
  modelo_id: string | null;
  status: string;
  observacoes: string | null;
}

const PLACEHOLDERS = [
  { tag: "{{nome_cliente}}", label: "Nome do Cliente", campo: "nome_cliente" },
  { tag: "{{cpf_cnpj}}", label: "CPF / CNPJ", campo: "cpf_cnpj" },
  { tag: "{{email}}", label: "E-mail", campo: "email" },
  { tag: "{{telefone}}", label: "Telefone", campo: "telefone" },
  { tag: "{{endereco}}", label: "Endereço", campo: "endereco" },
  { tag: "{{plano}}", label: "Plano", campo: "plano" },
  { tag: "{{valor}}", label: "Valor", campo: "valor" },
  { tag: "{{data_inicio}}", label: "Data Início", campo: "data_inicio" },
  { tag: "{{nome_empresa}}", label: "Nome da Empresa", campo: "nome_empresa" },
  { tag: "{{cnpj_empresa}}", label: "CNPJ Empresa", campo: "cnpj_empresa" },
  { tag: "{{endereco_empresa}}", label: "End. Empresa", campo: "endereco_empresa" },
  { tag: "{{data_atual}}", label: "Data Atual", campo: "data_atual" },
];

// =============================================
// Editor Visual (contentEditable com toolbar)
// =============================================
function EditorVisual({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 px-3 py-2 bg-zinc-900/60">
        <button type="button" onClick={() => execCmd("bold")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Negrito">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCmd("italic")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Itálico">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCmd("underline")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Sublinhado">
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-zinc-700 mx-1" />

        <button type="button" onClick={() => execCmd("justifyLeft")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Alinhar esquerda">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCmd("justifyCenter")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Centralizar">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCmd("justifyRight")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Alinhar direita">
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-zinc-700 mx-1" />

        <button type="button" onClick={() => execCmd("insertUnorderedList")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Lista">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCmd("insertOrderedList")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Lista numerada">
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-zinc-700 mx-1" />

        <select
          onChange={(e) => { if (e.target.value) execCmd("formatBlock", e.target.value); e.target.value = ""; }}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300 font-mono"
          defaultValue=""
        >
          <option value="" disabled>Formato</option>
          <option value="h1">Título Grande</option>
          <option value="h2">Título Médio</option>
          <option value="h3">Título Pequeno</option>
          <option value="p">Parágrafo</option>
        </select>

        <select
          onChange={(e) => { if (e.target.value) execCmd("fontSize", e.target.value); e.target.value = ""; }}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300 font-mono"
          defaultValue=""
        >
          <option value="" disabled>Tamanho</option>
          <option value="1">Pequeno</option>
          <option value="3">Normal</option>
          <option value="5">Grande</option>
          <option value="7">Muito Grande</option>
        </select>

        <button type="button" onClick={() => execCmd("insertHorizontalRule")} className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors" title="Linha horizontal">
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Área de edição */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[450px] max-h-[600px] overflow-y-auto bg-white text-black px-6 py-4 text-sm leading-relaxed focus:outline-none"
        style={{ fontFamily: "'Segoe UI', sans-serif" }}
      />
    </div>
  );
}

import { Suspense } from "react";

function NovoContratoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editarId = searchParams.get("editar");

  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [conteudoFinal, setConteudoFinal] = useState("");
  const [conteudoBase, setConteudoBase] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState("rascunho");
  const [viewMode, setViewMode] = useState<"editor" | "preview">("preview");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregandoDoc, setCarregandoDoc] = useState(!!editarId);
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

  // Carregar modelos
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/contratos/modelos", { headers });
        const data = await res.json();
        if (Array.isArray(data)) setModelos(data.filter((m: any) => m.ativo));
      } catch {
        console.error("Erro ao carregar modelos");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  // Carregar documento existente (modo edição)
  useEffect(() => {
    if (!editarId || !tenantId) return;
    (async () => {
      setCarregandoDoc(true);
      try {
        const res = await fetch(`/api/contratos/documentos?id=${editarId}`, { headers });
        const doc: Documento = await res.json();
        if (doc && doc.id) {
          setTitulo(doc.titulo);
          setConteudoFinal(doc.conteudo || "");
          setConteudoBase(doc.conteudo || "");
          setStatus(doc.status);
          setObservacoes(doc.observacoes || "");
          setViewMode("editor");
          if (doc.modelo_id) setModeloSelecionado(doc.modelo_id);
          if (doc.cliente_nome) setCampos((p) => ({ ...p, nome_cliente: doc.cliente_nome! }));
          if (doc.cliente_documento) setCampos((p) => ({ ...p, cpf_cnpj: doc.cliente_documento! }));
        }
      } catch {
        setErro("Erro ao carregar contrato para edição");
      } finally {
        setCarregandoDoc(false);
      }
    })();
  }, [editarId, tenantId]);

  // Quando seleciona modelo, preenche conteúdo base
  useEffect(() => {
    if (!modeloSelecionado || editarId) return;
    const modelo = modelos.find((m) => m.id === modeloSelecionado);
    if (modelo) {
      setConteudoBase(modelo.conteudo);
      if (!titulo) setTitulo(`Contrato - ${modelo.nome}`);
    }
  }, [modeloSelecionado, modelos]);

  // Aplicar placeholders ao conteúdo
  const aplicarPlaceholders = useCallback(() => {
    let html = conteudoBase;
    PLACEHOLDERS.forEach((p) => {
      const valor = campos[p.campo] || p.tag;
      html = html.replaceAll(p.tag, valor);
    });
    setConteudoFinal(html);
  }, [conteudoBase, campos]);

  useEffect(() => {
    if (conteudoBase && !editarId) aplicarPlaceholders();
  }, [campos, conteudoBase, aplicarPlaceholders]);

  async function salvar() {
    if (!titulo.trim()) {
      setErro("Preencha o título do contrato");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const payload: any = {
        titulo: titulo.trim(),
        conteudo: conteudoFinal || conteudoBase,
        cliente_nome: campos.nome_cliente || null,
        cliente_documento: campos.cpf_cnpj || null,
        status,
        tipo: "gerado",
        observacoes: observacoes || null,
      };

      if (editarId) {
        payload.id = editarId;
        await fetch("/api/contratos/documentos", {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        if (modeloSelecionado) payload.modelo_id = modeloSelecionado;
        await fetch("/api/contratos/documentos", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      setSucesso(true);
      setTimeout(() => router.push("/dashboard/contratos"), 1200);
    } catch {
      setErro("Erro ao salvar contrato");
    } finally {
      setSalvando(false);
    }
  }

  function exportarPDF() {
    const html = conteudoFinal || conteudoBase;
    if (!html) return;
    const janela = window.open("", "_blank");
    if (!janela) return;
    janela.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.7; font-size: 13px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${html}
      <script>window.onload=function(){window.print();window.close();}<\/script>
      </body></html>
    `);
    janela.document.close();
  }

  if (carregandoDoc) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
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
            {editarId ? "Editar Contrato" : "Novo Contrato"}
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            {editarId ? "Altere os dados do contrato" : "Crie um contrato a partir de um modelo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(conteudoFinal || conteudoBase) && (
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
          )}
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editarId ? "Salvar" : "Criar Contrato"}
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs font-mono text-red-400">{erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-4">
          <Save className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-mono text-emerald-400">Contrato salvo com sucesso! Redirecionando...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda — Formulário */}
        <div className="lg:col-span-1 space-y-4">
          {/* Modelo */}
          {!editarId && (
            <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-tight font-mono text-white">Modelo</h2>
              </div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                </div>
              ) : modelos.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs font-mono text-zinc-500 mb-2">Nenhum modelo cadastrado</p>
                  <a href="/dashboard/contratos/modelos" className="text-xs font-mono text-emerald-500 hover:text-emerald-400 underline">
                    Criar modelo
                  </a>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={modeloSelecionado}
                    onChange={(e) => setModeloSelecionado(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono appearance-none focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="">Selecione um modelo...</option>
                    {modelos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Dados do contrato */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black uppercase tracking-tight font-mono text-white">Dados</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Título *</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviço"
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
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
                    <option value="cancelado">Cancelado</option>
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

          {/* Campos do modelo (placeholders) — só se tiver modelo */}
          {(conteudoBase && !editarId) && (
            <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
              <h2 className="text-sm font-black uppercase tracking-tight font-mono text-white mb-4">
                Preencher Campos
              </h2>
              <div className="space-y-3">
                {PLACEHOLDERS.filter((p) => conteudoBase.includes(p.tag)).map((p) => (
                  <div key={p.campo}>
                    <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">{p.label}</label>
                    <input
                      type="text"
                      value={campos[p.campo] || ""}
                      onChange={(e) => setCampos((prev) => ({ ...prev, [p.campo]: e.target.value }))}
                      placeholder={p.tag}
                      className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                ))}
                {PLACEHOLDERS.filter((p) => conteudoBase.includes(p.tag)).length === 0 && (
                  <p className="text-xs font-mono text-zinc-500">Nenhum placeholder encontrado no modelo</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita — Editor Visual / Preview */}
        <div className="lg:col-span-2">
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("editor")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    viewMode === "editor" ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Editor
                </button>
                <button
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                    viewMode === "preview" ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
              </div>
            </div>

            {viewMode === "editor" ? (
              <EditorVisual
                value={editarId ? conteudoFinal : (conteudoFinal || conteudoBase)}
                onChange={(html) => {
                  if (editarId) {
                    setConteudoFinal(html);
                  } else {
                    setConteudoFinal(html);
                  }
                }}
              />
            ) : (
              <div className="p-6 min-h-[450px]">
                {(conteudoFinal || conteudoBase) ? (
                  <div className="bg-white rounded-lg p-8 text-black text-sm leading-relaxed shadow-lg">
                    <div dangerouslySetInnerHTML={{ __html: conteudoFinal || conteudoBase }} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FileText className="w-10 h-10 text-zinc-700 mb-3" />
                    <p className="text-sm font-mono text-zinc-500">
                      {editarId ? "Sem conteúdo" : "Selecione um modelo para começar"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NovoContratoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    }>
      <NovoContratoContent />
    </Suspense>
  );
}