// app/dashboard/contratos/modelos/page.tsx
// Gerenciar modelos/templates de contrato — Editor Visual (sem HTML)
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Save,
  X,
  Eye,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
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
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const PLACEHOLDERS_LISTA = [
  { tag: "{{nome_cliente}}", desc: "Nome do cliente" },
  { tag: "{{cpf_cnpj}}", desc: "CPF ou CNPJ" },
  { tag: "{{email}}", desc: "E-mail do cliente" },
  { tag: "{{telefone}}", desc: "Telefone" },
  { tag: "{{endereco}}", desc: "Endereço do cliente" },
  { tag: "{{plano}}", desc: "Nome do plano" },
  { tag: "{{valor}}", desc: "Valor do contrato" },
  { tag: "{{data_inicio}}", desc: "Data de início" },
  { tag: "{{nome_empresa}}", desc: "Nome da empresa" },
  { tag: "{{cnpj_empresa}}", desc: "CNPJ da empresa" },
  { tag: "{{endereco_empresa}}", desc: "Endereço da empresa" },
  { tag: "{{data_atual}}", desc: "Data atual" },
];

const MODELO_EXEMPLO_HTML = `<div style="font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0;">Contrato de Prestação de Serviços de Internet</h1>
    <p style="font-size: 12px; color: #666; margin-top: 5px;">{{nome_empresa}} — CNPJ: {{cnpj_empresa}}</p>
    <p style="font-size: 11px; color: #999;">{{endereco_empresa}}</p>
  </div>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
  <p style="font-size: 13px; line-height: 1.8;">
    Pelo presente instrumento particular, <strong>{{nome_empresa}}</strong>, inscrita no CNPJ sob nº <strong>{{cnpj_empresa}}</strong>,
    com sede em <strong>{{endereco_empresa}}</strong>, doravante denominada <strong>CONTRATADA</strong>, e
    <strong>{{nome_cliente}}</strong>, inscrito(a) no CPF/CNPJ sob nº <strong>{{cpf_cnpj}}</strong>,
    residente em <strong>{{endereco}}</strong>, e-mail <strong>{{email}}</strong>, telefone <strong>{{telefone}}</strong>,
    doravante denominado(a) <strong>CONTRATANTE</strong>, têm entre si justo e contratado o seguinte:
  </p>
  <h2 style="font-size: 14px; font-weight: bold; margin-top: 25px;">CLÁUSULA PRIMEIRA — DO OBJETO</h2>
  <p style="font-size: 13px; line-height: 1.8;">
    A CONTRATADA se compromete a prestar ao CONTRATANTE serviços de acesso à Internet através do plano
    <strong>{{plano}}</strong>, conforme especificações técnicas acordadas.
  </p>
  <h2 style="font-size: 14px; font-weight: bold; margin-top: 25px;">CLÁUSULA SEGUNDA — DO VALOR</h2>
  <p style="font-size: 13px; line-height: 1.8;">
    O CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>R$ {{valor}}</strong>,
    com vencimento todo dia 10 de cada mês.
  </p>
  <h2 style="font-size: 14px; font-weight: bold; margin-top: 25px;">CLÁUSULA TERCEIRA — DA VIGÊNCIA</h2>
  <p style="font-size: 13px; line-height: 1.8;">
    O presente contrato tem início em <strong>{{data_inicio}}</strong>, com vigência de 12 (doze) meses,
    podendo ser renovado automaticamente por igual período.
  </p>
  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #333; padding-top: 8px;">
        <p style="font-size: 12px; font-weight: bold;">{{nome_empresa}}</p>
        <p style="font-size: 11px; color: #666;">CONTRATADA</p>
      </div>
    </div>
    <div style="text-align: center; width: 45%;">
      <div style="border-top: 1px solid #333; padding-top: 8px;">
        <p style="font-size: 12px; font-weight: bold;">{{nome_cliente}}</p>
        <p style="font-size: 11px; color: #666;">CONTRATANTE</p>
      </div>
    </div>
  </div>
  <p style="text-align: center; font-size: 11px; color: #999; margin-top: 30px;">
    {{endereco_empresa}} — {{data_atual}}
  </p>
</div>`;

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

  // Sincronizar valor externo → editor (só se mudou externamente)
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

  const inserirPlaceholder = (tag: string) => {
    // Insere o placeholder na posição do cursor
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Verifica se o cursor está dentro do editor
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        const span = document.createElement("span");
        span.style.backgroundColor = "#d1fae5";
        span.style.color = "#065f46";
        span.style.padding = "1px 4px";
        span.style.borderRadius = "3px";
        span.style.fontWeight = "bold";
        span.style.fontSize = "12px";
        span.textContent = tag;
        range.deleteContents();
        range.insertNode(span);
        // Move cursor depois do span
        range.setStartAfter(span);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleInput();
        return;
      }
    }
    // Fallback: insere no final
    execCmd("insertHTML", `<span style="background-color:#d1fae5;color:#065f46;padding:1px 4px;border-radius:3px;font-weight:bold;font-size:12px;">${tag}</span>&nbsp;`);
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
        className="min-h-[350px] max-h-[500px] overflow-y-auto bg-white text-black px-6 py-4 text-sm leading-relaxed focus:outline-none"
        style={{ fontFamily: "'Segoe UI', sans-serif" }}
        data-placeholder="Comece a digitar seu modelo de contrato aqui..."
      />
    </div>
  );
}

