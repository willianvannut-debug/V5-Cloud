'use client';
// app/dashboard/config/mensagens/page.tsx
// Edição do template de mensagem WhatsApp para cobrança de faturas

import { useEffect, useState } from 'react';
import { painelApi } from '@/lib/painel-api';
import { MessageCircle, Save, RotateCcw, Eye, Info } from 'lucide-react';

const MSG_PADRAO = `Olá {nome}!

Segue sua fatura:

📋 {descricao}
💰 Valor: *{valor}*
📅 Vencimento: {vencimento}
💳 Forma: {tipo}{link_pagamento}

📱 Baixe nosso app: {app}

Em caso de dúvidas, entre em contato.
Obrigado! 🙏`;

const VARIAVEIS = [
  { tag: '{nome}', desc: 'Nome do cliente' },
  { tag: '{valor}', desc: 'Valor da fatura (ex: R$ 89,90)' },
  { tag: '{vencimento}', desc: 'Data de vencimento' },
  { tag: '{tipo}', desc: 'Forma de pagamento (PIX, BOLETO...)' },
  { tag: '{descricao}', desc: 'Descrição da fatura' },
  { tag: '{link_pagamento}', desc: 'Link/código PIX ou boleto' },
  { tag: '{app}', desc: 'Link de download do seu app' },
];

export default function MensagensPage() {
  const [mensagem, setMensagem] = useState('');
  const [original, setOriginal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [preview, setPreview] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    painelApi<{ empresa: any }>('empresa')
      .then(({ empresa }) => {
        const msg = empresa?.msg_whatsapp_fatura || MSG_PADRAO;
        setMensagem(msg);
        setOriginal(msg);
      })
      .catch(() => {
        setMensagem(MSG_PADRAO);
        setOriginal(MSG_PADRAO);
      })
      .finally(() => setCarregando(false));
  }, []);

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      await painelApi('empresa', { method: 'PATCH', body: { msg_whatsapp_fatura: mensagem } });
      setOriginal(mensagem);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const restaurar = () => {
    setMensagem(MSG_PADRAO);
  };

  const inserirVariavel = (tag: string) => {
    const textarea = document.getElementById('msg-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nova = mensagem.slice(0, start) + tag + mensagem.slice(end);
    setMensagem(nova);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      textarea.focus();
    }, 0);
  };

  const gerarPreview = () => {
    return mensagem
      .replace(/{nome}/g, 'João Silva')
      .replace(/{valor}/g, 'R$ 89,90')
      .replace(/{vencimento}/g, '05/12/2026')
      .replace(/{tipo}/g, 'PIX')
      .replace(/{descricao}/g, 'Internet Fibra - Dezembro/2026')
      .replace(/{link_pagamento}/g, '\n\n🔑 *PIX Copia e Cola:*\n00020126580014br.gov.bcb.pix...')
      .replace(/{app}/g, 'https://v5-cloud.vercel.app/download/v5fibra');
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
          <MessageCircle className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Mensagem WhatsApp</h1>
          <p className="text-sm text-zinc-400">Template enviado ao cobrar uma fatura do cliente</p>
        </div>
      </div>

      {/* Variáveis disponíveis */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Info className="w-4 h-4" />
          <span>Clique em uma variável para inserir no cursor</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {VARIAVEIS.map(({ tag, desc }) => (
            <button
              key={tag}
              onClick={() => inserirVariavel(tag)}
              title={desc}
              className="px-3 py-1 text-xs font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 mt-2">
          {VARIAVEIS.map(({ tag, desc }) => (
            <div key={tag} className="text-xs text-zinc-500">
              <span className="font-mono text-zinc-400">{tag}</span> — {desc}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">Mensagem</label>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {preview ? 'Editar' : 'Ver preview'}
          </button>
        </div>

        {preview ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 min-h-[280px]">
            <div className="text-xs text-zinc-500 mb-3">Preview (valores de exemplo)</div>
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
              {gerarPreview()}
            </pre>
          </div>
        ) : (
          <textarea
            id="msg-editor"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={14}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 font-mono resize-y focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Digite a mensagem..."
          />
        )}
      </div>

      {/* Feedback */}
      {sucesso && (
        <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
          ✅ Mensagem salva com sucesso!
        </div>
      )}
      {erro && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          ❌ {erro}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={salvando || mensagem === original}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : 'Salvar mensagem'}
        </button>
        <button
          onClick={restaurar}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}
