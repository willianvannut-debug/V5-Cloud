"use client"
import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Users, Wrench, QrCode, Share2, Copy, Check, ExternalLink, Upload } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AplicativosPage() {
  const supabase = createClientComponentClient();
  const [apkCliente, setApkCliente] = useState<string | null>(null);
  const [apkTecnico, setApkTecnico] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState('');

  useEffect(() => {
    carregarAPKs();
  }, []);

  async function carregarAPKs() {
    try {
      // Buscar empresa do usuario logado
      const cookieStr = document.cookie;
      const sessionCookie = cookieStr.split('; ').find(c => c.startsWith('v5_session='));
      if (!sessionCookie) return;
      const token = sessionCookie.split('=')[1];
      const payload = JSON.parse(atob(token.split('.')[1]));
      const empresaId = payload.empresa_id;

      // Buscar nome da empresa
      const { data: empresa } = await supabase
        .from('empresas')
        .select('nome_empresa')
        .eq('id', empresaId)
        .single();
      if (empresa) setEmpresaNome(empresa.nome_empresa);

      // Listar APKs no bucket
      const { data: filesCliente } = await supabase.storage
        .from('aplicativos')
        .list(`${empresaId}/cliente`, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      const { data: filesTecnico } = await supabase.storage
        .from('aplicativos')
        .list(`${empresaId}/tecnico`, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      // APKs globais (para todos os provedores)
      const { data: filesClienteGlobal } = await supabase.storage
        .from('aplicativos')
        .list('global/cliente', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      const { data: filesTecnicoGlobal } = await supabase.storage
        .from('aplicativos')
        .list('global/tecnico', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

      // Priorizar APK da empresa, senão usar global
      if (filesCliente && filesCliente.length > 0 && filesCliente[0].name.endsWith('.apk')) {
        const { data } = supabase.storage.from('aplicativos').getPublicUrl(`${empresaId}/cliente/${filesCliente[0].name}`);
        setApkCliente(data.publicUrl);
      } else if (filesClienteGlobal && filesClienteGlobal.length > 0 && filesClienteGlobal[0].name.endsWith('.apk')) {
        const { data } = supabase.storage.from('aplicativos').getPublicUrl(`global/cliente/${filesClienteGlobal[0].name}`);
        setApkCliente(data.publicUrl);
      }

      if (filesTecnico && filesTecnico.length > 0 && filesTecnico[0].name.endsWith('.apk')) {
        const { data } = supabase.storage.from('aplicativos').getPublicUrl(`${empresaId}/tecnico/${filesTecnico[0].name}`);
        setApkTecnico(data.publicUrl);
      } else if (filesTecnicoGlobal && filesTecnicoGlobal.length > 0 && filesTecnicoGlobal[0].name.endsWith('.apk')) {
        const { data } = supabase.storage.from('aplicativos').getPublicUrl(`global/tecnico/${filesTecnicoGlobal[0].name}`);
        setApkTecnico(data.publicUrl);
      }
    } catch (err) {
      console.error('Erro ao carregar APKs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(tipo: 'cliente' | 'tecnico') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.apk';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.name.endsWith('.apk')) {
        alert('Por favor, selecione um arquivo .apk');
        return;
      }
      if (file.size > 150 * 1024 * 1024) {
        alert('O arquivo APK deve ter no máximo 150MB');
        return;
      }

      setUploading(tipo);
      try {
        const cookieStr = document.cookie;
        const sessionCookie = cookieStr.split('; ').find(c => c.startsWith('v5_session='));
        if (!sessionCookie) return;
        const token = sessionCookie.split('=')[1];
        const payload = JSON.parse(atob(token.split('.')[1]));
        const empresaId = payload.empresa_id;

        const path = `${empresaId}/${tipo}/${file.name}`;
        const { error } = await supabase.storage
          .from('aplicativos')
          .upload(path, file, { upsert: true });

        if (error) throw error;

        const { data } = supabase.storage.from('aplicativos').getPublicUrl(path);
        if (tipo === 'cliente') setApkCliente(data.publicUrl);
        else setApkTecnico(data.publicUrl);
      } catch (err: any) {
        alert('Erro ao enviar APK: ' + err.message);
      } finally {
        setUploading(null);
      }
    };
    input.click();
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Smartphone className="w-7 h-7 text-emerald-400" />
          Aplicativos
        </h1>
        <p className="text-gray-400 mt-1">
          Baixe os APKs e envie para seus clientes e técnicos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* App do Cliente */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">App do Cliente</h2>
              <p className="text-sm text-gray-400">V5 Fibra</p>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Aplicativo para seus clientes acompanharem faturas, abrirem chamados e verem informações da conexão.
          </p>

          <div className="space-y-3">
            {apkCliente ? (
              <>
                <a
                  href={apkCliente}
                  download
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Baixar APK do Cliente
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={() => copiarLink(apkCliente, 'cliente')}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    {copied === 'cliente' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied === 'cliente' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <button
                    onClick={() => compartilharWhatsApp(apkCliente, 'cliente')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">Nenhum APK disponível ainda</p>
              </div>
            )}
            <button
              onClick={() => handleUpload('cliente')}
              disabled={uploading === 'cliente'}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-600 hover:border-emerald-500 text-gray-400 hover:text-emerald-400 py-2 px-4 rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading === 'cliente' ? 'Enviando...' : 'Enviar novo APK'}
            </button>
          </div>
        </div>

        {/* App do Técnico */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">App do Técnico</h2>
              <p className="text-sm text-gray-400">V5 Cloud Técnico</p>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Aplicativo para seus técnicos receberem ordens de serviço, navegarem até o cliente e registrarem fotos.
          </p>

          <div className="space-y-3">
            {apkTecnico ? (
              <>
                <a
                  href={apkTecnico}
                  download
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Baixar APK do Técnico
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={() => copiarLink(apkTecnico, 'tecnico')}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    {copied === 'tecnico' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied === 'tecnico' ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <button
                    onClick={() => compartilharWhatsApp(apkTecnico, 'tecnico')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">Nenhum APK disponível ainda</p>
              </div>
            )}
            <button
              onClick={() => handleUpload('tecnico')}
              disabled={uploading === 'tecnico'}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-600 hover:border-blue-500 text-gray-400 hover:text-blue-400 py-2 px-4 rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading === 'tecnico' ? 'Enviando...' : 'Enviar novo APK'}
            </button>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-3">📱 Como distribuir os aplicativos</h3>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex gap-3">
            <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
            <p>Faça o upload dos APKs clicando em &quot;Enviar novo APK&quot; acima</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <p>Clique em &quot;Copiar Link&quot; ou &quot;WhatsApp&quot; para enviar o link de download para seus clientes/técnicos</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <p>O cliente/técnico abre o link no celular Android, baixa e instala o APK</p>
          </div>
          <div className="flex gap-3">
            <span className="bg-emerald-500/20 text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
            <p>No primeiro acesso, pode ser necessário permitir &quot;Instalar de fontes desconhecidas&quot; nas configurações do celular</p>
          </div>
        </div>
      </div>
    </div>
  );
}