export default function ModelosContratoPage() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Modelo | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");
  const [copiado, setCopiado] = useState<string | null>(null);

  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("v5_tenant_id") || ""
      : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
  };

  async function carregarModelos() {
    setLoading(true);
    try {
      const res = await fetch("/api/contratos/modelos", { headers });
      const data = await res.json();
      if (Array.isArray(data)) setModelos(data.filter((m: any) => m.ativo !== false));
    } catch {
      console.error("Erro ao carregar modelos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tenantId) carregarModelos();
  }, [tenantId]);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setDescricao("");
    setConteudo("");
    setViewMode("editor");
    setErro("");
    setModalAberto(true);
  }

  function abrirEditar(modelo: Modelo) {
    setEditando(modelo);
    setNome(modelo.nome);
    setDescricao(modelo.descricao || "");
    setConteudo(modelo.conteudo);
    setViewMode("editor");
    setErro("");
    setModalAberto(true);
  }

  function usarExemplo() {
    setConteudo(MODELO_EXEMPLO_HTML);
    if (!nome) setNome("Contrato de Prestação de Serviços");
    if (!descricao) setDescricao("Modelo padrão para serviços de internet");
  }

  async function salvar() {
    if (!nome.trim()) {
      setErro("Preencha o nome do modelo");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      if (editando) {
        await fetch("/api/contratos/modelos", {
          method: "PUT",
          headers,
          body: JSON.stringify({
            id: editando.id,
            nome: nome.trim(),
            descricao: descricao || null,
            conteudo,
          }),
        });
      } else {
        await fetch("/api/contratos/modelos", {
          method: "POST",
          headers,
          body: JSON.stringify({
            nome: nome.trim(),
            descricao: descricao || null,
            conteudo,
          }),
        });
      }
      setModalAberto(false);
      setSucesso(editando ? "Modelo atualizado!" : "Modelo criado!");
      setTimeout(() => setSucesso(""), 3000);
      carregarModelos();
    } catch {
      setErro("Erro ao salvar modelo");
    } finally {
      setSalvando(false);
    }
  }

  async function deletarModelo(id: string) {
    if (!confirm("Deseja desativar este modelo?")) return;
    try {
      await fetch(`/api/contratos/modelos?id=${id}`, { method: "DELETE", headers });
      carregarModelos();
    } catch {
      console.error("Erro ao deletar");
    }
  }

  function inserirPlaceholderNoEditor(tag: string) {
    // Dispara evento customizado que o editor vai capturar
    const evt = new CustomEvent("inserir-placeholder", { detail: tag });
    window.dispatchEvent(evt);
  }

  function copiarTag(tag: string) {
    navigator.clipboard.writeText(tag);
    setCopiado(tag);
    setTimeout(() => setCopiado(null), 1500);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
            Modelos de Contrato
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Crie e gerencie templates reutilizáveis
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Modelo
        </button>
      </div>

      {sucesso && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-mono text-emerald-400">{sucesso}</p>
        </div>
      )}

      {/* Lista de Modelos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : modelos.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-400 mb-2">Nenhum modelo cadastrado</p>
          <p className="text-xs font-mono text-zinc-600 mb-4">
            Crie um modelo com campos dinâmicos para gerar contratos rapidamente
          </p>
          <button
            onClick={abrirNovo}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-6 py-2.5 rounded-lg transition-colors"
          >
            Criar Primeiro Modelo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modelos.map((modelo) => (
            <div key={modelo.id} className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5 group hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white">{modelo.nome}</h3>
                    <p className="text-[10px] font-mono text-zinc-500">
                      {new Date(modelo.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirEditar(modelo)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deletarModelo(modelo.id)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {modelo.descricao && (
                <p className="text-xs font-mono text-zinc-400 mb-3">{modelo.descricao}</p>
              )}
              {/* Mini preview */}
              <div className="bg-white rounded-lg p-3 max-h-28 overflow-hidden relative">
                <div
                  className="text-[8px] text-black leading-tight pointer-events-none"
                  style={{ transform: "scale(0.85)", transformOrigin: "top left" }}
                  dangerouslySetInnerHTML={{ __html: modelo.conteudo.slice(0, 500) }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Editor */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="border border-zinc-800 bg-zinc-950 rounded-xl w-full max-w-5xl mx-4 max-h-[92vh] flex flex-col">
            {/* Header Modal */}
            <div className="border-b border-zinc-800 p-5 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight font-mono text-white">
                {editando ? "Editar Modelo" : "Novo Modelo"}
              </h2>
              <button onClick={() => setModalAberto(false)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {erro && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs font-mono text-red-400">{erro}</p>
                </div>
              )}

              {/* Nome + Descrição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Nome do Modelo *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Contrato de Internet Residencial"
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Breve descrição do modelo"
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Campos dinâmicos — clique pra inserir */}
              <div className="bg-black/30 border border-zinc-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Campos Dinâmicos — Clique para inserir no texto</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PLACEHOLDERS_LISTA.map((p) => (
                    <button
                      key={p.tag}
                      onClick={() => {
                        if (viewMode === "editor") {
                          // Copia pro clipboard e avisa
                          navigator.clipboard.writeText(p.tag);
                          setCopiado(p.tag);
                          setTimeout(() => setCopiado(null), 1500);
                        }
                      }}
                      title={`${p.desc} — clique para copiar, depois cole no texto (Ctrl+V)`}
                      className={`px-2.5 py-1.5 rounded text-[11px] font-mono transition-colors ${
                        copiado === p.tag
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                      }`}
                    >
                      {copiado === p.tag ? (
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Copiado!</span>
                      ) : (
                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> {p.tag}</span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-mono text-zinc-600 mt-2">
                  Clique no campo → ele é copiado → cole no editor com Ctrl+V onde quiser
                </p>
              </div>

              {/* Editor / Preview */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between bg-zinc-900/40">
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
                  {!editando && !conteudo && (
                    <button
                      onClick={usarExemplo}
                      className="text-[11px] font-mono text-emerald-500 hover:text-emerald-400 underline"
                    >
                      Usar modelo de exemplo
                    </button>
                  )}
                </div>

                {viewMode === "editor" ? (
                  <EditorVisual value={conteudo} onChange={setConteudo} />
                ) : (
                  <div className="p-6 min-h-[350px] bg-zinc-900/20">
                    {conteudo ? (
                      <div className="bg-white rounded-lg p-8 text-black text-sm leading-relaxed shadow-lg max-w-3xl mx-auto">
                        <div dangerouslySetInnerHTML={{ __html: conteudo }} />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs font-mono text-zinc-500">Nenhum conteúdo para visualizar</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-800 p-5 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2.5 rounded-lg text-xs font-mono font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editando ? "Salvar Alterações" : "Criar Modelo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}