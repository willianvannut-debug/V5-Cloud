"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, Users, Wrench, Share2, Copy, Check, ExternalLink, CheckCircle2, Save, Link } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function AplicativosPage() {
  const { operador, carregando: carregandoAuth } = useAuth();
  const [apkCliente, setApkCliente] = useState('');
  const [apkTecnico, setApkTecnico] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editCliente, setEditCliente] = useState('');
  const [editTecnico, setEditTecnico] = useState('');

  const isSuperAdmin = operador?.role === 'superadmin' || operador?.role === 'root';

  useEffect(() => {
    if (!carregandoAuth && operador) {
      carregarDados();
    }
  }, [carregandoAuth, operador]);

  async function carregarDados() {
    if (!supabase || !operador) { setLoading(false); return; }
    try {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('nome_empresa, apk_cliente_url, apk_tecnico_url')
        .eq('id', operador.empresa_id)
        .single();

      if (empresa) {
        setEmpresaNome(empresa.nome_empresa);
        setApkCliente(empresa.apk_cliente_url || '');
        setApkTecnico(empresa.apk_tecnico_url || '');
        setEditCliente(empresa.apk_cliente_url || '');
        setEditTecnico(empresa.apk_tecnico_url || '');
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  async function salvarLinks() {
    if (!supabase || !operador) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          apk_cliente_url: editCliente || null,
          apk_tecnico_url: editTecnico || null
        })
        .eq('id', operador.empresa_id);

      if (error) throw error;

      setApkCliente(editCliente);
      setApkTecnico(editTecnico);
      setSuccessMsg('Links salvos com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function copiarLink(url: string, tipo: string) {
    navigator.clipboard.writeText(url);
    setCopied(tipo);
    setTimeout(() => setCopied(null), 2000);
  }

  function compartilharWhatsApp(url: string, tipo: string) {
    const msg = tipo === 'cliente'
      ? `Baixe o aplicativo ${empresaNome || 'V5 Fibra'} para acompanhar sua internet: ${url}`
      : `Baixe o aplicativo do técnico ${empresaNome || 'V5 Cloud'}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  if (carregandoAuth || loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <Card className="border border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
        <CardContent className="p-6 w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Aplicativos</h1>
              <p className="text-xs text-zinc-400">Baixe os APKs e distribua para seus clientes e técnicos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem de sucesso */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {/* SUPERADMIN: Configurar links */}
      {isSuperAdmin && (
        <Card className="border border-amber-500/20 bg-amber-500/5 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-amber-400 flex items-center gap-2">
              <Link className="w-4 h-4" />
              Configurar Links dos APKs (Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-zinc-500 text-xs">Cole os links de download dos APKs. Pode usar Google Drive, Expo/EAS Build, ou qualquer link direto.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Link do APK do Cliente (V5 Fibra)</label>
                <input
                  type="url"
                  value={editCliente}
                  onChange={(e) => setEditCliente(e.target.value)}
                  placeholder="https://expo.dev/... ou link do Google Drive"
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Link do APK do Técnico (V5 Cloud Técnico)</label>
                <input
                  type="url"
                  value={editTecnico}
                  onChange={(e) => setEditTecnico(e.target.value)}
                  placeholder="https://expo.dev/... ou link do Google Drive"
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <button
                onClick={salvarLinks}
                disabled={saving}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Links'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards dos APKs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App do Cliente */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              App do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">V5 Fibra</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Faturas, chamados e informações da conexão</p>
              </div>
            </div>

            {apkCliente ? (
              <div className="space-y-3">
                <a
                  href={apkCliente}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-emerald-500/10"
                >
                  <Download className="w-4 h-4" />
                  Baixar APK
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={() => copiarLink(apkCliente, 'cliente')}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200"
                  >
                    {copied === 'cliente' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'cliente' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <button
                    onClick={() => compartilharWhatsApp(apkCliente, 'cliente')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-800/50 hover:bg-green-700/50 border border-green-700/30 text-green-400 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 rounded-lg border border-dashed border-zinc-800">
                <Smartphone className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-600 text-xs">Nenhum APK disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* App do Técnico */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              App do Técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">V5 Cloud Técnico</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Ordens de serviço, navegação e fotos</p>
              </div>
            </div>

            {apkTecnico ? (
              <div className="space-y-3">
                <a
                  href={apkTecnico}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/10"
                >
                  <Download className="w-4 h-4" />
                  Baixar APK
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={() => copiarLink(apkTecnico, 'tecnico')}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200"
                  >
                    {copied === 'tecnico' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === 'tecnico' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <button
                    onClick={() => compartilharWhatsApp(apkTecnico, 'tecnico')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-800/50 hover:bg-green-700/50 border border-green-700/30 text-green-400 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 rounded-lg border border-dashed border-zinc-800">
                <Wrench className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-600 text-xs">Nenhum APK disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instruções */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-amber-400" />
            Como distribuir
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: '1', title: 'Configure os links', desc: 'Cole os links de download dos APKs na seção de admin acima' },
              { n: '2', title: 'Compartilhe', desc: 'Use "Copiar Link" ou "WhatsApp" para enviar aos seus clientes ou técnicos' },
              { n: '3', title: 'Instale', desc: 'O cliente abre o link no celular Android, baixa e instala o APK' },
              { n: '4', title: 'Permissão', desc: 'No primeiro acesso, permitir "Fontes desconhecidas" nas configurações' },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold mb-3">{step.n}</span>
                <h4 className="text-white text-xs font-semibold mb-1">{step.title}</h4>
                <p className="text-zinc-500 text-[11px] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
