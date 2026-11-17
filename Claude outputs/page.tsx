// ================================================================================
// MAPA DE CLIENTES - V5 FIBRA
// app/dashboard/clientes/mapa/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  Map,
  Users,
  Search,
  X,
  MapPin,
  Loader2,
  RefreshCw,
  Eye,
  Filter,
  Wifi,
  CheckCircle,
  Ban,
  AlertTriangle,
  ChevronDown,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Leaflet components carregados dinamicamente (sem SSR)
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(m => m.useMap), { ssr: false }) as any;

// Componente para corrigir redimensionamento do mapa
function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map && typeof map.invalidateSize === 'function') {
        map.invalidateSize();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Componente para centralizar mapa programaticamente
function MapCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  return null;
}

type ClienteMapa = {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  cidade: string;
  status: string;
  latitude: number;
  longitude: number;
  login_pppoe: string;
  plano_nome: string;
};

export default function MapaClientesPage() {
  const { empresa } = useAuth();
  const settings = useSettings();

  const [clientes, setClientes] = useState<ClienteMapa[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteMapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [leafletReady, setLeafletReady] = useState(false);
  const [icones, setIcones] = useState<any>({});
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteMapa | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.8193, -48.1133]);
  const [mapZoom, setMapZoom] = useState(13);

  // Contadores
  const totalNoMapa = clientesFiltrados.length;
  const totalSemLocal = clientes.filter(c => !c.latitude || !c.longitude).length;

  // Centro da empresa (settings)
  const latEmpresa = settings?.latEmpresa ?? -15.8193;
  const lonEmpresa = settings?.lonEmpresa ?? -48.1133;

  // Inicializar Leaflet e icones
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // CSS do Leaflet
    if (!document.getElementById('leaflet-css-mapa')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-mapa';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Dark mode do mapa
    if (!document.getElementById('leaflet-dark-mapa')) {
      const style = document.createElement('style');
      style.id = 'leaflet-dark-mapa';
      style.innerHTML = `
        .leaflet-tile-pane {
          filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(95%) !important;
        }
        .leaflet-container {
          background: #09090b !important;
        }
        .leaflet-popup-content-wrapper {
          background: #141419 !important;
          color: #fff !important;
          border: 1px solid #22c55e33 !important;
          border-radius: 12px !important;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15) !important;
        }
        .leaflet-popup-tip {
          background: #141419 !important;
          border: 1px solid #22c55e33 !important;
        }
        .leaflet-popup-close-button {
          color: #71717a !important;
        }
        .leaflet-popup-close-button:hover {
          color: #fff !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Icones personalizados
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const criarIcone = (cor: string, borda: string) => {
        return L.divIcon({
          className: 'custom-marker-icon',
          html: `<div style="
            width: 14px;
            height: 14px;
            background-color: ${cor};
            border: 2px solid ${borda};
            border-radius: 50%;
            box-shadow: 0 0 10px ${cor}80, 0 0 20px ${cor}40;
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -10],
        });
      };

      setIcones({
        ativo: criarIcone('#10b981', '#ffffff'),
        bloqueado: criarIcone('#ef4444', '#ffffff'),
        inadimplente: criarIcone('#f59e0b', '#ffffff'),
        cancelado: criarIcone('#6b7280', '#ffffff'),
        empresa: L.divIcon({
          className: 'custom-empresa-icon',
          html: `<div style="
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            border: 3px solid #ffffff;
            border-radius: 4px;
            box-shadow: 0 0 15px #3b82f6, 0 0 30px #3b82f680;
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          popupAnchor: [0, -12],
        }),
      });

      setLeafletReady(true);
    });
  }, []);

  // Carregar clientes com coordenadas
  const carregarClientes = useCallback(async () => {
    if (!supabase || !empresa?.id) return;
    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cpf_cnpj, telefone, cidade, status, latitude, longitude, login_pppoe, plano_nome')
        .eq('empresa_id', empresa.id)
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        return;
      }

      setClientes(data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setCarregando(false);
    }
  }, [empresa?.id]);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  // Centro do mapa baseado na empresa
  useEffect(() => {
    if (latEmpresa && lonEmpresa) {
      setMapCenter([latEmpresa, lonEmpresa]);
    }
  }, [latEmpresa, lonEmpresa]);

  // Filtrar clientes
  useEffect(() => {
    let filtrados = clientes.filter(c => c.latitude && c.longitude);

    if (filtroStatus !== 'todos') {
      filtrados = filtrados.filter(c => c.status === filtroStatus);
    }

    if (busca.trim()) {
      const termo = busca.toLowerCase().trim();
      filtrados = filtrados.filter(c =>
        (c.nome || '').toLowerCase().includes(termo) ||
        (c.cpf_cnpj || '').includes(termo) ||
        (c.login_pppoe || '').toLowerCase().includes(termo) ||
        (c.cidade || '').toLowerCase().includes(termo)
      );
    }

    setClientesFiltrados(filtrados);
  }, [clientes, filtroStatus, busca]);

  const getIconePorStatus = (status: string) => {
    if (!icones) return undefined;
    switch ((status || '').toLowerCase()) {
      case 'bloqueado': return icones.bloqueado;
      case 'inadimplente': return icones.inadimplente;
      case 'cancelado': return icones.cancelado;
      default: return icones.ativo;
    }
  };

  const getCorStatus = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'bloqueado': return 'text-red-400';
      case 'inadimplente': return 'text-yellow-400';
      case 'cancelado': return 'text-zinc-400';
      default: return 'text-emerald-400';
    }
  };

  const getBgStatus = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'bloqueado': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'inadimplente': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'cancelado': return 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';
      default: return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    }
  };

  const focalizarCliente = (cliente: ClienteMapa) => {
    setClienteSelecionado(cliente);
    setMapCenter([cliente.latitude, cliente.longitude]);
    setMapZoom(18);
  };

  return (
    <div className="p-6 space-y-4 bg-[#0a0a0a] min-h-screen text-zinc-50 font-mono">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Map className="w-6 h-6 text-blue-400" /> Mapa de Clientes
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Visualize a localização de todos os clientes no mapa.</p>
        </div>

        <button
          onClick={carregarClientes}
          disabled={carregando}
          className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-bold uppercase flex items-center gap-2 cursor-pointer border border-zinc-700 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase text-zinc-500">Total Clientes</span>
          <p className="text-xl font-black text-white">{clientes.length}</p>
        </div>
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase text-emerald-400">No Mapa</span>
          <p className="text-xl font-black text-emerald-400">{totalNoMapa}</p>
        </div>
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase text-yellow-400">Sem Localização</span>
          <p className="text-xl font-black text-yellow-400">{totalSemLocal}</p>
        </div>
        <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[10px] uppercase text-red-400">Bloqueados</span>
          <p className="text-xl font-black text-red-400">
            {clientesFiltrados.filter(c => c.status === 'bloqueado').length}
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar cliente por nome, CPF, login PPPoE..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtro de status */}
        <div className="flex gap-2">
          {[
            { valor: 'todos', label: 'Todos', cor: 'text-white' },
            { valor: 'ativo', label: 'Ativos', cor: 'text-emerald-400' },
            { valor: 'bloqueado', label: 'Bloqueados', cor: 'text-red-400' },
            { valor: 'inadimplente', label: 'Inadimplentes', cor: 'text-yellow-400' },
          ].map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltroStatus(f.valor)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                filtroStatus === f.valor
                  ? 'bg-zinc-700 border-zinc-600 text-white'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              <span className={f.cor}>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAPA + LISTA LATERAL */}
      <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>

        {/* MAPA */}
        <div className="flex-1 relative bg-[#09090b] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.08)]">
          {carregando && (
            <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          )}

          {leafletReady && (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ width: '100%', height: '100%', background: '#09090b' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapResizeFix />
              <MapCenter center={mapCenter} zoom={mapZoom} />

              {/* Marker da Empresa */}
              {icones.empresa && latEmpresa && lonEmpresa && (
                <Marker position={[latEmpresa, lonEmpresa]} icon={icones.empresa}>
                  <Popup>
                    <div className="text-xs font-mono space-y-1 min-w-[180px]">
                      <div className="font-black text-blue-400 uppercase text-[11px]">
                        📍 {settings?.nomeProvedor || 'Sua Empresa'}
                      </div>
                      <div className="text-zinc-400 text-[10px]">Sede / Loja principal</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Markers dos Clientes */}
              {clientesFiltrados.map((cliente) => {
                const icone = getIconePorStatus(cliente.status);
                if (!icone) return null;

                return (
                  <Marker
                    key={cliente.id}
                    position={[cliente.latitude, cliente.longitude]}
                    icon={icone}
                  >
                    <Popup>
                      <div className="text-xs font-mono space-y-1.5 min-w-[200px]">
                        <div className="font-black text-white text-[11px] uppercase truncate">
                          {cliente.nome}
                        </div>
                        {cliente.cpf_cnpj && (
                          <div className="text-zinc-400 text-[10px]">CPF: {cliente.cpf_cnpj}</div>
                        )}
                        {cliente.login_pppoe && (
                          <div className="text-zinc-400 text-[10px] flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-emerald-400" /> {cliente.login_pppoe}
                          </div>
                        )}
                        {cliente.plano_nome && (
                          <div className="text-zinc-400 text-[10px]">Plano: {cliente.plano_nome}</div>
                        )}
                        {cliente.cidade && (
                          <div className="text-zinc-400 text-[10px]">{cliente.cidade}</div>
                        )}
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border ${getBgStatus(cliente.status)}`}>
                          {cliente.status === 'ativo' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {cliente.status || 'ativo'}
                        </div>
                        <div className="pt-1 border-t border-zinc-700">
                          <a
                            href={`/dashboard/clientes/${cliente.id}`}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase"
                          >
                            Abrir Cadastro →
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}

          {/* Legenda no canto do mapa */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur border border-zinc-800 rounded-xl p-3 space-y-1.5">
            <span className="text-[9px] font-bold uppercase text-zinc-400 block">Legenda</span>
            <div className="flex items-center gap-2 text-[10px] text-zinc-300">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white inline-block shadow-[0_0_6px_#10b981]"></span> Ativo
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-300">
              <span className="w-3 h-3 rounded-full bg-red-500 border border-white inline-block shadow-[0_0_6px_#ef4444]"></span> Bloqueado
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-300">
              <span className="w-3 h-3 rounded-full bg-yellow-500 border border-white inline-block shadow-[0_0_6px_#f59e0b]"></span> Inadimplente
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-300">
              <span className="w-3 h-3 rounded-sm bg-blue-500 border-2 border-white inline-block shadow-[0_0_6px_#3b82f6]"></span> Sua Empresa
            </div>
          </div>
        </div>

        {/* LISTA LATERAL */}
        <div className="w-full lg:w-80 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-zinc-400">
              {totalNoMapa} cliente{totalNoMapa !== 1 ? 's' : ''} no mapa
            </span>
            {totalSemLocal > 0 && (
              <span className="text-[9px] text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {totalSemLocal} sem GPS
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                Nenhum cliente com localização encontrado.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => focalizarCliente(cliente)}
                    className={`w-full text-left p-3 hover:bg-zinc-800/50 transition-all cursor-pointer ${
                      clienteSelecionado?.id === cliente.id ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate uppercase">{cliente.nome}</p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {cliente.login_pppoe || cliente.cpf_cnpj || cliente.cidade || '—'}
                        </p>
                      </div>
                      <span className={`shrink-0 w-2 h-2 rounded-full ${
                        cliente.status === 'bloqueado' ? 'bg-red-500' :
                        cliente.status === 'inadimplente' ? 'bg-yellow-500' :
                        'bg-emerald-500'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
