'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { painelApi } from '@/lib/painel-api';

interface CtoLocal {
  id: string;
  identificacao?: string;
  endereco?: string;
  portas_livres?: number;
  total_portas?: number;
}

export default function VendedorHomePage() {
  const [ctos, setCtos] = useState<CtoLocal[]>([]);
  const [carregandoCtos, setCarregandoCtos] = useState(true);
  const [estatisticas, setEstatisticas] = useState({ abordagens: 0, fechadas: 0, comissao: 0 });
 
  useEffect(() => {
    carregarDadosReais();
  }, []);

  const carregarDadosReais = async () => {
    setCarregandoCtos(true);
    try {
      // 1. Puxa as CTOs reais da sua tabela
      const resCtos = await fetch('/api/ctos', { credentials: 'same-origin' });
      const ctosJson = await resCtos.json().catch(() => ({}));
      if (ctosJson?.ctos) setCtos((ctosJson.ctos as any[]).slice(0, 5));

      // 2. Estatísticas de leads (filtradas pela empresa do operador)
      const resumo = await painelApi<{ total: number; convertidos: number }>('leads-resumo');
      setEstatisticas({
        abordagens: resumo.total || 0,
        fechadas: resumo.convertidos || 0,
        comissao: (resumo.convertidos || 0) * 60,
      });
    } catch (err) {
      console.error('Erro ao buscar dados do Supabase:', err);
    } finally {
      setCarregandoCtos(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Resumo Real do Dia */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Abordagens</span>
          <strong className="text-xl font-bold text-white">{estatisticas.abordagens}</strong>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Fechadas</span>
          <strong className="text-xl font-bold text-emerald-400">{estatisticas.fechadas}</strong>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Comissão Est.</span>
          <strong className="text-xl font-bold text-amber-400">R$ {estatisticas.comissao}</strong>
        </div>
      </section>

      {/* Botão Gigante de Nova Abordagem na Calçada */}
      <Link
        href="/vendedor/abordagem"
        className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] transition-all text-slate-950 font-bold py-4 px-5 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/15"
      >
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/15 p-2 rounded-xl">
            <Plus className="h-6 w-6" />
          </div>
          <div className="text-left">
            <span className="block text-base leading-tight">Nova Abordagem / Venda</span>
            <span className="text-xs font-medium text-slate-900/80">
              Capturar GPS e registrar cliente na porta
            </span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5" />
      </Link>

      {/* Radar de Viabilidade Óptica (CTOs Reais do Banco) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Navigation className="h-4 w-4 text-emerald-400" />
              CTOs Cadastradas (Base Real)
            </h2>
            <p className="text-xs text-slate-400">
              Portas disponíveis em tempo real
            </p>
          </div>

          <button
            onClick={carregarDadosReais}
            className="text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            {carregandoCtos ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="space-y-2.5">
          {carregandoCtos ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              Buscando caixas de atendimento no Supabase...
            </div>
          ) : ctos.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
              Nenhuma CTO encontrada na base.
            </div>
          ) : (
            ctos.map((cto) => {
              const portasLivres = cto.portas_livres ?? 0;
              const temViabilidade = portasLivres > 0;
              return (
                <div
                  key={cto.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {cto.identificacao || `CTO-${cto.id.slice(0, 4)}`}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Próxima
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {cto.endereco || 'Endereço não informado'}
                    </p>
                  </div>

                  {/* Status das Portas */}
                  <div className="text-right">
                    {temViabilidade ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {portasLivres} livres
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Lotada
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Atalho para Consulta Manual de Endereço */}
      <Link
        href="/viabilidade"
        className="block bg-slate-900/70 border border-dashed border-slate-700 rounded-xl p-3.5 text-center hover:border-slate-500 transition"
      >
        <span className="text-xs font-medium text-slate-300 flex items-center justify-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          Consultar viabilidade em outra rua/bairro
        </span>
      </Link>
    </div>
  );
}