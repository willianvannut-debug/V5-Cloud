"use client"
import React, { useState } from 'react';
import { Copy, Check, Lock, ExternalLink, Globe, Code, Sparkles } from 'lucide-react';

interface WidgetIntegracaoProps {
  empresa: {
    id: string;
    nome_empresa: string;
    slug: string | null;
    plano: string;
    addon_iframe?: boolean | null;
  };
}

export default function WidgetIntegracao({ empresa }: WidgetIntegracaoProps) {
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [copiadoIframe, setCopiadoIframe] = useState(false);

  const planoLower = String(empresa.plano || '').toLowerCase().trim();
  const isScale = planoLower === 'scale';
  const isPro = planoLower === 'pro';
  const hasAddonIframe = Boolean(empresa.addon_iframe);
  
  // Regra de libertação do iFrame: Scale tem liberado direto, Pro precisa do addon
  const iframeLiberado = isScale || hasAddonIframe;

  // Montagem do link dinâmico
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://v5cloud.com.br';
  const linkPublico = isPro || isScale
    ? `${baseUrl}/viabilidade/${empresa.slug || 'sua-empresa'}`
    : `${baseUrl}/viabilidade/v5-fibra-matriz`;

  const codigoIframe = `<iframe \n  src="${linkPublico}" \n  width="100%" \n  height="850px" \n  frameborder="0" \n  style="border: none; border-radius: 16px; overflow: hidden;"\n></iframe>`;

  const copiarTexto = (texto: string, tipo: 'link' | 'iframe') => {
    navigator.clipboard.writeText(texto);
    if (tipo === 'link') {
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 2000);
    } else {
      setCopiadoIframe(true);
      setTimeout(() => setCopiadoIframe(false), 2000);
    }
  };

  const handleCheckoutAddon = () => {
    // Redireciona para o fluxo de checkout/Stripe do add-on
    alert("Redirecionando para o Stripe Checkout do Add-on iFrame (R$ 49,90/mês)...");
  };

  return (
    <div className="bg-[#121318] border border-white/10 rounded-2xl p-6 text-white max-w-2xl w-full shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">Integração de Viabilidade</h2>
            <p className="text-xs text-zinc-400 font-mono">
              Plano Ativo: <span className="uppercase text-emerald-400 font-bold">{empresa.plano}</span>
            </p>
          </div>
        </div>

        {isScale && (
          <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> TUDO LIBERADO
          </span>
        )}
      </div>

      {/* 1. LINK PÚBLICO */}
      <div className="mb-6">
        <label className="block text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2">
          Link da Página de Viabilidade
        </label>
        <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl p-2.5">
          <input
            type="text"
            readOnly
            value={linkPublico}
            className="bg-transparent text-sm text-zinc-200 font-mono flex-1 outline-none px-2"
          />
          <button
            onClick={() => copiarTexto(linkPublico, 'link')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono rounded-lg transition-all"
          >
            {copiadoLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiadoLink ? 'Copiado!' : 'Copiar'}</span>
          </button>
          <a
            href={linkPublico}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all"
            title="Abrir link"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        {!isPro && !isScale && (
          <p className="text-[11px] text-zinc-500 mt-2 font-mono">
            * O plano Essencial utiliza a página central padrão. Faça upgrade para o plano PRO para ter link com a sua marca.
          </p>
        )}
      </div>

      {/* 2. CÓDIGO IFRAME (EMBUTIDO NO SITE) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" /> Incorporar no seu site (iFrame)
          </label>
        </div>

        {iframeLiberado ? (
          <div className="space-y-3">
            <div className="relative bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-300">
              <pre className="overflow-x-auto whitespace-pre-wrap">{codigoIframe}</pre>
              <button
                onClick={() => copiarTexto(codigoIframe, 'iframe')}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-lg hover:bg-emerald-400 transition-all shadow-lg"
              >
                {copiadoIframe ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiadoIframe ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Cole este código em qualquer página HTML, WordPress, Wix ou Elementor do seu provedor.
            </p>
          </div>
        ) : (
          /* CARD DE BLOQUEIO / VENDA DO ADD-ON */
          <div className="border border-dashed border-white/10 rounded-xl p-5 bg-black/30 text-center relative overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-white mb-1">Incorpore a viabilidade diretamente no seu site</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4 leading-relaxed">
              Mantenha os clientes no seu próprio domínio sem que percebam redirecionamentos. Disponível como Add-on no plano PRO ou já incluso no plano SCALE.
            </p>

            {isPro ? (
              <button
                onClick={handleCheckoutAddon}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-95"
              >
                Ativar Add-on (+ R$ 49,90/mês)
              </button>
            ) : (
              <span className="inline-block text-xs font-mono text-zinc-500 bg-zinc-900 border border-white/5 px-3 py-1.5 rounded-lg">
                Recurso disponível a partir do plano PRO
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}