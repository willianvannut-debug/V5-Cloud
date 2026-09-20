//app/dashboard/superadmin/page.tsx

"use client"
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Building2, ExternalLink, Loader2, Search, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface EmpresaItem {
  id: string;
  nome_empresa: string;
  endereco: string;
  codigo_convite: string;
  created_at: string;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { operador, carregando } = useAuth();
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [busca, setBusca] = useState('');
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [acessandoId, setAcessandoId] = useState<string | null>(null);

  // Redireciona se não for superadmin
  useEffect(() => {
    if (!carregando && operador && operador.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [operador, carregando, router]);

  const carregarEmpresas = async () => {
    try {
      const res = await fetch('/api/auth/suporte/empresas');
      const data = await res.json();
      if (data.sucesso) {
        setEmpresas(data.empresas || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const handleEntrarNaConta = async (empresaId: string) => {
    setAcessandoId(empresaId);
    try {
      const res = await fetch('/api/auth/suporte/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaIdAlvo: empresaId })
      });

      const data = await res.json();
      if (data.sucesso) {
        // Redireciona para o dashboard com os dados da empresa selecionada carregados
        window.location.href = '/dashboard';
      } else {
        alert(data.mensagem || 'Falha ao assumir sessão.');
        setAcessandoId(null);
      }
    } catch (e) {
      alert('Erro ao conectar com o servidor.');
      setAcessandoId(null);
    }
  };

  const empresasFiltradas = empresas.filter(emp =>
    emp.nome_empresa.toLowerCase().includes(busca.toLowerCase()) ||
    emp.codigo_convite?.toLowerCase().includes(busca.toLowerCase()) ||
    emp.id.includes(busca)
  );

  if (carregando || carregandoLista) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-emerald-400 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando Painel Master...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
              Root Level / Suporte Global
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> Central de Clientes SaaS
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Gerenciamento direto de instâncias para suporte técnico e auditoria.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 pl-9"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresasFiltradas.length === 0 ? (
          <div className="col-span-full p-8 text-center border border-dashed border-zinc-900 rounded-2xl text-zinc-600 font-mono text-xs">
            Nenhuma empresa encontrada na base.
          </div>
        ) : (
          empresasFiltradas.map((empresa) => (
            <div
              key={empresa.id}
              className="p-5 bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 rounded-2xl flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="truncate max-w-[180px]">{empresa.nome_empresa}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md">
                    {empresa.codigo_convite || 'SEM CÓDIGO'}
                  </span>
                </div>

                <p className="text-zinc-500 font-mono text-[11px] truncate">
                  {empresa.endereco || 'Endereço não informado'}
                </p>
                <div className="text-[10px] font-mono text-zinc-600 truncate">
                  ID: {empresa.id}
                </div>
              </div>

              <button
                type="button"
                disabled={acessandoId === empresa.id}
                onClick={() => handleEntrarNaConta(empresa.id)}
                className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {acessandoId === empresa.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Acessar Painel do Cliente
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}