// ================================================================================
// OBSERVACOES INTERNAS DOS CLIENTES - V5 FIBRA
// app/dashboard/clientes/observacoes/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Link from 'next/link';
import {
  StickyNote,
  ArrowLeft,
  Search,
  X,
  Plus,
  User,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Clock,
  Send,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function ObservacoesPage() {
  const { operador, empresa } = useAuth();
  const { nomeProvedor } = useSettings();

  const [clientes, setClientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [observacoes, setObservacoes] = useState<any[]>([]);
  const [novaObs, setNovaObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Carregar clientes
  const carregarClientes = useCallback(async () => {
    if (!supabase || !empresa?.id) return;
    setCarregando(true);
    try {
      let query = supabase
        .from('clientes')
        .select('id, nome, cpf, cnpj, tipo_pessoa, status, telefone')
        .eq('empresa_id', empresa.id)
        .order('nome');

      if (busca) {
        query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,telefone.ilike.%${busca}%`);
      }

      const { data } = await query.limit(50);
      if (data) setClientes(data);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setCarregando(false);
    }
  }, [empresa?.id, busca]);

  useEffect(() => { carregarClientes(); }, [carregarClientes]);

  // Carregar observacoes do cliente selecionado
  const carregarObservacoes = useCallback(async (clienteId: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('cliente_observacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (data) setObservacoes(data);
    } catch (e) {
      // Tabela pode nao existir ainda, usar observacoes do campo do cliente
      setObservacoes([]);
    }
  }, []);

  const selecionarCliente = (cliente: any) => {
    setClienteSelecionado(cliente);
    carregarObservacoes(cliente.id);
  };

  // Salvar observacao
  const salvarObservacao = async () => {
    if (!clienteSelecionado || !novaObs.trim() || !supabase) return;
    setSalvando(true);

    try {
      // Tenta salvar na tabela de observacoes
      const { error } = await supabase
        .from('cliente_observacoes')
        .insert({
          cliente_id: clienteSelecionado.id,
          empresa_id: empresa?.id,
          texto: novaObs.trim(),
          autor: operador?.nome || 'Sistema',
          autor_id: operador?.id,
        });

      if (error) {
        // Se tabela nao existe, salvar no campo observacoes do cliente
        const obsAtual = clienteSelecionado.observacoes || '';
        const dataHora = new Date().toLocaleString('pt-BR');
        const novaObsTexto = `[${dataHora} - ${operador?.nome || 'Sistema'}] ${novaObs.trim()}`;
        const obsAtualizada = obsAtual ? `${novaObsTexto}\n---\n${obsAtual}` : novaObsTexto;

        await supabase
          .from('clientes')
          .update({ observacoes: obsAtualizada })
          .eq('id', clienteSelecionado.id);

        setClienteSelecionado({ ...clienteSelecionado, observacoes: obsAtualizada });
      } else {
        carregarObservacoes(clienteSelecionado.id);
      }

      setNovaObs('');
    } catch (e) {
      console.error('Erro ao salvar:', e);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/clientes" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-yellow-400" />
            Observacoes Internas
          </h1>
        </div>
        <p className="text-zinc-400 text-sm mt-0.5 ml-12">
          Notas internas visiveis apenas para a equipe
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LISTA DE CLIENTES */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
            <CardContent className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {carregando ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                </div>
              ) : clientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                  <User className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-mono">Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900/50">
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selecionarCliente(c)}
                      className={`w-full text-left px-4 py-3 hover:bg-zinc-900/30 transition-colors flex items-center gap-3 ${
                        clienteSelecionado?.id === c.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-white truncate">{c.nome}</p>
                        <p className="text-[10px] font-mono text-zinc-500">{c.cpf || c.cnpj || c.telefone || '-'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AREA DE OBSERVACOES */}
        <div className="lg:col-span-2">
          {!clienteSelecionado ? (
            <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardContent className="flex flex-col items-center justify-center py-20 text-zinc-600">
                <MessageSquare className="w-12 h-12 mb-3" />
                <p className="text-xs font-mono">Selecione um cliente para ver e adicionar observacoes</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardHeader className="border-b border-zinc-900/85 pb-4">
                <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-yellow-400" />
                  Observacoes — {clienteSelecionado.nome}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">

                {/* Campo nova observacao */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-zinc-500">Nova Observacao</label>
                  <div className="flex gap-2">
                    <textarea
                      value={novaObs}
                      onChange={(e) => setNovaObs(e.target.value)}
                      placeholder="Escreva uma observacao interna sobre este cliente..."
                      rows={3}
                      className="flex-1 bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={salvarObservacao}
                      disabled={salvando || !novaObs.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 cursor-pointer border border-yellow-500/30"
                    >
                      {salvando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      SALVAR
                    </button>
                  </div>
                </div>

                {/* Observacoes existentes */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  <p className="text-[10px] font-mono uppercase text-zinc-500 border-b border-zinc-900 pb-2">Historico</p>

                  {observacoes.length > 0 ? (
                    observacoes.map((obs, i) => (
                      <div key={i} className="bg-black/30 rounded-xl p-3 border border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-yellow-400 font-bold">{obs.autor || 'Sistema'}</span>
                          <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {obs.created_at ? new Date(obs.created_at).toLocaleString('pt-BR') : '-'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">{obs.texto}</p>
                      </div>
                    ))
                  ) : clienteSelecionado.observacoes ? (
                    <div className="bg-black/30 rounded-xl p-3 border border-zinc-800">
                      <p className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">{clienteSelecionado.observacoes}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                      <StickyNote className="w-8 h-8 mb-2" />
                      <p className="text-[10px] font-mono">Nenhuma observacao registrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}