"use client"
import React, { useState } from 'react';
import { Download, Shield, Smartphone, Wifi, FileText, Headphones, Wrench, ChevronDown, ChevronUp, Share2, MapPin, Camera, ClipboardList } from 'lucide-react';

interface Empresa {
  nome_empresa: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  telefone_suporte: string | null;
  apk_cliente_url: string | null;
  apk_tecnico_url: string | null;
}

export default function DownloadClient({ empresa }: { empresa: Empresa }) {
  const [showInstrucoes, setShowInstrucoes] = useState(false);
  const [tab, setTab] = useState<'cliente' | 'tecnico'>('cliente');
  const cor = empresa.cor_primaria || '#10b981';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${cor}22 0%, ${cor}08 50%, transparent 100%)`
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />

        <div className="relative max-w-lg mx-auto px-6 pt-12 pb-8">
          {/* Logo / Nome */}
          <div className="text-center mb-8">
            {empresa.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={empresa.nome_empresa}
                className="w-20 h-20 rounded-2xl mx-auto mb-4 object-contain bg-white/10 p-2"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: `${cor}30`, color: cor }}
              >
                {empresa.nome_empresa.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{empresa.nome_empresa}</h1>
            <p className="text-zinc-400 text-sm mt-1">Baixe nossos aplicativos</p>
          </div>

          {/* Tabs Cliente / Técnico */}
          <div className="flex gap-2 mb-6 bg-zinc-900/60 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setTab('cliente')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'cliente'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              App Cliente
            </button>
            <button
              onClick={() => setTab('tecnico')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === 'tecnico'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <Wrench className="w-4 h-4" />
              App Técnico
            </button>
          </div>

          {/* App do Cliente */}
          {tab === 'cliente' && (
            <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cor}25`, border: `1px solid ${cor}40` }}
                >
                  <Smartphone className="w-7 h-7" style={{ color: cor }} />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">V5 Fibra</h2>
                  <p className="text-zinc-500 text-xs">Gerencie sua internet pelo celular</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: FileText, label: 'Faturas' },
                  { icon: Headphones, label: 'Chamados' },
                  { icon: Wifi, label: 'Conexão' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-zinc-800/50 border border-zinc-800">
                    <item.icon className="w-5 h-5 text-zinc-400" />
                    <span className="text-[11px] text-zinc-500">{item.label}</span>
                  </div>
                ))}
              </div>

              {(empresa.apk_cliente_url || '/apks/cliente.apk') ? (
                <a
                  href={empresa.apk_cliente_url || '/apks/cliente.apk'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 text-white py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg bg-emerald-600 hover:bg-emerald-500"
                  style={{ boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)' }}
                >
                  <Download className="w-5 h-5" />
                  Baixar Aplicativo
                </a>
              ) : (
                <div className="w-full text-center py-3.5 px-6 rounded-xl text-sm text-zinc-600 border border-dashed border-zinc-800">
                  Aplicativo ainda não disponível
                </div>
              )}
            </div>
          )}

          {/* App do Técnico */}
          {tab === 'tecnico' && (
            <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-500/20 border border-blue-500/30">
                  <Wrench className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">V5 Cloud Técnico</h2>
                  <p className="text-zinc-500 text-xs">App para técnicos de campo</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: ClipboardList, label: 'Ordens' },
                  { icon: MapPin, label: 'Navegação' },
                  { icon: Camera, label: 'Fotos' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-zinc-800/50 border border-zinc-800">
                    <item.icon className="w-5 h-5 text-zinc-400" />
                    <span className="text-[11px] text-zinc-500">{item.label}</span>
                  </div>
                ))}
              </div>

              {(empresa.apk_tecnico_url || '/apks/tecnico.apk') ? (
                <a
                  href={empresa.apk_tecnico_url || '/apks/tecnico.apk'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 text-white py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg bg-blue-600 hover:bg-blue-500"
                  style={{ boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}
                >
                  <Download className="w-5 h-5" />
                  Baixar Aplicativo
                </a>
              ) : (
                <div className="w-full text-center py-3.5 px-6 rounded-xl text-sm text-zinc-600 border border-dashed border-zinc-800">
                  Aplicativo ainda não disponível
                </div>
              )}
            </div>
          )}

          {/* Instruções expansíveis */}
          <div className="bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-2xl overflow-hidden mb-6">
            <button
              onClick={() => setShowInstrucoes(!showInstrucoes)}
              className="w-full flex items-center justify-between p-4 text-sm text-zinc-300 hover:bg-zinc-800/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                Como instalar?
              </span>
              {showInstrucoes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showInstrucoes && (
              <div className="px-4 pb-4 space-y-3">
                {[
                  { n: '1', text: 'Clique em "Baixar Aplicativo" acima' },
                  { n: '2', text: 'Quando o download terminar, abra o arquivo .apk' },
                  { n: '3', text: 'Se aparecer aviso de "Fonte desconhecida", permita a instalação nas configurações' },
                  { n: '4', text: tab === 'cliente' ? 'Pronto! Abra o app e faça login com seu CPF' : 'Pronto! Abra o app e faça login com suas credenciais' },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${cor}25`, color: cor }}
                    >
                      {step.n}
                    </span>
                    <p className="text-zinc-400 text-xs leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suporte */}
          {empresa.telefone_suporte && (
            <div className="text-center">
              <p className="text-zinc-600 text-xs mb-1">Precisa de ajuda?</p>
              <a
                href={`https://wa.me/55${empresa.telefone_suporte.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-400 text-sm hover:text-green-300 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Falar com suporte
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8 pb-6">
            <p className="text-zinc-700 text-[10px]">Powered by V5 Cloud</p>
          </div>
        </div>
      </div>
    </div>
  );
}
