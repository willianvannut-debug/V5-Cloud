"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Search, Phone, Clock, Filter, MessageSquare, AlertTriangle, X, Trash2, Globe, Navigation, Loader2, MapPin, Lock, Rocket
} from 'lucide-react';
import { useApp, LeadReal } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { PLANOS } from '@/lib/planLimites';
import { createClient } from '@supabase/supabase-js';

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

    const { MapContainer, TileLayer, Marker, Popup, Polyline } = await import('react-leaflet');
    
    return function MapComponent({ centroMapa, ctos, leadsInvertidos, iconeCto, iconeVerde, iconeVermelho, iconeCiano, iconeAmarelo, selecionarLeadParaPainel, rotaAtivaCoords }: any) {
      return (
        <MapContainer 
          center={centroMapa} 
          zoom={14} 
          style={{ width: '100%', height: '100%', background: '#09090b' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Caixas CTO */}
          {ctos.map((cto: any) => {
            if (cto.lat !== undefined && cto.lon !== undefined && iconeCto) {
              return (
                <Marker key={`cto-${cto.id}`} position={[cto.lat, cto.lon]} icon={iconeCto}>
                  <Popup>
                    <div className="font-mono text-xs text-zinc-900 p-1 space-y-1">
                      <strong className="text-blue-600 block font-black text-sm uppercase">Infra: {cto.identificacao}</strong>
                      <span className="font-sans text-zinc-700 block">{cto.endereco || "Caixa Óptica"}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}

          {/* Leads ativos */}
          {leadsInvertidos.filter((l: any) => l.status_instalacao !== 'CONCLUIDA' && l.etapa_funil !== 'NAO CONVERTIDO').map((lead: any) => {
            if (lead.lat && lead.lon) {
              let iconeAtual = lead.status === 'COM COBERTURA' ? iconeVerde : iconeVermelho;
              
              if (lead.etapa_funil === 'CONVERTIDO') {
                iconeAtual = iconeCiano; 
              } else if (lead.status_instalacao === 'PENDENTE') {
                iconeAtual = iconeAmarelo;
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

          {/* Linha da Rota */}
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
  const { leads, atualizarEtapaLead, limparTudo } = useApp();
  const settings = useSettings();
  const { operador, empresa } = useAuth();
  const ctos = settings?.ctos || [];
  
  // 🚀 PLANO DIRETO DA SESSÃO / SUPABASE: Pega com segurança o plano da empresa logada
  const [planoAtual, setPlanoAtual] = useState<string>('');

  useEffect(() => {
    async function sincronizarPlanoReal() {
      // Se o contexto já tiver o plano da empresa, usa ele direto sem precisar de nova query cega!
      const planoDoContexto = empresa?.plano || operador?.empresa?.plano;
      if (planoDoContexto) {
        setPlanoAtual(String(planoDoContexto).toLowerCase().trim());
        return;
      }

      if (!supabase) return;
      try {
        const idDaEmpresa = operador?.empresaId || operador?.empresa_id;
        if (!idDaEmpresa) {
          setPlanoAtual('ERRO');
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
          setPlanoAtual('ERRO');
        }
      } catch (err) {
        console.error("Erro ao buscar plano nos leads:", err);
        setPlanoAtual('ERRO');
      }
    }
    sincronizarPlanoReal();
  }, [operador, empresa]);

  // 🚀 CRUZAMENTO COM PLANLIMITES: Pega os limites reais do dicionário
  const configPlanoAtual = PLANOS[planoAtual];
  const limiteLeadsMensal = configPlanoAtual ? configPlanoAtual.max_leads : "ERRO";

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
        
        const squareGreen = L.divIcon({
          className: 'neon-green',
          html: `<div style="width: 16px; height: 16px; background-color: #10b981; border: 2px solid #fff; box-shadow: 0 0 10px #10b981; border-radius: 3px; cursor: pointer;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const squareRed = L.divIcon({
          className: 'neon-red',
          html: `<div style="width: 16px; height: 16px; background-color: #ef4444; border: 2px solid #fff; box-shadow: 0 0 10px #ef4444; border-radius: 3px; cursor: pointer;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const squareYellow = L.divIcon({
          className: 'neon-yellow',
          html: `<div style="width: 16px; height: 16px; background-color: #f59e0b; border: 2px solid #fff; box-shadow: 0 0 10px #f59e0b; border-radius: 3px; cursor: pointer;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const squareCyan = L.divIcon({
          className: 'neon-cyan',
          html: `<div style="width: 16px; height: 16px; background-color: #06b6d4; border: 2px solid #fff; box-shadow: 0 0 10px #06b6d4; border-radius: 3px; cursor: pointer;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const squareCto = L.divIcon({
          className: 'neon-blue',
          html: `<div style="width: 18px; height: 18px; background-color: #3b82f6; border: 2px solid #000; box-shadow: 0 0 12px #3b82f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">T</div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        setIconeVerde(squareGreen);
        setIconeVermelho(squareRed);
        setIconeAmarelo(squareYellow);
        setIconeCiano(squareCyan);
        setIconeCto(squareCto);
        setMapaPronto(true);
      });
    }
  }, []);

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

    ctos.forEach((cto) => {
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
      const url = `https://router.project-osrm.org/route/v1/driving/${ctoMaisProxima.lon},${ctoMaisProxima.lat};${lead.lon},${lead.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanciaMetros = route.distance;
        const coordenadasTracatadas: [number, number][] = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);

        setRotaAtivaCoords(coordenadasTracatadas);

        const textoFormatado = distanciaMetros > 1000 
          ? `${(distanciaMetros / 1000).toFixed(2)} km` 
          : `${Math.round(distanciaMetros)} metros`;

        setDistanciaRotaAtiva(textoFormatado);
      } else {
        setDistanciaRotaAtiva('Não foi possível traçar rota.');
      }
    } catch (err) {
      console.error("Erro ao calcular rota OSRM:", err);
      setDistanciaRotaAtiva('Erro ao calcular rota.');
    } finally {
      setCalculandoRota(false);
    }
  };

  const handleSolicitarMudancaEtapa = (id: string, etapa: LeadReal['etapa_funil']) => {
    if (etapa === 'CONVERTIDO' || etapa === 'NAO CONVERTIDO') {
      setLeadSelecionado(id);
      setNovaEtapaPendente(etapa);
      setModalAberto(true);
    } else {
      atualizarEtapaLead(id, etapa);
    }
  };

  const confirmarMudanca = () => {
    if (leadSelecionado && novaEtapaPendente) {
      atualizarEtapaLead(leadSelecionado, novaEtapaPendente);
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

  const leadsInvertidos = [...(leads || [])].reverse();

  const totalLeadsCadastrados = leadsInvertidos.length;
  const bateuLimiteLeads = typeof limiteLeadsMensal === 'number' ? totalLeadsCadastrados >= limiteLeadsMensal : false;
  const porcentagemUsoLeads = typeof limiteLeadsMensal === 'number' && limiteLeadsMensal > 0 ? Math.min((totalLeadsCadastrados / limiteLeadsMensal) * 100, 100) : 0;

  const leadsAtivos = leadsInvertidos.filter(lead => {
    const naoConcluidoPeloTecnico = lead.status_instalacao !== 'CONCLUIDA';
    const naoCancelado = lead.etapa_funil !== 'NAO CONVERTIDO';
    const matchTab = filtroTab === 'TODOS' || lead.status === filtroTab;
    
    const nomeLead = (lead.nome || '').toLowerCase();
    const buscaTexto = (busca || '').toLowerCase();
    const cepLead = (lead.cep || '');
    const telefoneLead = (lead.telefone || '');

    const matchBusca = nomeLead.includes(buscaTexto) ||
                       cepLead.includes(buscaTexto) ||
                       telefoneLead.includes(buscaTexto);

    return naoConcluidoPeloTecnico && naoCancelado && matchTab && matchBusca;
  });

  const totalComCobertura = leadsInvertidos.filter(l => l.status_instalacao !== 'CONCLUIDA' && l.etapa_funil !== 'NAO CONVERTIDO' && l.status === 'COM COBERTURA').length;
  const totalSemCobertura = leadsInvertidos.filter(l => l.status_instalacao !== 'CONCLUIDA' && l.etapa_funil !== 'NAO CONVERTIDO' && l.status === 'SEM COBERTURA').length;

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
              Todos ({leadsInvertidos.filter(l => l.status_instalacao !== 'CONCLUIDA' && l.etapa_funil !== 'NAO CONVERTIDO').length})
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

      {/* CARD DE CONSUMO DE LEADS DO PLANO DINÂMICO */}
      <Card className={`border backdrop-blur transition-all ${bateuLimiteLeads ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-900 bg-zinc-900/40'}`}>
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-zinc-300 font-mono uppercase tracking-widest text-xs flex items-center gap-2">
               Franquia de Leads (Plano {planoAtual ? planoAtual.toUpperCase() : 'CARREGANDO...'})
            </span>
            <span className={bateuLimiteLeads ? "text-red-400 font-mono" : "text-emerald-400 font-mono"}>
              {totalLeadsCadastrados} / {limiteLeadsMensal} Leads Registrados
            </span>
          </div>
          
          <div className="w-full bg-black rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${bateuLimiteLeads ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} 
              style={{ width: `${porcentagemUsoLeads}%` }}
            ></div>
          </div>
          {bateuLimiteLeads && (
            <p className="text-red-400 text-[11px] font-mono uppercase font-bold pt-1">
              ⚠️ O limite de leads do seu plano foi atingido. Novas consultas de viabilidade estão bloqueadas até um upgrade.
            </p>
          )}
        </CardContent>
      </Card>

      {/* MAPA GERAL DE LEADS */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" /> Mapa de Calor & Cobertura de Leads (Dark Mode)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="relative w-full h-[450px] bg-[#09090b] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)] z-0 flex">
            
            <div className="w-full h-full relative">
              {mapaPronto && (
                <MapWithNoSSR 
                  centroMapa={centroMapa}
                  ctos={ctos}
                  leadsInvertidos={leadsInvertidos}
                  iconeCto={iconeCto}
                  iconeVerde={iconeVerde}
                  iconeVermelho={iconeVermelho}
                  iconeCiano={iconeCiano}
                  iconeAmarelo={iconeAmarelo}
                  selecionarLeadParaPainel={selecionarLeadParaPainel}
                  rotaAtivaCoords={rotaAtivaCoords}
                />
              )}
            </div>

            {leadAtivoPainel && (
              <div className="absolute top-4 right-4 z-[1000] w-80 bg-zinc-900/95 border border-emerald-500/40 rounded-2xl p-5 backdrop-blur-md shadow-2xl space-y-4 font-mono text-zinc-50 animate-fadeIn">
                <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Lead Selecionado</span>
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
                </div>

                <div className="border-t border-zinc-800 pt-3 space-y-3">
                  {!distanciaRotaAtiva && !calculandoRota && (
                    <button
                      type="button"
                      onClick={() => calcularRotaDoLead(leadAtivoPainel)}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    >
                      <Navigation className="w-4 h-4" /> Calcular Rota por Ruas
                    </button>
                  )}

                  {calculandoRota && (
                    <div className="flex items-center justify-center gap-2 py-2.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <Loader2 className="w-4 h-4 animate-spin" /> Calculando rota nas ruas...
                    </div>
                  )}

                  {distanciaRotaAtiva && (
                    <div className="space-y-2.5 bg-black/50 p-3 rounded-xl border border-zinc-800 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">CTO Atendimento:</span>
                        <span className="text-blue-400 font-bold">{ctoVinculadaNome}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Distância Real:</span>
                        <span className="text-emerald-400 font-bold">{distanciaRotaAtiva}</span>
                      </div>
                      <button type="button" onClick={limparRota} className="w-full mt-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer">
                        Ocultar Rota
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* BUSCA */}
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

      {/* TABELA COM CAMADA DE BLOQUEIO */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur relative overflow-hidden">
        
        {bateuLimiteLeads && (
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Lock className="w-10 h-10 text-red-400 mb-3 animate-pulse" />
            <h3 className="text-white font-bold text-lg font-mono mb-1">Franquia de Leads Esgotada</h3>
            <p className="text-zinc-400 text-xs mb-5 max-w-md font-mono leading-relaxed">
              Você atingiu o limite de leads do seu plano atual ({limiteLeadsMensal} consultas). Faça um upgrade para liberar novas consultas e expandir sua base.
            </p>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 cursor-pointer">
              <Rocket className="w-4 h-4" /> Fazer Upgrade de Plano
            </button>
          </div>
        )}

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
                    const etapaAtual = lead.etapa_funil || 'NOVO';

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
                            etapaAtual === 'CONVERTIDO'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : lead.status === 'COM COBERTURA' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            {
                              etapaAtual === 'CONVERTIDO' ? '🔵 Aguardando Instalação' :
                              lead.status === 'COM COBERTURA' ? 'COM COBERTURA' : 'SEM COBERTURA'
                            }
                          </span>
                        </td>
                        <td className="p-4 font-bold text-emerald-400">
                          {lead.cto || 'CTO-01'}
                        </td>
                        <td className="p-4">
                          <select 
                            value={etapaAtual}
                            onChange={(e) => handleSolicitarMudancaEtapa(lead.id, e.target.value as LeadReal['etapa_funil'])}
                            className="bg-black/60 border border-zinc-800 text-emerald-400 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            <option value="NOVO">Novo Lead</option>
                            <option value="EM CONTATO">Em Contato</option>
                            <option value="AGENDADO">Agendado</option>
                            <option value="CONVERTIDO">Convertido</option>
                            <option value="NAO CONVERTIDO">Não Convertido</option>
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

      {/* MODAL DE CONFIRMAÇÃO */}
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
                Tem certeza que quer mudar o status para <strong className="text-emerald-400 uppercase">{novaEtapaPendente === 'CONVERTIDO' ? 'Convertido' : 'Não Convertido'}</strong>? O lead será enviado para a fila de instalação do técnico.
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