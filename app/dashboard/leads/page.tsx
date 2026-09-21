// ================================================================================
// 📋 ROTA DE LEADS (FRONTEND) - V5 CLOUD (OCULTAR CÁLCULO SE NÃO FEITA)
// app/dashboard/leads/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Search, Phone, Clock, Filter, MessageSquare, AlertTriangle, X, Trash2, Globe, Navigation, Loader2, MapPin
} from 'lucide-react';
import { useApp, LeadReal } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { PLANOS } from '@/lib/planLimites';
import { createClient } from '@supabase/supabase-js';
import { lerOperacional, limparOperacional } from '@/lib/operacional';

import dynamic from 'next/dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// 🗺️ Carregamento dinâmico do mapa
const MapWithNoSSR = dynamic(
  async () => {
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } = await import('react-leaflet');
    
    function MapEventsHandler({ setZoomAtual, setMapBounds }: any) {
      useMapEvents({
        zoomend(e: any) {
          setZoomAtual(e.target.getZoom());
        },
        moveend(e: any) {
          setMapBounds(e.target.getBounds());
        },
        load(e: any) {
          setZoomAtual(e.target.getZoom());
          setMapBounds(e.target.getBounds());
        }
      });
      return null;
    }

    return function MapComponent({ centroMapa, ctosAgrupadas, leadsVisiveisNoViewport, iconeCto, criarIconeClusterLead, iconeVerde, iconeVermelho, iconeCiano, iconeAmarelo, selecionarLeadParaPainel, rotaAtivaCoords, setZoomAtual, setMapBounds }: any) {
      return (
        <MapContainer 
          center={centroMapa} 
          zoom={14} 
          minZoom={4} 
          maxBounds={[
            [-35.0, -75.0], 
            [6.0, -32.0]    
          ]}
          maxBoundsViscosity={1.0}
          style={{ width: '100%', height: '100%', background: '#09090b' }}
        >
          <MapEventsHandler setZoomAtual={setZoomAtual} setMapBounds={setMapBounds} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {ctosAgrupadas.map((item: any) => {
            if (item.tipo === 'cluster') {
              const iconeCluster = criarIconeClusterLead(item.quantidade);
              if (!iconeCluster) return null;
              return (
                <Marker key={item.id} position={[item.lat, item.lon]} icon={iconeCluster}>
                  <Popup>
                    <div className="font-mono text-xs text-zinc-900 p-1 space-y-1">
                      <strong className="text-blue-600 block font-black text-sm uppercase">Região com {item.quantidade} Caixas CTO</strong>
                      <span className="font-sans text-zinc-700 block">Aproxime o zoom para ver os detalhes individuais.</span>
                    </div>
                  </Popup>
                </Marker>
              );
            } else {
              if (item.lat !== undefined && item.lon !== undefined && iconeCto) {
                return (
                  <Marker key={`cto-${item.id}`} position={[item.lat, item.lon]} icon={iconeCto}>
                    <Popup>
                      <div className="font-mono text-xs text-zinc-900 p-1 space-y-1">
                        <strong className="text-blue-600 block font-black text-sm uppercase">Infra: {item.identificacao}</strong>
                        <span className="font-sans text-zinc-700 block">{item.endereco || "Caixa Óptica"}</span>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
            }
            return null;
          })}

          {leadsVisiveisNoViewport.map((lead: any) => {
            if (lead.lat && lead.lon) {
              let iconeAtual = lead.status === 'COM COBERTURA' ? iconeVerde : iconeVermelho;
              
              const perfilLead = String(lead.perfil || '').toUpperCase();
              const statusTecnico = String(lead.status_instalacao || lead.statusOperacional || '').toUpperCase();
              const deuProblema = perfilLead === 'NÃO FEITA' || statusTecnico === 'PENDENTE' || statusTecnico === 'PROBLEMA' || statusTecnico === 'FALHA' || statusTecnico === 'REMARCAR';

              if (deuProblema) {
                iconeAtual = iconeAmarelo;
              } else if (lead.etapa_funil === 'MANDAR PARA INSTALAÇÃO') {
                iconeAtual = iconeCiano; 
              }

              if (!iconeAtual) return null;

              return (
                <Marker 
                  key={`lead-${lead.id}`} 
                  position={[lead.lat, lead.lon]} 
                  icon={iconeAtual}
                  eventHandlers={{
                    click: () => selecionarLeadParaPainel(lead)
                  }}
                />
              );
            }
            return null;
          })}

          {rotaAtivaCoords.length > 1 && (
            <Polyline positions={rotaAtivaCoords} color="#10b981" weight={4} opacity={0.85} dashArray="6, 6" />
          )}

        </MapContainer>
      );
    };
  },
  { ssr: false }
);

export default function LeadsPage() {
  const { leads: leadsContexto, atualizarEtapaLead, limparTudo } = useApp();
  const settings = useSettings();
  const { operador, empresa } = useAuth();
  const ctos = settings?.ctos || [];
  
  const [operacional, setOperacional] = useState<any[]>([]);
  const [leadsApi, setLeadsApi] = useState<any[] | null>(null);

  const carregarLeadsSupabase = useCallback(async () => {
    try {
      const resposta = await fetch('/api/leads?origem=pc', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (resposta.ok) {
        const dados = await resposta.json();
        if (Array.isArray(dados)) {
          setLeadsApi(dados);
        }
      }
    } catch (erro) {
      console.error("Erro ao carregar leads do Supabase:", erro);
    }
  }, []);

  useEffect(() => {
    carregarLeadsSupabase();

    if (!supabase) return;

    const canal = supabase
      .channel('leads-realtime-pc')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('⚡ Atualização do Supabase detectada em tempo real:', payload);
          carregarLeadsSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregarLeadsSupabase]);

  useEffect(() => {
    const carregarOperacional = async () => {
      const dados = await lerOperacional();
      setOperacional(dados);
    };

    carregarOperacional();

    window.addEventListener('v5-operacional', carregarOperacional);
    return () => {
      window.removeEventListener('v5-operacional', carregarOperacional);
    };
  }, []);

  const leadsSource = leadsApi !== null ? leadsApi : leadsContexto;

  const leads = useMemo(
    () => (leadsSource || []).map((l: any) => {
      const op = operacional.find((p: any) => p.id === l.id);
      return op ? { ...l, ...op } : l;
    }),
    [leadsSource, operacional]
  );
  
  const [planoAtual, setPlanoAtual] = useState<string>('');
  const [zoomAtual, setZoomAtual] = useState(14);
  const [mapBounds, setMapBounds] = useState<any>(null);

  useEffect(() => {
    async function sincronizarPlanoReal() {
      const planoDoContexto = empresa?.plano || operador?.empresa?.plano;
      if (planoDoContexto) {
        setPlanoAtual(String(planoDoContexto).toLowerCase().trim());
        return;
      }

      if (!supabase) return;
      try {
        const idDaEmpresa = operador?.empresaId || operador?.empresa_id;
        if (!idDaEmpresa) {
          setPlanoAtual('essencial');
          return;
        }

        const { data, error } = await supabase
          .from('empresas')
          .select('plano')
          .eq('id', idDaEmpresa)
          .maybeSingle();

        if (!error && data && data.plano) {
          const planoLimpo = String(data.plano).toLowerCase().trim();
          setPlanoAtual(planoLimpo);
        } else {
          setPlanoAtual('essencial');
        }
      } catch (err) {
        console.error("Erro ao buscar plano nos leads:", err);
        setPlanoAtual('essencial');
      }
    }
    sincronizarPlanoReal();
  }, [operador, empresa]);

  const [filtroTab, setFiltroTab] = useState<'TODOS' | 'COM COBERTURA' | 'SEM COBERTURA'>('TODOS');
  const [busca, setBusca] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState<string | null>(null);
  const [novaEtapaPendente, setNovaEtapaPendente] = useState<LeadReal['etapa_funil'] | null>(null);

  const [iconeVerde, setIconeVerde] = useState<any>(null);
  const [iconeVermelho, setIconeVermelho] = useState<any>(null);
  const [iconeAmarelo, setIconeAmarelo] = useState<any>(null);
  const [iconeCiano, setIconeCiano] = useState<any>(null);
  const [iconeCto, setIconeCto] = useState<any>(null);
  const [criarIconeClusterLead, setCriarIconeClusterLead] = useState<any>(null);
  const [mapaPronto, setMapaPronto] = useState(false);

  const [leadAtivoPainel, setLeadAtivoPainel] = useState<any | null>(null);
  const [rotaAtivaCoords, setRotaAtivaCoords] = useState<[number, number][]>([[]]);
  const [distanciaRotaAtiva, setDistanciaRotaAtiva] = useState<string>('');
  const [ctoVinculadaNome, setCtoVinculadaNome] = useState<string>('');
  const [calculandoRota, setCalculandoRota] = useState(false);

  const limparRota = () => {
    setRotaAtivaCoords([[]]);
    setDistanciaRotaAtiva('');
    setCtoVinculadaNome('');
    setLeadAtivoPainel(null);
    setCalculandoRota(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (!document.getElementById('leaflet-dark-mode')) {
          const style = document.createElement('style');
          style.id = 'leaflet-dark-mode';
          style.innerHTML = `
            .leaflet-tile-pane {
              filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(95%) !important;
            }
            .leaflet-container {
              background: #09090b !important;
            }
          `;
          document.head.appendChild(style);
        }
      } catch (e) {
        console.error("Erro ao injetar estilos:", e);
      }

      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        
        const cleanGreen = L.divIcon({
          className: 'clean-green',
          html: `<div style="width: 12px; height: 12px; background-color: #10b981; border: 1.5px solid #000; border-radius: 2px; cursor: pointer;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const cleanRed = L.divIcon({
          className: 'clean-red',
          html: `<div style="width: 12px; height: 12px; background-color: #ef4444; border: 1.5px solid #000; border-radius: 2px; cursor: pointer;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const cleanYellow = L.divIcon({
          className: 'clean-yellow',
          html: `<div style="width: 12px; height: 12px; background-color: #f59e0b; border: 1.5px solid #000; border-radius: 2px; cursor: pointer;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const cleanCyan = L.divIcon({
          className: 'clean-cyan',
          html: `<div style="width: 12px; height: 12px; background-color: #06b6d4; border: 1.5px solid #000; border-radius: 2px; cursor: pointer;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const cleanCto = L.divIcon({
          className: 'clean-cto',
          html: `<div style="width: 12px; height: 12px; background-color: #3b82f6; border: 1.5px solid #000000; border-radius: 2px;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const funcCluster = (quantidade: number) => L.divIcon({
          className: 'cluster-marker-lead',
          html: `<div style="background-color: #3b82f6; color: #fff; font-weight: 900; font-family: monospace; font-size: 11px; width: 30px; height: 30px; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${quantidade}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        setIconeVerde(cleanGreen);
        setIconeVermelho(cleanRed);
        setIconeAmarelo(cleanYellow);
        setIconeCiano(cleanCyan);
        setIconeCto(cleanCto);
        setCriarIconeClusterLead(() => funcCluster);
        setMapaPronto(true);
      });
    }
  }, []);

  const ctosAgrupadasParaExibir = useMemo(() => {
    if (ctos.length === 0) return [];

    const visiveis = (!mapBounds || ctos.length <= 1000) 
      ? ctos 
      : ctos.filter((cto: any) => cto.lat !== undefined && cto.lon !== undefined && mapBounds.contains([cto.lat, cto.lon]));

    if (zoomAtual >= 15) {
      return visiveis.map((c: any) => ({ tipo: 'individual', ...c }));
    }

    const precisaoDecimal = zoomAtual < 12 ? 1 : 2;
    const clustersMap: { [key: string]: { lat: number; lon: number; itens: any[] } } = {};

    visiveis.forEach((cto: any) => {
      if (cto.lat === undefined || cto.lon === undefined) return;
      const latKey = cto.lat.toFixed(precisaoDecimal);
      const lonKey = cto.lon.toFixed(precisaoDecimal);
      const chave = `${latKey},${lonKey}`;

      if (!clustersMap[chave]) {
        clustersMap[chave] = { lat: cto.lat, lon: cto.lon, itens: [] };
      }
      clustersMap[chave].itens.push(cto);
    });

    return Object.values(clustersMap).map(cluster => {
      if (cluster.itens.length === 1) {
        return { tipo: 'individual', ...cluster.itens[0] };
      } else {
        return {
          tipo: 'cluster',
          id: `cluster-lead-${cluster.lat}-${cluster.lon}`,
          lat: cluster.lat,
          lon: cluster.lon,
          quantidade: cluster.itens.length,
          itens: cluster.itens
        };
      }
    });
  }, [ctos, mapBounds, zoomAtual]);

  const isLeadVisivel = (lead: any) => {
    const etapa = String(lead.etapa_funil || lead.perfil || '').toUpperCase();
    if (etapa === 'INSTALAÇÃO FEITA' || etapa === 'INSTALACAO FEITA') return false;
    return true;
  };

  const leadsInvertidos = [...(leads || [])].reverse();
  
  const leadsVisiveisNoViewport = useMemo(() => {
    const ativosFiltrados = leadsInvertidos.filter(isLeadVisivel);
    
    if (!mapBounds || ativosFiltrados.length <= 500) {
      return ativosFiltrados;
    }
    return ativosFiltrados.filter((lead: any) => {
      if (!lead.lat || !lead.lon) return false;
      return mapBounds.contains([lead.lat, lead.lon]);
    });
  }, [leadsInvertidos, mapBounds]);

  const selecionarLeadParaPainel = (lead: any) => {
    setLeadAtivoPainel(lead);
    setRotaAtivaCoords([[]]);
    setDistanciaRotaAtiva('');
    setCtoVinculadaNome('');
    setCalculandoRota(false);
  };

  const calcularRotaDoLead = async (lead: any) => {
    setCalculandoRota(true);
    setDistanciaRotaAtiva('');
    setRotaAtivaCoords([[]]);
    setCtoVinculadaNome('');

    if (!ctos || ctos.length === 0) {
      setDistanciaRotaAtiva('Nenhuma CTO cadastrada na infra.');
      setCalculandoRota(false);
      return;
    }

    let ctoMaisProxima = ctos[0];
    let menorDistancia = Infinity;

    ctos.forEach((cto: any) => {
      if (cto.lat !== undefined && cto.lon !== undefined) {
        const dLat = Math.abs(cto.lat - (lead.lat || 0));
        const dLon = Math.abs(cto.lon - (lead.lon || 0));
        const dist = dLat * dLat + dLon * dLon;
        if (dist < menorDistancia) {
          menorDistancia = dist;
          ctoMaisProxima = cto;
        }
      }
    });

    if (!ctoMaisProxima || ctoMaisProxima.lat === undefined || ctoMaisProxima.lon === undefined) {
      setDistanciaRotaAtiva('Nenhuma CTO válida encontrada.');
      setCalculandoRota(false);
      return;
    }

    setCtoVinculadaNome(ctoMaisProxima.identificacao || 'CTO Principal');

    try {
      const coordenadasTracatadas: [number, number][] = [
        [ctoMaisProxima.lat, ctoMaisProxima.lon],
        [lead.lat, lead.lon]
      ];

      setRotaAtivaCoords(coordenadasTracatadas);

      const R = 6371e3; 
      const rad = Math.PI / 180;
      const lat1 = ctoMaisProxima.lat * rad;
      const lat2 = lead.lat * rad;
      const dLat = (lead.lat - ctoMaisProxima.lat) * rad;
      const dLon = (lead.lon - ctoMaisProxima.lon) * rad;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanciaMetros = R * c;

      const textoFormatado = distanciaMetros > 1000 
        ? `${(distanciaMetros / 1000).toFixed(2)} km (linha reta)` 
        : `${Math.round(distanciaMetros)} metros (linha reta)`;

      setDistanciaRotaAtiva(textoFormatado);
    } catch (err) {
      console.error("Erro ao calcular linha reta:", err);
      setDistanciaRotaAtiva('Erro ao calcular distância.');
    } finally {
      setCalculandoRota(false);
    }
  };

  const handleSolicitarMudancaEtapa = async (id: string, etapa: LeadReal['etapa_funil']) => {
    if (etapa === 'MANDAR PARA INSTALAÇÃO' || etapa === 'NAO CONVERTIDO') {
      setLeadSelecionado(id);
      setNovaEtapaPendente(etapa);
      setModalAberto(true);
    } else {
      await limparOperacional(id);
      await atualizarEtapaLead(id, etapa);
      await carregarLeadsSupabase();
    }
  };

  const confirmarMudanca = async () => {
    if (leadSelecionado && novaEtapaPendente) {
      await limparOperacional(leadSelecionado);
      await atualizarEtapaLead(leadSelecionado, novaEtapaPendente);
      await carregarLeadsSupabase();
    }
    fecharModal();
  };

  const fecharModal = () => {
    setModalAberto(false);
    setLeadSelecionado(null);
    setNovaEtapaPendente(null);
  };

  const handleLimparTudo = () => {
    if (window.confirm("Tem certeza que deseja apagar TODOS os leads e testes cadastrados? Esta ação não pode ser desfeita.")) {
      limparTudo();
    }
  };

  const planoVindoDaAuth = empresa?.plano || operador?.empresa?.plano || planoAtual || 'essencial';
  const chavePlanoLimpa = String(planoVindoDaAuth).toLowerCase().trim();
  const configPlanoAtual = PLANOS[chavePlanoLimpa] || PLANOS['essencial'];

  const nomeExibicaoPlano = configPlanoAtual?.nome || 'Essencial';
  const limiteBase = configPlanoAtual?.leads_base || 80;
  const limiteExtra = configPlanoAtual?.leads_bonus || 30;
  const limiteTotal = configPlanoAtual?.max_leads || 110;
  const precoExcedenteUnitario = configPlanoAtual?.preco_excedente ?? 1.50;

  const leadsUsados = leadsInvertidos.length;
  
  const leadsBaseUsados = Math.min(leadsUsados, limiteBase);
  const leadsBonusUsados = Math.max(0, Math.min(leadsUsados - limiteBase, limiteExtra));
  const leadsExcedentesUsados = Math.max(0, leadsUsados - limiteTotal);

  const escalaVisualMaxima = Math.max(limiteTotal, leadsUsados);

  const percentualVerde = escalaVisualMaxima > 0 ? (leadsBaseUsados / escalaVisualMaxima) * 100 : 0;
  const percentualAzul = escalaVisualMaxima > 0 ? (leadsBonusUsados / escalaVisualMaxima) * 100 : 0;
  const percentualAmarelo = escalaVisualMaxima > 0 ? (leadsExcedentesUsados / escalaVisualMaxima) * 100 : 0;
  
  const ultrapassouFranquia = leadsUsados > limiteTotal;
  const quantidadeExcedente = leadsExcedentesUsados;
  const custoEstimadoExcedente = (quantidadeExcedente * precoExcedenteUnitario).toFixed(2);

  const leadsAtivos = leadsInvertidos.filter(lead => {
    const visivel = isLeadVisivel(lead);
    const matchTab = filtroTab === 'TODOS' || lead.status === filtroTab;
    
    const nomeLead = (lead.nome || '').toLowerCase();
    const buscaTexto = (busca || '').toLowerCase();
    const cepLead = (lead.cep || '');
    const telefoneLead = (lead.telefone || '');

    const matchBusca = nomeLead.includes(buscaTexto) ||
                       cepLead.includes(buscaTexto) ||
                       telefoneLead.includes(buscaTexto);

    return visivel && matchTab && matchBusca;
  });

  const totalComCobertura = leadsInvertidos.filter(l => isLeadVisivel(l) && l.status === 'COM COBERTURA').length;
  const totalSemCobertura = leadsInvertidos.filter(l => isLeadVisivel(l) && l.status === 'SEM COBERTURA').length;

  const centroMapa = ctos.length > 0 && ctos[0].lat && ctos[0].lon 
    ? [ctos[0].lat, ctos[0].lon] as [number, number] 
    : [-15.7641, -48.2743] as [number, number];

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans w-full relative">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" /> Histórico de Consultas & Leads
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Gerenciamento de consultas de viabilidade, funil e geolocalização de clientes.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFiltroTab('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                filtroTab === 'TODOS' ? 'bg-emerald-500 text-black border-emerald-500 shadow' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              Todos ({leadsInvertidos.filter(isLeadVisivel).length})
            </button>
            <button 
              onClick={() => setFiltroTab('COM COBERTURA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                filtroTab === 'COM COBERTURA' ? 'bg-emerald-500 text-black border-emerald-500 shadow' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              Com Cobertura ({totalComCobertura})
            </button>
            <button 
              onClick={() => setFiltroTab('SEM COBERTURA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                filtroTab === 'SEM COBERTURA' ? 'bg-emerald-500 text-black border-emerald-500 shadow' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              Sem Cobertura ({totalSemCobertura})
            </button>
          </div>

          <button
            onClick={handleLimparTudo}
            className="px-3.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          >
            <Trash2 className="w-3.5 h-3.5" /> Limpar Testes
          </button>
        </div>
      </div>

      <Card className={`border backdrop-blur transition-all ${ultrapassouFranquia ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-900 bg-zinc-900/40'}`}>
        <CardContent className="p-6 space-y-3">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400">
              Franquia de Leads (Plano {nomeExibicaoPlano})
            </span>
            
            <span className="text-xs font-mono font-bold text-white">
              {leadsUsados} / <span className="text-emerald-500">{limiteBase}</span> <span className="text-cyan-400">(+{limiteExtra} extras)</span>
              {ultrapassouFranquia && (
                <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px]">
                  +{quantidadeExcedente} excedente(s) (R$ {custoEstimadoExcedente})
                </span>
              )}
            </span>
          </div>

          <div className="relative w-full h-2.5 bg-black border border-zinc-800 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              style={{ width: `${percentualVerde}%` }}
            />
            <div 
              className="h-full bg-cyan-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${percentualAzul}%` }}
            />
            {ultrapassouFranquia && (
              <div 
                className="h-full bg-amber-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse"
                style={{ width: `${percentualAmarelo}%` }}
              />
            )}
          </div>

          {ultrapassouFranquia ? (
            <div className="flex items-center justify-start pt-1 text-amber-400 text-[11px] font-mono uppercase font-bold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Franquia excedida! Suas consultas continuam livres (Cobrança por uso: R$ {precoExcedenteUnitario.toFixed(2)} / lead extra).
              </span>
            </div>
          ) : (
            <p className="text-zinc-500 text-[11px] font-mono uppercase">
              Operação fluindo normalmente dentro do pacote contratado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2 shrink-0">
            <Globe className="w-4 h-4 text-emerald-400" /> Mapa de Calor & Cobertura de Leads
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-zinc-400 uppercase font-bold">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#3b82f6] border border-black rounded-[2px]"></div> Caixa CTO
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#10b981] border border-black rounded-[2px]"></div> Com Cobertura
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#ef4444] border border-black rounded-[2px]"></div> Sem Cobertura
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-[#f59e0b] border border-black rounded-[2px]"></div> Problema / Pendente
            </div>
            <span className="text-zinc-500 ml-1 pl-3 border-l border-zinc-800">Zoom: {zoomAtual}</span>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="relative w-full h-[450px] bg-[#09090b] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)] z-0 flex">
            
            <div className="w-full h-full relative">
              {mapaPronto && (
                <MapWithNoSSR 
                  centroMapa={centroMapa}
                  ctosAgrupadas={ctosAgrupadasParaExibir}
                  leadsVisiveisNoViewport={leadsVisiveisNoViewport}
                  iconeCto={iconeCto}
                  criarIconeClusterLead={criarIconeClusterLead}
                  iconeVerde={iconeVerde}
                  iconeVermelho={iconeVermelho}
                  iconeCiano={iconeCiano}
                  iconeAmarelo={iconeAmarelo}
                  selecionarLeadParaPainel={selecionarLeadParaPainel}
                  rotaAtivaCoords={rotaAtivaCoords}
                  setZoomAtual={setZoomAtual}
                  setMapBounds={setMapBounds}
                />
              )}
            </div>

            {leadAtivoPainel && (() => {
              const perfilPainel = String(leadAtivoPainel.perfil || '').toUpperCase();
              const eNaoFeitaPainel = perfilPainel === 'NÃO FEITA';

              return (
                <div className={`absolute top-4 right-4 z-[1000] w-80 bg-zinc-900/95 border rounded-2xl p-5 backdrop-blur-md shadow-2xl space-y-4 font-mono text-zinc-50 animate-fadeIn ${
                  eNaoFeitaPainel ? 'border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.25)]' : 'border-emerald-500/40'
                }`}>
                  <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${eNaoFeitaPainel ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {eNaoFeitaPainel ? '⚠️ Instalação Não Realizada' : 'Lead Selecionado'}
                      </span>
                      <h3 className="text-sm font-bold text-white font-sans mt-0.5">{leadAtivoPainel.nome}</h3>
                    </div>
                    <button onClick={limparRota} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-zinc-300">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{leadAtivoPainel.endereco || 'Endereço não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{leadAtivoPainel.telefone || 'Sem telefone'}</span>
                    </div>

                    {/* Exibe o motivo no popup do mapa quando for não feita */}
                    {eNaoFeitaPainel && leadAtivoPainel.motivo_pendencia && (
                      <div className="mt-3 bg-amber-500/10 border border-amber-500/40 p-2.5 rounded-xl text-amber-300 space-y-1">
                        <div className="font-bold uppercase text-[10px] text-amber-400">Motivo do Técnico:</div>
                        <div className="text-xs normal-case">{leadAtivoPainel.motivo_pendencia}</div>
                      </div>
                    )}
                  </div>

                  {/* 🚀 Oculta o botão de calcular distância se o lead estiver marcado como NÃO FEITA */}
                  {!eNaoFeitaPainel && (
                    <div className="border-t border-zinc-800 pt-3 space-y-3">
                      {!distanciaRotaAtiva && !calculandoRota && (
                        <button
                          type="button"
                          onClick={() => calcularRotaDoLead(leadAtivoPainel)}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          <Navigation className="w-4 h-4" /> Calcular Distância (Linha Reta)
                        </button>
                      )}

                      {calculandoRota && (
                        <div className="flex items-center justify-center gap-2 py-2.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <Loader2 className="w-4 h-4 animate-spin" /> Calculando...
                        </div>
                      )}

                      {distanciaRotaAtiva && (
                        <div className="space-y-2.5 bg-black/50 p-3 rounded-xl border border-zinc-800 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">CTO Mais Próxima:</span>
                            <span className="text-blue-400 font-bold">{ctoVinculadaNome}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400">Distância:</span>
                            <span className="text-emerald-400 font-bold">{distanciaRotaAtiva}</span>
                          </div>
                          <button type="button" onClick={limparRota} className="w-full mt-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer">
                            Ocultar Linha
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })()}

          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3 backdrop-blur">
        <Search className="w-4 h-4 text-zinc-500 ml-2" />
        <input 
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome do cliente, CEP ou telefone..."
          className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
        />
      </div>

      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur relative overflow-hidden">
        
        <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" /> Registros de Viabilidade & Funil
          </CardTitle>
          <span className="text-[11px] font-mono text-zinc-500">Exibindo {leadsAtivos.length} registro(s) ativos</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4">Cliente / Contato</th>
                  <th className="p-4">Localização (CEP & Endereço)</th>
                  <th className="p-4 whitespace-nowrap">Status Operacional</th>
                  <th className="p-4">CTO Atendimento</th>
                  <th className="p-4">Etapa do Funil</th>
                  <th className="p-4 text-right">Ação WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {leadsAtivos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-500">
                      Nenhum lead pendente. Faça uma consulta na aba <strong className="text-emerald-400">Viabilidade</strong> para gerar novos registros.
                    </td>
                  </tr>
                ) : (
                  leadsAtivos.map((lead) => {
                    const numeroLimpo = lead.telefone ? lead.telefone.replace(/\D/g, '') : '';
                    const mensagem = encodeURIComponent(`Olá ${lead.nome}, vi sua consulta de viabilidade para o CEP ${lead.cep}. Como podemos ajudar?`);
                    const linkWhatsapp = numeroLimpo ? `https://wa.me/55${numeroLimpo}?text=${mensagem}` : '#';
                    const etapaAtual = lead.etapa_funil || lead.perfil || 'NOVO';
                    
                    const perfilLead = String(lead.perfil || '').toUpperCase();
                    const eNaoFeita = perfilLead === 'NÃO FEITA';

                    return (
                      <tr key={lead.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4 text-zinc-400 flex items-center gap-1.5 pt-5">
                          <Clock className="w-3.5 h-3.5 text-zinc-600" /> {lead.data}
                        </td>
                        <td className="p-4">
                          <div className="font-bold font-sans text-sm text-white">{lead.nome}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-600" /> {lead.telefone || 'Sem telefone'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white">{lead.cep}</div>
                          <div className="text-[11px] text-zinc-500">{lead.endereco}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-lg text-[10px] uppercase font-bold border ${
                            eNaoFeita
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse'
                              : etapaAtual === 'MANDAR PARA INSTALAÇÃO'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : lead.status === 'COM COBERTURA' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            {
                              eNaoFeita ? '⚠️ INSTALAÇÃO NÃO FEITA' :
                              etapaAtual === 'MANDAR PARA INSTALAÇÃO' ? '🔵 Aguardando Instalação' :
                              lead.status === 'COM COBERTURA' ? 'COM COBERTURA' : 'SEM COBERTURA'
                            }
                          </span>
                        </td>
                        <td className={`p-4 font-bold ${lead.status === 'COM COBERTURA' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {lead.cto && lead.cto !== 'Sem CTO' ? lead.cto : 'Sem CTO Vinculada'}
                        </td>
                        <td className="p-4">
                          <select 
                            value={eNaoFeita ? 'NÃO FEITA' : etapaAtual}
                            onChange={(e) => {
                              handleSolicitarMudancaEtapa(lead.id, e.target.value as LeadReal['etapa_funil']);
                            }}
                            className={`bg-black/60 border ${eNaoFeita ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-emerald-400'} rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase font-bold focus:outline-none focus:border-emerald-500 cursor-pointer`}
                          >
                            {eNaoFeita && <option value="NÃO FEITA">⚠️ Instalação Não Feita</option>}
                            <option value="NOVO">NOVO</option>
                            <option value="EM CONTATO">EM CONTATO</option>
                            <option value="AGENDADO">AGENDADO</option>
                            <option value="MANDAR PARA INSTALAÇÃO">MANDAR PARA INSTALAÇÃO</option>
                            <option value="NAO CONVERTIDO">NAO CONVERTIDO</option>
                          </select>
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <a 
                            href={linkWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-mono font-bold uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Mandar Mensagem
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button onClick={fecharModal} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold font-mono text-white uppercase tracking-tight">
                Confirmação de Alteração
              </h3>
              <p className="text-zinc-400 text-xs font-mono leading-relaxed">
                Tem certeza que quer mudar o status para <strong className="text-emerald-400 uppercase">{novaEtapaPendente === 'MANDAR PARA INSTALAÇÃO' ? 'Mandar para Instalação' : 'Não Convertido'}</strong>? O lead será atualizado na central.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={fecharModal} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-xs font-mono transition-all cursor-pointer">
                Não
              </button>
              <button onClick={confirmarMudanca} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer">
                Sim, tenho certeza
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}