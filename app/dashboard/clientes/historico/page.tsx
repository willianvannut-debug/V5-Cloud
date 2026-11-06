// ================================================================================
// HISTORICO / AUDITORIA DE CLIENTES - V5 FIBRA
// app/dashboard/clientes/historico/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Link from 'next/link';
import {
  History,
  ArrowLeft,
  Search,
  User,
  RefreshCw,
  Clock,
  FileText,
  Shield,
  Filter,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  UserPlus,
  Ban,
  Unlock,
  CreditCard,
  Wifi,
  Phone,
  Mail,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const TIPOS_EVENTO: Record<string, { label: string; cor: string; icone: any }> = {
  cadastro: { label: 'Cadastro', cor: 'text-emerald-400', icone: UserPlus },
  edicao: { label: 'Edicao', cor: 'text-blue-400', icone: Edit3 },
  status: { label: 'Status', cor: 'text-yellow-400', icone: Shield },
  bloqueio: { label: 'Bloqueio', cor: 'text-red-400', icone: Ban },
  desbloqueio: { label: 'Desbloqueio', cor: 'text-green-400', icone: Unlock },
  financeiro: { label: 'Financeiro', cor: 'text-purple-400', icone: CreditCard },
  conexao: { label: 'Conexao', cor: 'text-cyan-400', icone: Wifi },
  contato: { label: 'Contato', cor: 'text-orange-400', icone: Phone },
  email: { label: 'Email', cor: 'text-pink-400', icone: Mail },
  outro: { label: 'Outro', cor: 'text-zinc-400', icone: FileText },
};

export default function HistoricoPage() {
  const { operador, empresa } = useAuth();
  const { nomeProvedor } = useSettings();

  const [registros, setRegistros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [pagina, setPagina] = useState(0);
  const porPagina = 50;

  // Carregar historico
  const carregarHistorico = useCallback(async () => {
    if (!supabase || !empresa?.id) return;
    setCarregando(true);
    try {
      let query = supabase
        .from('cliente_historico')
        .select('*, clientes(nome)')
        .eq('empresa_id', empresa.id)
        .order('created_at', { ascending: false })
        .range(pagina * porPagina, (pagina + 1) * porPagina - 1);

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      if (busca) {
        query = query.or(`descricao.ilike.%${busca}%,autor.ilike.%${busca}%`);
      }

      const { data } = await query;
      if (data) setRegistros(data);
    } catch (e) {
      // Tabela pode nao existir ainda
      setRegistros([]);
    } finally {
      setCarregando(false);
    }
  }, [empresa?.id, filtroTipo, busca, pagina]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  const getEvento = (tipo: string) => TIPOS_EVENTO[tipo] || TIPOS_EVENTO.outro;

  const estiloSelect = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all appearance-none";

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/clientes" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <History className="w-6 h-6 text-orange-400" />
            Historico de Acoes
          </h1>
        </div>
        <p className="text-zinc-400 text-sm mt-0.5 ml-12">
          Registro completo de todas as acoes realizadas nos clientes (auditoria)
        </p>
      </div>

      {/* FILTROS */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Buscar por descricao ou autor..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPagina(0); }}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                value={filtroTipo}
                onChange={(e) => { setFiltroTipo(e.target.value); setPagina(0); }}
                className={estiloSelect}
              >
                <option value="todos">Todos os Tipos</option>
                {Object.entries(TIPOS_EVENTO).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={carregarHistorico}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-mono transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ATUALIZAR
            </button>
          </div>
        </CardContent>
      </Card>

      {/* TIMELINE */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            Log de Auditoria
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : registros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <History className="w-10 h-10 mb-3" />
              <p className="text-xs font-mono">Nenhum registro encontrado</p>
              <p className="text-[10px] font-mono text-zinc-700 mt-1">
                O historico sera preenchido automaticamente conforme acoes forem realizadas
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900/50">
              {registros.map((r, i) => {
                const evento = getEvento(r.tipo);
                const Icone = evento.icone;
                return (
                  <div key={r.id || i} className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-900/20 transition-colors">
                    {/* Icone */}
                    <div className={`w-9 h-9 rounded-xl bg-black/50 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5 ${evento.cor}`}>
                      <Icone className="w-4 h-4" />
                    </div>

                    {/* Conteudo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-mono text-white font-bold">{r.descricao || 'Acao registrada'}</p>
                          {r.clientes?.nome && (
                            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                              Cliente: <span className="text-zinc-300">{r.clientes.nome}</span>
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-black/30 border border-zinc-800 shrink-0 ${evento.cor}`}>
                          {evento.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {r.autor || 'Sistema'}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '-'}
                        </span>
                        {r.ip && (
                          <span className="text-[10px] font-mono text-zinc-700">
                            IP: {r.ip}
                          </span>
                        )}
                      </div>

                      {r.detalhes && (
                        <div className="mt-2 bg-black/30 rounded-lg p-2 border border-zinc-800/50">
                          <p className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap">{r.detalhes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginacao */}
          {registros.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-900">
              <button
                onClick={() => setPagina(Math.max(0, pagina - 1))}
                disabled={pagina === 0}
                className="text-[10px] font-mono text-zinc-500 hover:text-emerald-400 disabled:opacity-30 transition-all"
              >
                ← Anterior
              </button>
              <span className="text-[10px] font-mono text-zinc-600">Pagina {pagina + 1}</span>
              <button
                onClick={() => setPagina(pagina + 1)}
                disabled={registros.length < porPagina}
                className="text-[10px] font-mono text-zinc-500 hover:text-emerald-400 disabled:opacity-30 transition-all"
              >
                Proxima →
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}