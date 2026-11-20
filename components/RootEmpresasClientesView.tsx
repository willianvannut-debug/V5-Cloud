// ================================================================================
// 👥 VISÃO DE CLIENTES PARA O ROOT MASTER (EMPRESAS/PROVEDORES QUE ASSINAM O V5 CLOUD)
// components/RootEmpresasClientesView.tsx
//
// Renderizada dentro da aba normal "Clientes" (app/dashboard/clientes/page.tsx)
// quando quem está logado é superadmin/root. Mostra os CLIENTES DO V5 CLOUD
// (as empresas/provedores que pagam pelo sistema), e NÃO os clientes finais
// de cada provedor. Os dados vêm só da tabela "empresas" — nunca das tabelas
// internas de cada tenant (clientes, leads com CPF etc.) — pra não vazar
// informação de uma empresa para a outra nem expor dado de cliente final aqui.
// ================================================================================

"use client"
import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2, Search, CheckCircle2, XCircle, ShieldAlert, Activity,
  Users, Network, Phone, Mail, Calendar, Loader2,
} from 'lucide-react';

interface EmpresaCliente {
  id: string;
  nome_empresa: string;
  endereco: string | null;
  lat: number | null;
  lon: number | null;
  plano: string | null;
  status_assinatura: string | null;
  telefone_suporte: string | null;
  email: string | null;
  telefone: string | null;
  criado_em: string | null;
  consumo?: { leads: number; instalados: number; pendentes: number; ctos: number; equipe: number };
}

function badgeStatus(statusBruto: string | null) {
  const status = (statusBruto || 'ativa').toLowerCase();
  if (status === 'ativa') return <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> ATIVA</span>;
  if (status === 'inadimplente') return <span className="text-red-400 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> INADIMPLENTE</span>;
  if (status === 'cancelada') return <span className="text-zinc-500 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> CANCELADA</span>;
  if (status === 'trial') return <span className="text-blue-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> TRIAL</span>;
  return <span className="text-zinc-400">DESCONHECIDO</span>;
}

export default function RootEmpresasClientesView({ role }: { role?: string }) {
  const [empresas, setEmpresas] = useState<EmpresaCliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const resposta = await fetch('/api/superadmin/consumo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        const resultado = await resposta.json();
        if (!resultado.sucesso) throw new Error(resultado.erro || 'Falha ao buscar empresas.');
        setEmpresas(resultado.dados || []);
      } catch (err: any) {
        setErro(err.message || 'Erro ao carregar clientes.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [role]);

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter((e) =>
      (e.nome_empresa || '').toLowerCase().includes(termo) ||
      (e.endereco || '').toLowerCase().includes(termo) ||
      (e.email || '').toLowerCase().includes(termo)
    );
  }, [empresas, busca]);

  const totais = useMemo(() => {
    const ativas = empresas.filter(e => (e.status_assinatura || 'ativa').toLowerCase() === 'ativa').length;
    const inadimplentes = empresas.filter(e => (e.status_assinatura || '').toLowerCase() === 'inadimplente').length;
    return { total: empresas.length, ativas, inadimplentes };
  }, [empresas]);

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold rounded-lg">Acesso Nível 5 (Root)</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" /> Clientes
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Empresas/provedores que assinam o V5 Cloud. Não inclui os clientes finais de cada provedor.</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 w-full md:w-96 backdrop-blur">
          <Search className="w-5 h-5 text-zinc-400 ml-2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou endereço..."
            className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* CARDS RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-400">Total de Clientes</span>
          <h3 className="text-3xl font-black font-mono text-white mt-2">{totais.total}</h3>
        </div>
        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-400">Ativos</span>
          <h3 className="text-3xl font-black font-mono text-emerald-400 mt-2">{totais.ativas}</h3>
        </div>
        <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-2xl p-5">
          <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-400">Inadimplentes</span>
          <h3 className="text-3xl font-black font-mono text-red-400 mt-2">{totais.inadimplentes}</h3>
        </div>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 font-mono text-sm">{erro}</div>
      )}

      {/* TABELA */}
      <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-500 bg-[#09090b]">
                <th className="p-4">Empresa</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4">Contato</th>
                <th className="p-4 text-center border-l border-zinc-900/50">Leads</th>
                <th className="p-4 text-center">CTOs</th>
                <th className="p-4 text-center border-r border-zinc-900/50">Equipe</th>
                <th className="p-4 text-right">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
              {carregando ? (
                <tr><td colSpan={8} className="p-12 text-center text-emerald-500 animate-pulse font-bold tracking-widest uppercase"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Carregando...</td></tr>
              ) : empresasFiltradas.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-zinc-500">Nenhum cliente encontrado.</td></tr>
              ) : (
                empresasFiltradas.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-900/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-bold font-sans text-sm text-white group-hover:text-emerald-400 transition-colors">{emp.nome_empresa || 'Instância Anônima'}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{emp.endereco || ''}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">{emp.plano || 'ESSENCIAL'}</span>
                    </td>
                    <td className="p-4 text-[10px] font-bold tracking-wider">{badgeStatus(emp.status_assinatura)}</td>
                    <td className="p-4 text-zinc-400">
                      <div className="space-y-1">
                        {(emp.telefone_suporte || emp.telefone) ? (
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {emp.telefone_suporte || emp.telefone}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                        {emp.email && (
                          <span className="flex items-center gap-1.5 text-[10px] text-zinc-500"><Mail className="w-3 h-3" /> {emp.email}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center border-l border-zinc-900/50"><span className="font-black text-white text-sm">{emp.consumo?.leads ?? 0}</span></td>
                    <td className="p-4 text-center"><span className="font-black text-white text-sm flex items-center justify-center gap-1"><Network className="w-3 h-3 text-amber-400" />{emp.consumo?.ctos ?? 0}</span></td>
                    <td className="p-4 text-center border-r border-zinc-900/50"><span className="font-black text-white text-sm flex items-center justify-center gap-1"><Users className="w-3 h-3 text-emerald-400" />{emp.consumo?.equipe ?? 0}</span></td>
                    <td className="p-4 text-right text-zinc-500 text-[10px]">
                      <span className="flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        {emp.criado_em ? new Date(emp.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
