// ================================================================================
// CRIAR OS - PAGINA COMPLETA (MVP - VERSÃO FINAL)
// Caminho: app/dashboard/ordens/criar/page.tsx
// ================================================================================

"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench, Search, Loader2, User, X, XCircle, Plus, CheckCircle2, ArrowLeft
} from 'lucide-react';

const TIPOS: Record<string, string> = {
  reparo: 'Reparo', manutencao: 'Manutenção',
  troca_equipamento: 'Troca Equipamento', mudanca_endereco: 'Mudança Endereço', retirada: 'Retirada',
};

export default function CriarOSPage() {
  const router = useRouter();
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  // Form
  const [tipo, setTipo] = useState('reparo');
  const [prioridade, setPrioridade] = useState('media');
  const [descricao, setDescricao] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [agendadaPara, setAgendadaPara] = useState('');

  // Busca cliente
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientesBusca, setClientesBusca] = useState<any[]>([]);
  const [clienteSel, setClienteSel] = useState<any>(null);
  const [buscandoCli, setBuscandoCli] = useState(false);

  useEffect(() => {
    const carregarTecnicos = async () => {
      try {
        const res = await fetch('/api/tecnicos');
        if (res.ok) {
          const data = await res.json();
          setTecnicos(Array.isArray(data) ? data : []);
        }
      } catch (e) {}
    };
    carregarTecnicos();
  }, []);

  // Autocomplete cliente
  useEffect(() => {
    if (buscaCliente.length < 2) { setClientesBusca([]); return; }
    const t = setTimeout(async () => {
      setBuscandoCli(true);
      try {
        const res = await fetch(`/api/clientes?busca=${encodeURIComponent(buscaCliente)}&limit=5`);
        if (res.ok) {
          const d = await res.json();
          setClientesBusca(Array.isArray(d) ? d : d.clientes || []);
        }
      } catch (e) {}
      setBuscandoCli(false);
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  const criarOS = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!clienteSel) { setErro('Selecione o cliente antes de criar a OS'); return; }
    if (!tipo) { setErro('Selecione o tipo da OS'); return; }
    if (!tecnicoId) { setErro('Escolha o técnico responsável pela OS'); return; }
    if (!descricao.trim()) { setErro('Preencha a descrição do problema'); return; }

    setSalvando(true);
    try {
      const res = await fetch('/api/ordens-servico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          cliente_id: clienteSel?.id || null,
          descricao: descricao || null,
          prioridade,
          tecnico_id: tecnicoId || null,
          agendada_para: agendadaPara || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro ao criar OS'); return; }

      setSucesso(true);
      setTimeout(() => {
        router.push('/dashboard/ordens/status');
      }, 1500);
    } catch (e) {
      setErro('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-black uppercase font-mono text-white">OS Criada!</h2>
          <p className="text-sm text-zinc-400 font-mono">Redirecionando para Status OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/ordens/status')}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-2.5 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Wrench className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
              Criar Ordem de Servico
            </h1>
          </div>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={criarOS} className="space-y-6">

          {/* CLIENTE — z-50 + relative para o dropdown ficar por cima dos cards abaixo */}
          <div className="relative z-50 border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Cliente *</label>
            {clienteSel ? (
              <div className="bg-black/50 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold">{clienteSel.nome}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {clienteSel.cpf} · {clienteSel.bairro}{clienteSel.cidade ? `, ${clienteSel.cidade}` : ''}
                  </p>
                  {clienteSel.telefone && (
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{clienteSel.telefone}</p>
                  )}
                </div>
                <button type="button" onClick={() => { setClienteSel(null); setBuscaCliente(''); }}
                  className="text-zinc-400 hover:text-white cursor-pointer p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Digite o nome ou CPF do cliente..."
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50" />
                {buscandoCli && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />}
                {clientesBusca.length > 0 && (
                  <div className="absolute z-[100] w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                    {clientesBusca.map((c: any) => (
                      <button key={c.id} type="button"
                        onClick={() => { setClienteSel(c); setBuscaCliente(''); setClientesBusca([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800/50 last:border-0">
                        <p className="text-sm text-white font-bold">{c.nome}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{c.cpf} · {c.bairro}{c.cidade ? `, ${c.cidade}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TIPO + PRIORIDADE */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Tipo *</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                  {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Prioridade</label>
                <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* DESCRICAO */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Descricao do Problema *</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cliente relata conexao instavel desde ontem, sinal caindo frequentemente..."
              rows={4}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none" />
          </div>

          {/* TECNICO + AGENDAMENTO */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Atribuir Tecnico *</label>
                <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                  <option value="">Selecione o tecnico...</option>
                  {tecnicos.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Agendar Para</label>
                <input type="datetime-local" value={agendadaPara} onChange={(e) => setAgendadaPara(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer" />
              </div>
            </div>
            <p className="text-[10px] font-mono text-zinc-600 mt-3">
              Se atribuir tecnico e agendar, a OS ja nasce como "Agendada"
            </p>
          </div>

          {/* ERRO */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs font-mono text-red-400">{erro}</span>
            </div>
          )}

          {/* BOTOES */}
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/dashboard/ordens/status')}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono font-bold uppercase text-xs py-3 rounded-lg transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {salvando ? 'Criando...' : 'Criar OS'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}