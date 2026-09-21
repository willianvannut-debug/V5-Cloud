// ================================================================================
// 📋 CONTEXTO DA APLICAÇÃO - V5 CLOUD (COM SUPORTE A STATUS DE INSTALAÇÃO)
// context/AppContext.tsx
// ================================================================================

"use client"
import { logger } from '@/lib/logger';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Award, X } from 'lucide-react';

export interface LeadReal {
  id: string;
  nome: string;
  telefone: string;
  cep: string;
  endereco: string;
  status: 'COM COBERTURA' | 'SEM COBERTURA';
  cto: string;
  // 🚀 CORREÇÃO: Atualização das etapas permitidas para o TypeScript aceitar a nova nomenclatura
  etapa_funil: 'NOVO' | 'EM CONTATO' | 'AGENDADO' | 'MANDAR PARA INSTALAÇÃO' | 'NAO CONVERTIDO' | 'INSTALAÇÃO FEITA' | 'INSTALACAO_FEITA';
  status_instalacao?: 'CONCLUIDA' | 'PENDENTE' | string;
  motivo_pendencia?: string;
  atendente: string;
  plano: string;
  data: string;
  lat?: number;
  lon?: number;
}

interface AppContextType {
  leads: LeadReal[];
  adicionarLead: (lead: Omit<LeadReal, 'id' | 'etapa_funil' | 'atendente'>) => Promise<void>;
  atualizarEtapaLead: (id: string, novaEtapa: LeadReal['etapa_funil']) => Promise<void>;
  atribuirAtendenteLead: (ids: string[], atendente: string) => Promise<void>;
  limparTudo: () => Promise<void>;
  recarregarLeads: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_TOKEN = process.env.NEXT_PUBLIC_API_SECRET || '';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<LeadReal[]>([]);
  const [mostrarNotificacaoMeta, setMostrarNotificacaoMeta] = useState(false);
  const [metaBatidaDisparada, setMetaBatidaDisparada] = useState(false);

  // 🚀 RECARREGAR LEADS COM SINCRONIZAÇÃO INTELIGENTE
  const recarregarLeads = useCallback(async () => {
    let listaLocal: LeadReal[] = [];

    if (typeof window !== 'undefined') {
      try {
        const localCompartilhado = localStorage.getItem('v5_leads_unificados');
        if (localCompartilhado) {
          const parsed = JSON.parse(localCompartilhado);
          if (Array.isArray(parsed)) listaLocal = parsed;
        }
      } catch (e) {}
    }

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/leads?t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
      });

