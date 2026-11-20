// ================================================================================
// WHITE-LABEL - Configuração do App do Cliente
// Caminho: app/dashboard/config/white-label/page.tsx
// Permite o provedor configurar: logo, slug, cores do app
// ================================================================================

"use client";
import { useState, useEffect, useRef } from "react";
import {
  Upload, Save, Palette, Link2, Smartphone, Eye, Trash2, CheckCircle, AlertTriangle, Image, Download, Copy, Check, ZoomIn, X, Pencil
} from "lucide-react";

export default function WhiteLabelPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Dados da empresa
  const [slug, setSlug] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#6366F1");
  const [corSecundaria, setCorSecundaria] = useState("#818CF8");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [telefoneSuporte, setTelefoneSuporte] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiado, setCopiado] = useState(false);

  // Editor de logo (tamanho e posicao)
  const [editorAberto, setEditorAberto] = useState(false);
  const [editorImagemSrc, setEditorImagemSrc] = useState<string | null>(null);
  const [editorZoom, setEditorZoom] = useState(1);
  const [editorPosX, setEditorPosX] = useState(0);
  const [editorPosY, setEditorPosY] = useState(0);
  const [salvandoEditor, setSalvandoEditor] = useState(false);
  const EDITOR_TAMANHO = 280;

  function copiarLink(link: string) {
    if (!link) return;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return;
      const me = await res.json();

      // Buscar dados da empresa
      const resEmpresa = await fetch(`/api/empresa-config/admin`, { credentials: "include" });
      if (resEmpresa.ok) {
        const data = await resEmpresa.json();
        setSlug(data.codigo_slug || "");
        setCorPrimaria(data.cor_primaria || "#6366F1");
        setCorSecundaria(data.cor_secundaria || "#818CF8");
        setLogoUrl(data.logo_url || null);
        setTelefoneSuporte(data.telefone_suporte || "");
        setNomeEmpresa(data.nome_empresa || "");
      }
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  }

  function formatSlug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  }

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMensagem({ tipo: "erro", texto: "Apenas imagens são permitidas" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensagem({ tipo: "erro", texto: "Imagem deve ter no máximo 5MB" });
      return;
    }

    const url = URL.createObjectURL(file);
    setEditorImagemSrc(url);
    setEditorZoom(1);
    setEditorPosX(0);
    setEditorPosY(0);
    setEditorAberto(true);
    e.target.value = "";
  }

  function abrirEditorComLogoAtual() {
    if (!logoUrl) return;
    setEditorImagemSrc(logoUrl);
    setEditorZoom(1);
    setEditorPosX(0);
    setEditorPosY(0);
    setEditorAberto(true);
  }

  function fecharEditor() {
    if (editorImagemSrc) URL.revokeObjectURL(editorImagemSrc);
    setEditorAberto(false);
    setEditorImagemSrc(null);
  }

  async function salvarLogoDoEditor() {
    if (!editorImagemSrc) return;
    setSalvandoEditor(true);
    try {
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.src = editorImagemSrc;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      });

      // Saida final em alta resolucao (512x512), mesma proporcao do editor
      const SAIDA = 512;
      const canvas = document.createElement("canvas");
      canvas.width = SAIDA;
      canvas.height = SAIDA;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponivel");

      // Desenha a imagem cobrindo o quadrado (tipo object-fit: cover),
      // aplicando o mesmo zoom e posicao usados no preview do editor.
      const escalaBase = Math.max(SAIDA / img.width, SAIDA / img.height);
      const escalaFinal = escalaBase * editorZoom;
      const larguraDesenhada = img.width * escalaFinal;
      const alturaDesenhada = img.height * escalaFinal;

      const fatorOffset = SAIDA / EDITOR_TAMANHO;
      const centroX = SAIDA / 2 + editorPosX * fatorOffset;
      const centroY = SAIDA / 2 + editorPosY * fatorOffset;

      ctx.clearRect(0, 0, SAIDA, SAIDA);
      ctx.drawImage(
        img,
        centroX - larguraDesenhada / 2,
        centroY - alturaDesenhada / 2,
        larguraDesenhada,
        alturaDesenhada
      );

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
      if (!blob) throw new Error("Falha ao gerar imagem");

      const arquivoFinal = new File([blob], "logo.png", { type: "image/png" });

      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("logo", arquivoFinal);

      const res = await fetch("/api/empresa-config/upload-logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Erro no upload");

      const data = await res.json();
      setLogoUrl(data.url);
      setMensagem({ tipo: "ok", texto: "Logo atualizada com sucesso!" });
      fecharEditor();
    } catch (err) {
      setMensagem({ tipo: "erro", texto: "Erro ao salvar a logo" });
    } finally {
      setUploadingLogo(false);
      setSalvandoEditor(false);
    }
  }

  async function handleSalvar() {
    if (!slug) {
      setMensagem({ tipo: "erro", texto: "Código do provedor é obrigatório" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/empresa-config/admin", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_slug: slug,
          cor_primaria: corPrimaria,
          cor_secundaria: corSecundaria,
          telefone_suporte: telefoneSuporte,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      setMensagem({ tipo: "ok", texto: "Configurações salvas com sucesso!" });
    } catch (err: any) {
      setMensagem({ tipo: "erro", texto: err.message || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-mono font-bold text-white flex items-center gap-3">
          <Smartphone className="w-7 h-7 text-emerald-400" />
          White-Label — App do Cliente
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Configure a aparência do app que seus clientes vão usar. A logo, cores e nome aparecerão no app automaticamente.
        </p>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
          mensagem.tipo === "ok"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {mensagem.tipo === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {mensagem.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA ESQUERDA: Configurações */}
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Image className="w-4 h-4 text-emerald-400" />
              Logo da Empresa
            </h2>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-800/50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSelecionarArquivo}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex-1 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadingLogo ? "Enviando..." : "Upload Logo"}
                  </button>
                  {logoUrl && (
                    <button
                      onClick={abrirEditorComLogoAtual}
                      disabled={uploadingLogo}
                      title="Editar tamanho e posição da logo atual"
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500">PNG, JPG ou WebP. Máx 5MB. Você poderá ajustar o tamanho e a posição antes de salvar.</p>
              </div>
            </div>
          </div>

          {/* Código do Provedor (slug) */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              Código do Provedor
            </h2>
            <p className="text-xs text-zinc-400">
              Código único que seus clientes digitam no app para encontrar sua empresa. Sem espaços, sem acentos.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(formatSlug(e.target.value))}
                placeholder="ex: 4gnet"
                maxLength={20}
                className="flex-1 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            {slug && (
              <p className="text-[11px] text-zinc-500">
                Seus clientes digitarão: <span className="text-emerald-400 font-bold">{slug}</span>
              </p>
            )}
          </div>

          {/* Cores */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              Cores do App
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Cor Primária</label>
                <label
                  className="relative block w-full aspect-square rounded-xl border-2 border-zinc-700 cursor-pointer overflow-hidden shadow-inner group"
                  style={{ backgroundColor: corPrimaria }}
                >
                  <input
                    type="color"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="absolute inset-0 flex items-end justify-center pb-2 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Trocar cor</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono text-center focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Cor Secundária</label>
                <label
                  className="relative block w-full aspect-square rounded-xl border-2 border-zinc-700 cursor-pointer overflow-hidden shadow-inner group"
                  style={{ backgroundColor: corSecundaria }}
                >
                  <input
                    type="color"
                    value={corSecundaria}
                    onChange={(e) => setCorSecundaria(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="absolute inset-0 flex items-end justify-center pb-2 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">Trocar cor</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono text-center focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          </div>

          {/* Telefone Suporte */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Telefone de Suporte
            </h2>
            <input
              type="text"
              value={telefoneSuporte}
              onChange={(e) => setTelefoneSuporte(e.target.value)}
              placeholder="(99) 99999-9999"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
            <p className="text-[10px] text-zinc-500">Exibido no app do cliente para contato.</p>
          </div>

          {/* Links de Download dos APKs */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              Links de Download dos APKs
            </h2>
            <p className="text-xs text-zinc-400">
              Cole os links gerados pelo EAS Build para distribuir os apps aos seus clientes e técnicos.
            </p>

            {/* Link gerado automaticamente */}
            {slug ? (
              <div className="space-y-3">
                <div className="bg-zinc-800/40 border border-zinc-700/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono mb-1">Link de Download do App</p>
                      <p className="text-emerald-400 text-xs font-mono truncate">
                        https://v5-cloud.vercel.app/download/{slug}
                      </p>
                    </div>
                    <button
                      onClick={() => copiarLink(`https://v5-cloud.vercel.app/download/${slug}`)}
                      className={`ml-3 shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${copiado ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-zinc-700/60 border-zinc-600 text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-400"}`}
                    >
                      {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Envie esse link para seus clientes baixarem o app. O código <span className="text-emerald-400 font-bold">{slug}</span> já vem configurado automaticamente.
                </p>
              </div>
            ) : (
              <div className="bg-zinc-800/30 border border-dashed border-zinc-700 rounded-xl p-4 text-center">
                <p className="text-zinc-500 text-xs">Defina o <span className="text-emerald-400">Código do Provedor</span> acima para gerar o link de download.</p>
              </div>
            )}
          </div>

          {/* Botão Salvar */}
          <button
            onClick={handleSalvar}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-mono font-bold text-sm uppercase transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>

        {/* COLUNA DIREITA: Preview do App */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Preview do App
          </h2>

          {/* Mockup de celular */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 flex justify-center">
            <div className="w-[260px] bg-[#0A0A0F] rounded-[2rem] border-4 border-zinc-700 overflow-hidden shadow-2xl">
              {/* Status bar fake */}
              <div className="h-6 bg-black flex items-center justify-center">
                <div className="w-16 h-1.5 bg-zinc-800 rounded-full" />
              </div>

              {/* Tela do app */}
              <div className="p-6 flex flex-col items-center min-h-[400px]">
                {/* Glow */}
                <div className="absolute w-32 h-32 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: corPrimaria }} />

                {/* Logo */}
                <div className="relative w-16 h-16 rounded-2xl border mb-4 overflow-hidden"
                  style={{ borderColor: corPrimaria + '40', backgroundColor: corPrimaria + '10' }}>
                  {editorAberto && editorImagemSrc ? (
                    <img
                      src={editorImagemSrc}
                      alt="Logo"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: `translate(-50%, -50%) translate(${editorPosX * (64 / EDITOR_TAMANHO)}px, ${editorPosY * (64 / EDITOR_TAMANHO)}px) scale(${editorZoom})`,
                      }}
                    />
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl" style={{ color: corPrimaria }}>📡</span>
                  )}
                </div>

                {/* Nome */}
                <h3 className="text-white font-bold text-base mb-1">
                  {nomeEmpresa || "Nome da Empresa"}
                </h3>
                <p className="text-zinc-500 text-[10px] mb-8">Entre com seu CPF e senha</p>

                {/* Form fake */}
                <div className="w-full space-y-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                    <span className="text-zinc-600 text-xs">000.000.000-00</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
                    <span className="text-zinc-600 text-xs">Sua senha</span>
                  </div>
                  <div className="rounded-xl py-2.5 text-center text-xs font-bold text-white" style={{ backgroundColor: corPrimaria }}>
                    Entrar
                  </div>
                </div>

                {/* Código */}
                {slug && (
                  <p className="text-zinc-600 text-[9px] mt-6">
                    Código: <span style={{ color: corPrimaria }}>{slug}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Editor de Logo (tamanho e posicao) */}
          {editorAberto && editorImagemSrc && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-emerald-400" />
                  Ajustar Logo
                </h3>
                <button onClick={fecharEditor} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center">
                <div
                  style={{ width: EDITOR_TAMANHO, height: EDITOR_TAMANHO }}
                  className="relative overflow-hidden rounded-2xl border-2 border-zinc-700 bg-zinc-800"
                >
                  <img
                    src={editorImagemSrc}
                    alt="Pré-visualização"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: `translate(-50%, -50%) translate(${editorPosX}px, ${editorPosY}px) scale(${editorZoom})`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Tamanho</span>
                    <span>{editorZoom.toFixed(2)}x</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={editorZoom}
                    onChange={(e) => setEditorZoom(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Posição Horizontal
                  </label>
                  <input
                    type="range"
                    min={-140}
                    max={140}
                    step={1}
                    value={editorPosX}
                    onChange={(e) => setEditorPosX(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Posição Vertical
                  </label>
                  <input
                    type="range"
                    min={-140}
                    max={140}
                    step={1}
                    value={editorPosY}
                    onChange={(e) => setEditorPosY(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={fecharEditor}
                  disabled={salvandoEditor}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarLogoDoEditor}
                  disabled={salvandoEditor}
                  className="flex-1 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  {salvandoEditor ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

          </div>
  );
}
