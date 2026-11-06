// ================================================================================
// PAGINA DE CLIENTES - V5 FIBRA
// app/dashboard/clientes/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  Upload,
  Download,
  ArrowRightLeft,
  History,
  Wifi,
  StickyNote,
  Settings2,
  ChevronRight as ArrowRight,
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ==========================
// MASCARAS DE INPUT
// ==========================
function mascaraCPF(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

function mascaraCNPJ(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

function mascaraTelefone(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

function mascaraCEP(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

// ==========================
// CORES DE STATUS
// ==========================
function corStatus(status: string) {
  switch (status) {
    case 'ativo': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'inadimplente': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'bloqueado': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'suspenso': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'cancelado': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    case 'em_instalacao': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

function iconeStatus(status: string) {
  switch (status) {
    case 'ativo': return <CheckCircle className="w-3 h-3" />;
    case 'inadimplente': return <AlertCircle className="w-3 h-3" />;
    case 'bloqueado': return <Ban className="w-3 h-3" />;
    case 'suspenso': return <Clock className="w-3 h-3" />;
    case 'cancelado': return <XCircle className="w-3 h-3" />;
    case 'em_instalacao': return <Clock className="w-3 h-3" />;
    default: return <AlertCircle className="w-3 h-3" />;
  }
}

function labelStatus(status: string) {
  switch (status) {
    case 'ativo': return 'ATIVO';
    case 'inadimplente': return 'INADIMPLENTE';
    case 'bloqueado': return 'BLOQUEADO';
    case 'suspenso': return 'SUSPENSO';
    case 'cancelado': return 'CANCELADO';
    case 'em_instalacao': return 'EM INSTALACAO';
    default: return status.toUpperCase();
  }
}

// ==========================
// FORMULARIO VAZIO
// ==========================
const formularioVazio = {
  tipo_pessoa: 'PF',
  nome: '',
  cpf: '',
  rg: '',
  data_nascimento: '',
  sexo: '',
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  responsavel_nome: '',
  responsavel_cpf: '',
  email: '',
  telefone: '',
  telefone2: '',
  whatsapp: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  referencia: '',
  dia_vencimento: '10',
  forma_pagamento: 'boleto',
  observacoes: '',
};

// ==========================
// COMPONENTE PRINCIPAL
// ==========================
export default function ClientesPage() {
  const { operador, empresa } = useAuth();
  const { nomeProvedor } = useSettings();
  const router = useRouter();

  // Estados da listagem
  const [clientes, setClientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Estados do modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modalVisualizacao, setModalVisualizacao] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);

  // Estados de sincronizacao MikroTik
  const [sincronizando, setSincronizando] = useState(false);
  const [syncResultado, setSyncResultado] = useState<{ importados: number; erros: number } | null>(null);

  // Estados de exclusao
  const [clienteParaExcluir, setClienteParaExcluir] = useState<any>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [formulario, setFormulario] = useState({ ...formularioVazio });
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState('');

  // Contadores de status
  const [contadores, setContadores] = useState({
    total: 0,
    ativos: 0,
    inadimplentes: 0,
    bloqueados: 0,
    semPppoe: 0,
  });

  // ==========================
  // CARREGAR CLIENTES
  // ==========================
  const carregarClientes = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (empresa?.id) params.set('empresa_id', empresa.id);
      if (busca) params.set('busca', busca);
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
      params.set('pagina', String(paginaAtual));
      params.set('por_pagina', '50');

      const res = await fetch(`/api/clientes?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setClientes(data.clientes || []);
        setTotalClientes(data.total || 0);
        setTotalPaginas(data.totalPaginas || 1);
      }
    } catch (erro) {
      console.error('Erro ao carregar clientes:', erro);
    } finally {
      setCarregando(false);
    }
  }, [empresa?.id, busca, filtroStatus, paginaAtual]);

  // Carregar contadores de status
  const carregarContadores = useCallback(async () => {
    if (!supabase || !empresa?.id) return;

    try {
      const { count: total } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id);

      const { count: ativos } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id)
        .eq('status', 'ativo');

      const { count: inadimplentes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id)
        .eq('status', 'inadimplente');

      const { count: bloqueados } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id)
        .eq('status', 'bloqueado');

      // Contar clientes sem PPPoE configurado
      const { count: semPppoe } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresa.id)
        .not('status', 'eq', 'cancelado')
        .or('login_pppoe.is.null,login_pppoe.eq.');

      setContadores({
        total: total || 0,
        ativos: ativos || 0,
        inadimplentes: inadimplentes || 0,
        bloqueados: bloqueados || 0,
        semPppoe: semPppoe || 0,
      });
    } catch (e) {
      console.error('Erro ao carregar contadores:', e);
    }
  }, [empresa?.id]);

  useEffect(() => {
    carregarClientes();
    carregarContadores();
  }, [carregarClientes, carregarContadores]);

  // Realtime - escutar mudancas na tabela clientes
  useEffect(() => {
    if (!supabase) return;

    const canal = supabase
      .channel('clientes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        () => {
          carregarClientes();
          carregarContadores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarClientes, carregarContadores]);

  // ==========================
  // BUSCAR CEP (ViaCEP)
  // ==========================
  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (!data.erro) {
          setFormulario(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf,
          }));
        }
      }
    } catch (e) {
      console.error('Erro ao buscar CEP:', e);
    }
  };

  // ==========================
  // SINCRONIZAR CLIENTES DO MIKROTIK
  // Usa o /api/mk-proxy (mesmo que o Monitor usa)
  // ==========================
  const sincronizarMikroTik = async () => {
    if (!empresa?.id || !supabase || sincronizando) return;
    setSincronizando(true);
    setSyncResultado(null);

    try {
      // 1. Buscar secrets e ativos do MikroTik via mk-proxy (mesmo caminho do Monitor)
      const [resSecrets, resActive] = await Promise.all([
        fetch(`/api/mk-proxy?path=pppoe/secrets&empresa_id=${empresa.id}`).then(r => r.json()),
        fetch(`/api/mk-proxy?path=pppoe/active&empresa_id=${empresa.id}`).then(r => r.json()),
      ]);

      if (!resSecrets.success || !Array.isArray(resSecrets.data)) {
        setSyncResultado({ importados: 0, erros: 1 });
        console.error('Erro ao buscar secrets:', resSecrets);
        return;
      }

      // 2. Mapa de conexoes ativas (para pegar MAC)
      const ativosMap = new Map();
      if (resActive.success && Array.isArray(resActive.data)) {
        resActive.data.forEach((a: any) => ativosMap.set(a.name, a));
      }

      // 3. Buscar logins PPPoE ja cadastrados no Supabase
      const { data: clientesExistentes } = await supabase
        .from('clientes')
        .select('login_pppoe')
        .eq('empresa_id', empresa.id)
        .not('login_pppoe', 'is', null);

      const loginsExistentes = new Set(
        (clientesExistentes || [])
          .map((c: any) => c.login_pppoe?.toLowerCase())
          .filter(Boolean)
      );

      // 4. Filtrar apenas os novos (que nao existem no Supabase)
      const novos = resSecrets.data.filter((secret: any) =>
        !loginsExistentes.has(secret.name?.toLowerCase())
      );

      if (novos.length === 0) {
        setSyncResultado({ importados: 0, erros: 0 });
        return;
      }

      // 5. Inserir novos clientes no Supabase
      const clientesParaInserir = novos.map((secret: any) => {
        const ativo = ativosMap.get(secret.name);
        const perfilBloqueado = (secret.profile || '').toLowerCase().trim() === 'bloqueado';

        return {
          empresa_id: empresa.id,
          tipo_pessoa: 'PF',
          nome: secret.comment || secret.name,
          login_pppoe: secret.name,
          senha_pppoe: secret.password || '',
          perfil_radius: secret.profile || '',
          ip_fixo: secret['remote-address'] || '',
          mac_address: ativo?.caller_id || '',
          status: perfilBloqueado ? 'bloqueado' : 'ativo',
          observacoes: `Importado do MikroTik em ${new Date().toLocaleDateString('pt-BR')}`,
          dia_vencimento: 10,
          forma_pagamento: 'boleto',
        };
      });

      const { data: inseridos, error: insertError } = await supabase
        .from('clientes')
        .insert(clientesParaInserir)
        .select();

      if (insertError) {
        console.error('Erro ao inserir clientes:', insertError);
        setSyncResultado({ importados: 0, erros: novos.length });
      } else {
        setSyncResultado({ importados: inseridos?.length || novos.length, erros: 0 });
        carregarClientes();
        carregarContadores();
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setSyncResultado({ importados: 0, erros: 1 });
    } finally {
      setSincronizando(false);
    }
  };

  // ==========================
  // ATUALIZAR CAMPO DO FORMULARIO
  // ==========================
  const atualizarCampo = (campo: string, valor: string) => {
    let valorFormatado = valor;

    if (campo === 'cpf') valorFormatado = mascaraCPF(valor);
    if (campo === 'cnpj') valorFormatado = mascaraCNPJ(valor);
    if (campo === 'responsavel_cpf') valorFormatado = mascaraCPF(valor);
    if (campo === 'telefone' || campo === 'telefone2' || campo === 'whatsapp') {
      valorFormatado = mascaraTelefone(valor);
    }
    if (campo === 'cep') {
      valorFormatado = mascaraCEP(valor);
      if (valorFormatado.replace(/\D/g, '').length === 8) {
        buscarCEP(valorFormatado);
      }
    }

    setFormulario(prev => ({ ...prev, [campo]: valorFormatado }));
  };

  // ==========================
  // SALVAR CLIENTE
  // ==========================
  const salvarCliente = async () => {
    setErroFormulario('');

    // Validacoes basicas
    if (!formulario.nome.trim()) {
      setErroFormulario('Preencha o nome do cliente');
      return;
    }

    if (formulario.tipo_pessoa === 'PF' && !formulario.cpf.trim()) {
      setErroFormulario('Preencha o CPF do cliente');
      return;
    }

    if (formulario.tipo_pessoa === 'PJ' && !formulario.cnpj.trim()) {
      setErroFormulario('Preencha o CNPJ da empresa');
      return;
    }

    if (!formulario.telefone.trim() && !formulario.whatsapp.trim()) {
      setErroFormulario('Preencha pelo menos um telefone ou WhatsApp');
      return;
    }

    setSalvando(true);

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formulario,
          empresa_id: empresa?.id,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setModalAberto(false);
        setFormulario({ ...formularioVazio });
        carregarClientes();
        carregarContadores();
      } else {
        setErroFormulario(data.error || 'Erro ao cadastrar cliente');
      }
    } catch (erro) {
      setErroFormulario('Erro de conexao. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // ==========================
  // ABRIR MODAL DE VISUALIZACAO
  // ==========================
  const abrirVisualizacao = (cliente: any) => {
    setClienteSelecionado(cliente);
    setModalVisualizacao(true);
  };

  // ==========================
  // EXCLUIR CLIENTE
  // ==========================
  const excluirCliente = async () => {
    if (!clienteParaExcluir || excluindo) return;
    setExcluindo(true);

    try {
      const res = await fetch(`/api/clientes?id=${clienteParaExcluir.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setClienteParaExcluir(null);
        carregarClientes();
        carregarContadores();
      } else {
        console.error('Erro ao excluir cliente:', data);
        alert('Erro ao excluir cliente: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro de conexao ao excluir cliente.');
    } finally {
      setExcluindo(false);
    }
  };

  // ==========================
  // ESTILO DO INPUT
  // ==========================
  const estiloInput = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all";
  const estiloLabel = "text-[10px] font-mono uppercase text-zinc-500 mb-1.5 block";
  const estiloSelect = "w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all appearance-none";

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Clientes
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Gerencie todos os clientes do {nomeProvedor || 'provedor'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botao sincronizar MikroTik */}
          <button
            onClick={sincronizarMikroTik}
            disabled={sincronizando}
            className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-60 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border border-blue-500"
          >
            <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'SINCRONIZANDO...' : 'SINCRONIZAR MIKROTIK'}
          </button>

          {/* Botao novo cliente */}
          <button
            onClick={() => {
              setFormulario({ ...formularioVazio });
              setErroFormulario('');
              setModalAberto(true);
            }}
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          >
            <UserPlus className="w-4 h-4" />
            NOVO CLIENTE
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500">Total</p>
                <p className="text-2xl font-black text-white mt-1">{contadores.total}</p>
              </div>
              <Users className="w-8 h-8 text-zinc-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Ativos</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">{contadores.ativos}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-900" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-yellow-500">Inadimplentes</p>
                <p className="text-2xl font-black text-yellow-400 mt-1">{contadores.inadimplentes}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-900" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-red-500">Bloqueados</p>
                <p className="text-2xl font-black text-red-400 mt-1">{contadores.bloqueados}</p>
              </div>
              <Ban className="w-8 h-8 text-red-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ALERTA: Clientes sem PPPoE */}
      {contadores.semPppoe > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono">
          <Wifi className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-bold">{contadores.semPppoe} cliente{contadores.semPppoe !== 1 ? 's' : ''} sem PPPoE configurado.</span>
            <span className="text-yellow-500/70 ml-1">Clique no cliente para preencher os dados de conexao.</span>
          </div>
        </div>
      )}

      {/* RESULTADO DA SINCRONIZACAO */}
      {syncResultado && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-mono ${
          syncResultado.erros > 0 && syncResultado.importados === 0
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          <span>
            {syncResultado.importados > 0
              ? `${syncResultado.importados} cliente(s) importado(s) do MikroTik com sucesso!`
              : syncResultado.erros > 0
                ? 'Erro ao sincronizar. Verifique a conexao com o MikroTik.'
                : 'Todos os clientes do MikroTik ja estao cadastrados.'}
          </span>
          <button onClick={() => setSyncResultado(null)} className="ml-3 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BARRA DE BUSCA E FILTROS */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Campo de busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF, CNPJ, telefone ou email..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPaginaAtual(1);
                }}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all"
              />
              {busca && (
                <button
                  onClick={() => { setBusca(''); setPaginaAtual(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtro de status */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-600" />
              <select
                value={filtroStatus}
                onChange={(e) => { setFiltroStatus(e.target.value); setPaginaAtual(1); }}
                className="bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativo">Ativos</option>
                <option value="inadimplente">Inadimplentes</option>
                <option value="bloqueado">Bloqueados</option>
                <option value="suspenso">Suspensos</option>
                <option value="cancelado">Cancelados</option>
                <option value="em_instalacao">Em Instalacao</option>
              </select>
            </div>

            {/* Botao atualizar */}
            <button
              onClick={() => { carregarClientes(); carregarContadores(); }}
              className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border border-zinc-700"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              ATUALIZAR
            </button>
          </div>
        </CardContent>
      </Card>

      {/* TABELA DE CLIENTES */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            {totalClientes} cliente{totalClientes !== 1 ? 's' : ''} encontrado{totalClientes !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
              <span className="ml-3 text-xs text-zinc-500 font-mono">Carregando clientes...</span>
            </div>
          ) : clientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <Users className="w-12 h-12 mb-3" />
              <p className="text-xs font-mono">Nenhum cliente encontrado</p>
              <p className="text-[10px] font-mono mt-1">
                {busca ? 'Tente mudar os termos da busca' : 'Clique em "Novo Cliente" para cadastrar'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-900/50">
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase text-zinc-600 tracking-wider">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase text-zinc-600 tracking-wider hidden md:table-cell">CPF / CNPJ</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase text-zinc-600 tracking-wider hidden lg:table-cell">Contato</th>
                    <th className="text-left px-4 py-3 text-xs font-mono uppercase text-zinc-600 tracking-wider hidden lg:table-cell">Cidade</th>
                    <th className="text-center px-4 py-3 text-xs font-mono uppercase text-zinc-600 tracking-wider">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-mono uppercase text-zinc-600 tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="hover:bg-zinc-900/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/clientes/${cliente.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                            {cliente.tipo_pessoa === 'PJ' ? (
                              <Building2 className="w-4 h-4 text-zinc-500" />
                            ) : (
                              <User className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-white text-xs font-mono truncate max-w-[200px]">
                                {cliente.nome}
                              </p>
                              {!cliente.login_pppoe && cliente.status !== 'cancelado' && (
                                <span title="PPPoE nao configurado" className="flex-shrink-0">
                                  <Wifi className="w-3.5 h-3.5 text-yellow-400" />
                                </span>
                              )}
                            </div>
                            {cliente.tipo_pessoa === 'PJ' && cliente.nome_fantasia && (
                              <p className="text-xs text-zinc-500 truncate max-w-[200px]">
                                {cliente.nome_fantasia}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-mono text-zinc-400">
                          {cliente.tipo_pessoa === 'PJ' ? cliente.cnpj : cliente.cpf || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {(cliente.telefone || cliente.whatsapp) && (
                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {cliente.whatsapp || cliente.telefone}
                            </p>
                          )}
                          {cliente.email && (
                            <p className="text-xs text-zinc-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{cliente.email}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-zinc-400">
                          {cliente.cidade ? `${cliente.cidade}/${cliente.uf}` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase ${corStatus(cliente.status)}`}>
                          {iconeStatus(cliente.status)}
                          {labelStatus(cliente.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clientes/${cliente.id}`); }}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-all"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setClienteParaExcluir(cliente); }}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                            title="Excluir cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINACAO */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-900/50">
              <span className="text-xs text-zinc-600 font-mono">
                Pagina {paginaAtual} de {totalPaginas}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
                  disabled={paginaAtual <= 1}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
                  disabled={paginaAtual >= totalPaginas}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==========================
          MODAL - CADASTRAR CLIENTE
          ========================== */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl mx-4 shadow-2xl">

            {/* Header do modal */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-mono text-white">Novo Cliente</h2>
                  <p className="text-xs text-zinc-400 font-mono mt-1">Preencha os dados para cadastrar</p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do formulario */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Erro */}
              {erroFormulario && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {erroFormulario}
                </div>
              )}

              {/* Tipo de pessoa */}
              <div>
                <label className={estiloLabel}>Tipo de Pessoa</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => atualizarCampo('tipo_pessoa', 'PF')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                      formulario.tipo_pessoa === 'PF'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-white'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Pessoa Fisica (PF)
                  </button>
                  <button
                    type="button"
                    onClick={() => atualizarCampo('tipo_pessoa', 'PJ')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                      formulario.tipo_pessoa === 'PJ'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Pessoa Juridica (PJ)
                  </button>
                </div>
              </div>

              {/* CAMPOS PESSOA FISICA */}
              {formulario.tipo_pessoa === 'PF' && (
                <div className="space-y-4">
                  <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2">
                    Dados Pessoais
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={estiloLabel}>Nome Completo *</label>
                      <input
                        type="text"
                        placeholder="Nome do cliente"
                        value={formulario.nome}
                        onChange={(e) => atualizarCampo('nome', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>CPF *</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formulario.cpf}
                        onChange={(e) => atualizarCampo('cpf', e.target.value)}
                        maxLength={14}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>RG</label>
                      <input
                        type="text"
                        placeholder="Numero do RG"
                        value={formulario.rg}
                        onChange={(e) => atualizarCampo('rg', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>Data de Nascimento</label>
                      <input
                        type="date"
                        value={formulario.data_nascimento}
                        onChange={(e) => atualizarCampo('data_nascimento', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>Sexo</label>
                      <select
                        value={formulario.sexo}
                        onChange={(e) => atualizarCampo('sexo', e.target.value)}
                        className={estiloSelect}
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="O">Outro</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS PESSOA JURIDICA */}
              {formulario.tipo_pessoa === 'PJ' && (
                <div className="space-y-4">
                  <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2">
                    Dados da Empresa
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={estiloLabel}>Razao Social *</label>
                      <input
                        type="text"
                        placeholder="Razao social da empresa"
                        value={formulario.razao_social}
                        onChange={(e) => atualizarCampo('razao_social', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>Nome Fantasia</label>
                      <input
                        type="text"
                        placeholder="Nome fantasia"
                        value={formulario.nome_fantasia}
                        onChange={(e) => atualizarCampo('nome_fantasia', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>CNPJ *</label>
                      <input
                        type="text"
                        placeholder="00.000.000/0000-00"
                        value={formulario.cnpj}
                        onChange={(e) => atualizarCampo('cnpj', e.target.value)}
                        maxLength={18}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>Inscricao Estadual</label>
                      <input
                        type="text"
                        placeholder="Inscricao estadual"
                        value={formulario.inscricao_estadual}
                        onChange={(e) => atualizarCampo('inscricao_estadual', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>Inscricao Municipal</label>
                      <input
                        type="text"
                        placeholder="Inscricao municipal"
                        value={formulario.inscricao_municipal}
                        onChange={(e) => atualizarCampo('inscricao_municipal', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={estiloLabel}>Nome do Cliente / Contato *</label>
                      <input
                        type="text"
                        placeholder="Nome do responsavel ou contato principal"
                        value={formulario.nome}
                        onChange={(e) => atualizarCampo('nome', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>Responsavel Legal</label>
                      <input
                        type="text"
                        placeholder="Nome do responsavel"
                        value={formulario.responsavel_nome}
                        onChange={(e) => atualizarCampo('responsavel_nome', e.target.value)}
                        className={estiloInput}
                      />
                    </div>
                    <div>
                      <label className={estiloLabel}>CPF do Responsavel</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={formulario.responsavel_cpf}
                        onChange={(e) => atualizarCampo('responsavel_cpf', e.target.value)}
                        maxLength={14}
                        className={estiloInput}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONTATO */}
              <div className="space-y-4">
                <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2">
                  Contato
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={estiloLabel}>Telefone *</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formulario.telefone}
                      onChange={(e) => atualizarCampo('telefone', e.target.value)}
                      maxLength={15}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>WhatsApp</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formulario.whatsapp}
                      onChange={(e) => atualizarCampo('whatsapp', e.target.value)}
                      maxLength={15}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>Telefone 2</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={formulario.telefone2}
                      onChange={(e) => atualizarCampo('telefone2', e.target.value)}
                      maxLength={15}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>E-mail</label>
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={formulario.email}
                      onChange={(e) => atualizarCampo('email', e.target.value)}
                      className={estiloInput}
                    />
                  </div>
                </div>
              </div>

              {/* ENDERECO */}
              <div className="space-y-4">
                <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2">
                  Endereco de Instalacao
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={estiloLabel}>CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={formulario.cep}
                      onChange={(e) => atualizarCampo('cep', e.target.value)}
                      maxLength={9}
                      className={estiloInput}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={estiloLabel}>Logradouro</label>
                    <input
                      type="text"
                      placeholder="Rua, Avenida..."
                      value={formulario.logradouro}
                      onChange={(e) => atualizarCampo('logradouro', e.target.value)}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>Numero</label>
                    <input
                      type="text"
                      placeholder="123"
                      value={formulario.numero}
                      onChange={(e) => atualizarCampo('numero', e.target.value)}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto, Bloco..."
                      value={formulario.complemento}
                      onChange={(e) => atualizarCampo('complemento', e.target.value)}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>Bairro</label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={formulario.bairro}
                      onChange={(e) => atualizarCampo('bairro', e.target.value)}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>Cidade</label>
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={formulario.cidade}
                      onChange={(e) => atualizarCampo('cidade', e.target.value)}
                      className={estiloInput}
                    />
                  </div>
                  <div>
                    <label className={estiloLabel}>UF</label>
                    <select
                      value={formulario.uf}
                      onChange={(e) => atualizarCampo('uf', e.target.value)}
                      className={estiloSelect}
                    >
                      <option value="">UF</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={estiloLabel}>Referencia</label>
                    <input
                      type="text"
                      placeholder="Ponto de referencia"
                      value={formulario.referencia}
                      onChange={(e) => atualizarCampo('referencia', e.target.value)}
                      className={estiloInput}
                    />
                  </div>
                </div>
              </div>

              {/* FINANCEIRO */}
              <div className="space-y-4">
                <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2">
                  Financeiro
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={estiloLabel}>Dia de Vencimento</label>
                    <select
                      value={formulario.dia_vencimento}
                      onChange={(e) => atualizarCampo('dia_vencimento', e.target.value)}
                      className={estiloSelect}
                    >
                      {[5, 10, 15, 20, 25].map(dia => (
                        <option key={dia} value={String(dia)}>Dia {dia}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={estiloLabel}>Forma de Pagamento</label>
                    <select
                      value={formulario.forma_pagamento}
                      onChange={(e) => atualizarCampo('forma_pagamento', e.target.value)}
                      className={estiloSelect}
                    >
                      <option value="boleto">Boleto</option>
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartao de Credito</option>
                      <option value="debito_automatico">Debito Automatico</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* OBSERVACOES */}
              <div>
                <label className={estiloLabel}>Observacoes</label>
                <textarea
                  placeholder="Observacoes sobre o cliente..."
                  value={formulario.observacoes}
                  onChange={(e) => atualizarCampo('observacoes', e.target.value)}
                  rows={3}
                  className={`${estiloInput} resize-none`}
                />
              </div>
            </div>

            {/* Footer do modal */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-900">
              <button
                onClick={() => setModalAberto(false)}
                className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-mono font-bold uppercase transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={salvarCliente}
                disabled={salvando}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    SALVANDO...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    CADASTRAR CLIENTE
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================
          MODAL - CONFIRMAR EXCLUSAO
          ========================== */}
      {clienteParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-mono text-white">Excluir Cliente</h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">Essa acao nao pode ser desfeita</p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <p className="text-xs text-zinc-300 font-mono">
                  Tem certeza que deseja excluir o cliente{' '}
                  <span className="text-white font-bold">{clienteParaExcluir.nome}</span>?
                </p>
                {clienteParaExcluir.login_pppoe && (
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    Login PPPoE: {clienteParaExcluir.login_pppoe}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setClienteParaExcluir(null)}
                  disabled={excluindo}
                  className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-mono font-bold uppercase transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={excluirCliente}
                  disabled={excluindo}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs font-mono tracking-wider transition-all disabled:opacity-50"
                >
                  {excluindo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      EXCLUINDO...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      EXCLUIR
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================
          MODAL - VISUALIZAR CLIENTE
          ========================== */}
      {modalVisualizacao && clienteSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  {clienteSelecionado.tipo_pessoa === 'PJ' ? (
                    <Building2 className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <User className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold font-mono text-white">{clienteSelecionado.nome}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-zinc-500">
                      {clienteSelecionado.tipo_pessoa === 'PJ' ? clienteSelecionado.cnpj : clienteSelecionado.cpf}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono font-bold uppercase ${corStatus(clienteSelecionado.status)}`}>
                      {iconeStatus(clienteSelecionado.status)}
                      {labelStatus(clienteSelecionado.status)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalVisualizacao(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteudo */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Contato */}
              <div>
                <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest mb-3">Contato</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clienteSelecionado.telefone && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Phone className="w-4 h-4 text-zinc-600" />
                      <span className="text-zinc-300">{clienteSelecionado.telefone}</span>
                    </div>
                  )}
                  {clienteSelecionado.whatsapp && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span className="text-zinc-300">{clienteSelecionado.whatsapp}</span>
                      <span className="text-[10px] font-mono text-emerald-500">(WhatsApp)</span>
                    </div>
                  )}
                  {clienteSelecionado.email && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Mail className="w-4 h-4 text-zinc-600" />
                      <span className="text-zinc-300">{clienteSelecionado.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereco */}
              {(clienteSelecionado.logradouro || clienteSelecionado.cidade) && (
                <div>
                  <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest mb-3">Endereco</p>
                  <div className="flex items-start gap-2 text-xs font-mono">
                    <MapPin className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />
                    <div className="text-zinc-300">
                      {clienteSelecionado.logradouro && (
                        <p>{clienteSelecionado.logradouro}, {clienteSelecionado.numero} {clienteSelecionado.complemento}</p>
                      )}
                      <p>
                        {clienteSelecionado.bairro && `${clienteSelecionado.bairro} - `}
                        {clienteSelecionado.cidade && `${clienteSelecionado.cidade}`}
                        {clienteSelecionado.uf && `/${clienteSelecionado.uf}`}
                        {clienteSelecionado.cep && ` - CEP: ${clienteSelecionado.cep}`}
                      </p>
                      {clienteSelecionado.referencia && (
                        <p className="text-zinc-500 text-xs mt-1">Ref: {clienteSelecionado.referencia}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Financeiro */}
              <div>
                <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest mb-3">Financeiro</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900/40 rounded-xl p-3 border border-zinc-900">
                    <p className="text-[10px] font-mono uppercase text-zinc-500">Vencimento</p>
                    <p className="text-xs font-bold font-mono text-zinc-200 mt-1">Dia {clienteSelecionado.dia_vencimento || 10}</p>
                  </div>
                  <div className="bg-zinc-900/40 rounded-xl p-3 border border-zinc-900">
                    <p className="text-[10px] font-mono uppercase text-zinc-500">Pagamento</p>
                    <p className="text-xs font-bold font-mono text-zinc-200 mt-1 capitalize">{clienteSelecionado.forma_pagamento || 'Boleto'}</p>
                  </div>
                </div>
              </div>

              {/* PJ extras */}
              {clienteSelecionado.tipo_pessoa === 'PJ' && (
                <div>
                  <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest mb-3">Dados Empresa</p>
                  <div className="space-y-2 text-xs font-mono">
                    {clienteSelecionado.razao_social && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-600" />
                        <span className="text-zinc-500">Razao Social:</span>
                        <span className="text-zinc-300">{clienteSelecionado.razao_social}</span>
                      </div>
                    )}
                    {clienteSelecionado.nome_fantasia && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-zinc-600" />
                        <span className="text-zinc-500">Fantasia:</span>
                        <span className="text-zinc-300">{clienteSelecionado.nome_fantasia}</span>
                      </div>
                    )}
                    {clienteSelecionado.inscricao_estadual && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-600" />
                        <span className="text-zinc-500">IE:</span>
                        <span className="text-zinc-300">{clienteSelecionado.inscricao_estadual}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observacoes */}
              {clienteSelecionado.observacoes && (
                <div>
                  <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest mb-3">Observacoes</p>
                  <p className="text-xs text-zinc-400 font-mono bg-zinc-900/40 rounded-xl p-3 border border-zinc-900">
                    {clienteSelecionado.observacoes}
                  </p>
                </div>
              )}

              {/* Data de cadastro */}
              <div className="text-xs text-zinc-600 font-mono pt-2 border-t border-zinc-900">
                Cadastrado em: {clienteSelecionado.created_at ? new Date(clienteSelecionado.created_at).toLocaleString('pt-BR') : '-'}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-zinc-900">
              <button
                onClick={() => setModalVisualizacao(false)}
                className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-mono font-bold uppercase transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}