      if (res.ok) {
        const dados = await res.json();
        let listaRecebida: LeadReal[] = [];

        if (Array.isArray(dados)) {
          listaRecebida = dados;
        } else if (dados.leads && Array.isArray(dados.leads)) {
          listaRecebida = dados.leads;
        }

        if (listaRecebida.length > 0) {
          const listaSincronizada = listaRecebida.map(leadApi => {
            const leadDoCache = listaLocal.find(l => l.id === leadApi.id);
            if (leadDoCache && (leadDoCache.etapa_funil !== leadApi.etapa_funil || leadDoCache.status_instalacao !== leadApi.status_instalacao)) {
              return { 
                ...leadApi, 
                etapa_funil: leadDoCache.etapa_funil, 
                status_instalacao: leadDoCache.status_instalacao,
                motivo_pendencia: leadDoCache.motivo_pendencia,
                atendente: leadDoCache.atendente
              };
            }
            return leadApi;
          });

          setLeads(listaSincronizada);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('v5_leads_unificados', JSON.stringify(listaSincronizada));
          }
          return;
        }
      }
    } catch (e) {
      console.error("Aviso: API offline ou falhou, usando apenas cache local.");
    }

    if (listaLocal.length > 0) {
      setLeads(listaLocal);
    }
  }, []);

  useEffect(() => {
    recarregarLeads();
    
    const handler = () => recarregarLeads();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [recarregarLeads]);

  // Monitoramento global da Meta de Faturamento
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const metaSalva = localStorage.getItem('v5_meta_global');
    const metaGlobal = metaSalva ? parseFloat(metaSalva) : 10000;

    // 🚀 CORREÇÃO: Monitorar também a palavra com acentuação
    const totalInstalacoesFeitas = leads.filter(l => 
      l.etapa_funil === 'INSTALAÇÃO FEITA' || l.etapa_funil === 'INSTALACAO_FEITA' || l.status_instalacao === 'CONCLUIDA'
    ).length;
    
    const faturamentoAtual = totalInstalacoesFeitas * 99.90;

    if (metaGlobal > 0 && faturamentoAtual >= metaGlobal && !metaBatidaDisparada) {
      setMetaBatidaDisparada(true);
      setMostrarNotificacaoMeta(true);
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#10b981', '#34d399', '#ffffff', '#059669']
      });
    } else if (metaGlobal > 0 && faturamentoAtual < metaGlobal) {
      setMetaBatidaDisparada(false);
    }
  }, [leads, metaBatidaDisparada]);

  // 🚀 ADICIONAR LEAD
  const adicionarLead = async (novo: Omit<LeadReal, 'id' | 'etapa_funil' | 'atendente'>) => {
    const item: LeadReal = {
      ...novo,
      id: Date.now().toString(),
      etapa_funil: 'NOVO',
      atendente: 'Não atribuído'
    };

    setLeads(prev => {
      const novaLista = [...prev, item];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('v5_leads_unificados', JSON.stringify(novaLista));
          localStorage.setItem('v5_cache_leads', JSON.stringify(novaLista));
        } catch(e) {}
      }
      return novaLista;
    });

    try {
      await fetch(`/api/leads?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(item)
      });
    } catch (e) {}
  };

  const atualizarEtapaLead = async (id: string, novaEtapa: LeadReal['etapa_funil']) => {
    const atualizados = leads.map(l => l.id === id ? { ...l, etapa_funil: novaEtapa } : l);
    setLeads(atualizados);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('v5_leads_unificados', JSON.stringify(atualizados));
        localStorage.setItem('v5_cache_leads', JSON.stringify(atualizados));
      } catch (e) {}
    }

    try {
      await fetch(`/api/leads?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({ id, etapa_funil: novaEtapa, listaCompleta: atualizados })
      });
    } catch (e) {
      await recarregarLeads();
    }
  };

  const atribuirAtendenteLead = async (ids: string[], atendente: string) => {
    const atualizados = leads.map(l => ids.includes(l.id) ? { ...l, atendente } : l);
    setLeads(atualizados);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('v5_leads_unificados', JSON.stringify(atualizados));
        localStorage.setItem('v5_cache_leads', JSON.stringify(atualizados));
      } catch (e) {}
    }

    try {
      await fetch(`/api/leads?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({ idsAtribuidados: ids, atendente, listaCompleta: atualizados })
      });
    } catch (e) {
      await recarregarLeads();
    }
  };

  const limparTudo = async () => {
    setLeads([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('v5_leads_unificados');
        localStorage.removeItem('v5_cache_leads');
        localStorage.removeItem('v5_leads_operacional');
        await fetch(`/api/leads?t=${Date.now()}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`,
          },
          body: JSON.stringify({ limparTudo: true })
        });
        await recarregarLeads();
      } catch (e) {}
    }
  };

  return (
    <AppContext.Provider value={{ leads, adicionarLead, atualizarEtapaLead, atribuirAtendenteLead, limparTudo, recarregarLeads }}>
      {children}

      {mostrarNotificacaoMeta && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-zinc-950 border-2 border-emerald-500 rounded-2xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce text-zinc-50 font-sans">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Award className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Meta Concluída! 🎉</span>
                <button 
                  onClick={() => setMostrarNotificacaoMeta(false)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-sm font-bold font-mono text-white mt-1">Parabéns à Equipe!</h4>
              <p className="text-xs text-zinc-300 font-mono mt-0.5 leading-relaxed">
                A meta de faturamento global foi atingida com sucesso através das instalações em campo!
              </p>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp precisa ser usado dentro de um AppProvider');
  return context;
}