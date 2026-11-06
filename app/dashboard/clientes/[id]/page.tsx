// ================================================================================
// FICHA COMPLETA DO CLIENTE - V5 FIBRA
// app/dashboard/clientes/[id]/page.tsx
// Orchestrador: header, tabs, estado global, imports dos componentes de aba
// ================================================================================

"use client"
import React, { use, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  User,
  Building2,
  Wifi,
  CreditCard,
  FileText,
  Headphones,
  Wrench,
  Clock,
  ChevronLeft,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Ban,
  XCircle,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase, corStatus, labelStatus } from './shared';

// Tabs (components/)
import TabDados from './components/TabDados';
import TabPlano from './components/TabPlano';
import TabFinanceiro from './components/TabFinanceiro';
import TabConexao from './components/TabConexao';
import TabSuporte from './components/TabSuporte';
import TabOS from './components/TabOS';
import TabHistorico from './components/TabHistorico';

// ==========================
// TABS CONFIG
// ==========================
const TABS = [
  { id: 'dados', label: 'Dados', icon: User },
  { id: 'contrato', label: 'Plano', icon: FileText },
  { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
  { id: 'conexao', label: 'Conexao', icon: Wifi },
  { id: 'suporte', label: 'Suporte', icon: Headphones },
  { id: 'os', label: 'OS', icon: Wrench },
  { id: 'historico', label: 'Historico', icon: Clock },
] as const;

type TabId = typeof TABS[number]['id'];

function iconeStatus(status: string) {
  switch(status) {
    case 'ativo': return <CheckCircle className="w-3 h-3" />;
    case 'inadimplente': return <AlertCircle className="w-3 h-3" />;
    case 'bloqueado': return <Ban className="w-3 h-3" />;
    case 'suspenso': return <Clock className="w-3 h-3" />;
    case 'cancelado': return <XCircle className="w-3 h-3" />;
    default: return <Clock className="w-3 h-3" />;
  }
}

// ==========================
// COMPONENTE PRINCIPAL
// ==========================
export default function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clienteId } = use(params);
  const { operador, empresa } = useAuth();
  const router = useRouter();

  // Estado global do cliente
  const [cliente, setCliente] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<TabId>('dados');
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');
  const [sucessoSalvar, setSucessoSalvar] = useState('');

  // Plano atual (necessario para o Financeiro acessar o nome do plano)
  const [planoAtual, setPlanoAtual] = useState<any>(null);

  // ==========================
  // CARREGAR CLIENTE (via API server-side — seguro)
  // ==========================
  const carregarCliente = useCallback(async () => {
    if (!clienteId) return;
    setCarregando(true);
    try {
      const res = await fetch(`/api/clientes?id=${clienteId}`, {
        credentials: 'include',
      });
      const result = await res.json();

      if (!res.ok || !result.success || !result.data) {
        console.error('Erro ao carregar cliente:', result.error);
        setCliente(null);
        return;
      }

      setCliente(result.data);
      setFormEdit({ ...result.data });
    } catch (e) {
      console.error('Erro ao carregar cliente:', e);
      setCliente(null);
    } finally {
      setCarregando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    carregarCliente();
  }, [carregarCliente]);

  // Carregar plano atual para compartilhar com Financeiro
  useEffect(() => {
    if (!clienteId || !supabase || !empresa) return;
    (async () => {
      try {
        const { data: contratoData } = await supabase
          .from('contratos')
          .select('*')
          .eq('cliente_id', clienteId)
          .eq('status', 'ativo')
          .single();
        if (contratoData?.plano_id) {
          const { data: planosData } = await supabase
            .from('planos')
            .select('*')
            .eq('empresa_id', empresa.id)
            .order('nome');
          const plano = (planosData || []).find((p: any) => p.id === contratoData.plano_id);
          setPlanoAtual(plano || null);
        } else {
          setPlanoAtual(null);
        }
      } catch { /* silencioso */ }
    })();
  }, [clienteId, empresa]);

  // Realtime
  useEffect(() => {
    if (!supabase || !clienteId) return;
    const canal = supabase
      .channel(`cliente-${clienteId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clientes', filter: `id=eq.${clienteId}` }, (payload) => {
        setCliente(payload.new);
        if (!editando) setFormEdit({ ...payload.new });
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [clienteId, editando]);

  // ==========================
  // SALVAR EDICAO
  // ==========================
  const salvarEdicao = async () => {
    setErroSalvar('');
    setSucessoSalvar('');
    setSalvando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: clienteId,
          empresa_id: empresa?.id,
          ...formEdit,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSucessoSalvar('Dados salvos com sucesso!');
        setEditando(false);
        carregarCliente();
        setTimeout(() => setSucessoSalvar(''), 3000);
      } else {
        setErroSalvar(data.error || 'Erro ao salvar');
      }
    } catch {
      setErroSalvar('Erro de conexao');
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicao = () => {
    setFormEdit({ ...cliente });
    setEditando(false);
    setErroSalvar('');
  };

  // Numero do cliente formatado
  const codigoCliente = cliente ? `#${String(cliente.created_at ? new Date(cliente.created_at).getTime() % 10000 : 1).padStart(4, '0')}` : '';

  // ==========================
  // LOADING
  // ==========================
  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Carregando cliente...</span>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] gap-4">
        <AlertCircle className="w-12 h-12 text-zinc-600" />
        <p className="text-sm font-mono text-zinc-500">Cliente nao encontrado</p>
        <button onClick={() => router.push('/dashboard/clientes')} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono hover:bg-zinc-700 transition-all">
          <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
        </button>
      </div>
    );
  }

  // ==========================
  // RENDER CONTEUDO DA ABA
  // ==========================
  const renderConteudoAba = () => {
    switch(abaAtiva) {
      case 'dados':
        return <TabDados cliente={cliente} editando={editando} formEdit={formEdit} setFormEdit={setFormEdit} erroSalvar={erroSalvar} sucessoSalvar={sucessoSalvar} />;
      case 'contrato':
        return <TabPlano clienteId={clienteId} empresa={empresa} />;
      case 'financeiro':
        return <TabFinanceiro clienteId={clienteId} empresa={empresa} cliente={cliente} editando={editando} formEdit={formEdit} setFormEdit={setFormEdit} planoAtual={planoAtual} />;
      case 'conexao':
        return <TabConexao cliente={cliente} editando={editando} formEdit={formEdit} setFormEdit={setFormEdit} />;
      case 'suporte':
        return <TabSuporte clienteId={clienteId} />;
      case 'os':
        return <TabOS clienteId={clienteId} />;
      case 'historico':
        return <TabHistorico cliente={cliente} />;
      default:
        return <TabDados cliente={cliente} editando={editando} formEdit={formEdit} setFormEdit={setFormEdit} erroSalvar={erroSalvar} sucessoSalvar={sucessoSalvar} />;
    }
  };

  // ==========================
  // RENDER PRINCIPAL
  // ==========================
  return (
    <div className="p-4 md:p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">

      {/* HEADER COM VOLTAR */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/clientes')} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              {cliente.tipo_pessoa === 'PJ' ? <Building2 className="w-6 h-6 text-zinc-400" /> : <User className="w-6 h-6 text-zinc-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black font-mono text-white">{cliente.nome}</h1>
                <span className="text-xs font-mono text-zinc-600">{codigoCliente}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold uppercase ${corStatus(cliente.status)}`}>
                  {iconeStatus(cliente.status)} {labelStatus(cliente.status)}
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-500 mt-0.5">
                {cliente.tipo_pessoa === 'PJ' ? cliente.cnpj : cliente.cpf}
                {cliente.cidade && ` · ${cliente.cidade}/${cliente.uf}`}
              </p>
            </div>
          </div>
        </div>

        {/* Botoes de acao rapida */}
        <div className="flex items-center gap-2 flex-wrap">
          {cliente.whatsapp && (
            <a
              href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
              title="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}

          {editando ? (
            <>
              <button onClick={cancelarEdicao} className="p-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all" title="Cancelar">
                <X className="w-4 h-4" />
              </button>
              <button onClick={salvarEdicao} disabled={salvando}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {salvando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                SALVAR
              </button>
            </>
          ) : (
            <button onClick={() => setEditando(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 text-xs font-mono font-bold uppercase transition-all">
              <Edit3 className="w-4 h-4" /> EDITAR
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-zinc-900">
        <div className="flex overflow-x-auto gap-0 -mb-px">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const ativa = abaAtiva === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setAbaAtiva(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  ativa
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEUDO DA ABA */}
      <div className="min-h-[400px]">
        {renderConteudoAba()}
      </div>

      {/* FOOTER INFO */}
      <div className="flex items-center justify-between text-[10px] text-zinc-600 font-mono border-t border-zinc-900 pt-4">
        <span>Cadastrado em: {cliente.created_at ? new Date(cliente.created_at).toLocaleString('pt-BR') : '-'}</span>
        <span>Atualizado em: {cliente.updated_at ? new Date(cliente.updated_at).toLocaleString('pt-BR') : '-'}</span>
      </div>
    </div>
  );
}