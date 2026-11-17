// ================================================================================
// WHITE-LABEL - Configuração do App do Cliente
// Caminho: app/dashboard/config/white-label/page.tsx
// Permite o provedor configurar: logo, slug, cores do app
// ================================================================================

"use client";
import { useState, useEffect, useRef } from "react";
import {
  Upload, Save, Palette, Link2, Smartphone, Eye, Trash2, CheckCircle, AlertTriangle, Image
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

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMensagem({ tipo: "erro", texto: "Apenas imagens são permitidas" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMensagem({ tipo: "erro", texto: "Imagem deve ter no máximo 2MB" });
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/empresa-config/upload-logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Erro no upload");

      const data = await res.json();
      setLogoUrl(data.url);
      setMensagem({ tipo: "ok", texto: "Logo atualizada com sucesso!" });
    } catch (err) {
      setMensagem({ tipo: "erro", texto: "Erro ao fazer upload da logo" });
    } finally {
      setUploadingLogo(false);
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
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-800/50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Upload className="w-6 h-6 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleUploadLogo}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                >
                  {uploadingLogo ? "Enviando..." : "Upload Logo"}
                </button>
                <p className="text-[10px] text-zinc-500">PNG, JPG, SVG ou WebP. Máx 2MB.</p>
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
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="flex-1 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Cor Secundária</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={corSecundaria}
                    onChange={(e) => setCorSecundaria(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={corSecundaria}
                    onChange={(e) => setCorSecundaria(e.target.value)}
                    className="flex-1 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
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
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center mb-4 overflow-hidden" 
                  style={{ borderColor: corPrimaria + '40', backgroundColor: corPrimaria + '10' }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-2xl" style={{ color: corPrimaria }}>📡</span>
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
        </div>
      </div>
    </div>
  );
}
