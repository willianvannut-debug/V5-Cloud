// ================================================================================
// 🗺️ VISÃO DE MAPA PARA O ROOT MASTER (SEDES DE TODAS AS EMPRESAS/PROVEDORES)
// components/RootEmpresasMapaView.tsx
//
// Renderizada dentro da aba normal "Mapa de Clientes"
// (app/dashboard/clientes/mapa/page.tsx) quando quem está logado é
// superadmin/root. Mostra no mapa a localização (lat/lon) da SEDE de cada
// empresa/provedor cadastrado no V5 Cloud — nunca os clientes finais de
// cada provedor.
// ================================================================================

"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

interface EmpresaMapa {
  id: string;
  nome_empresa: string;
  plano: string | null;
  status_assinatura: string | null;
  lat: number | null;
  lon: number | null;
  consumo?: { leads: number };
}

// Mapa com agrupamento geométrico em pixéis (mesmo padrão usado no Root Master)
const MapaEmpresasNoSSR = dynamic(
  async () => {
    if (typeof window !== 'undefined') {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-dark-mode-root-empresas-mapa')) {
        const style = document.createElement('style');
        style.id = 'leaflet-dark-mode-root-empresas-mapa';
        style.innerHTML = `
          .leaflet-tile-pane {
            filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(90%) grayscale(100%) !important;
          }
          .leaflet-container {
            background: #09090b !important;
          }
        `;
        document.head.appendChild(style);
      }
    }

    const { MapContainer, TileLayer, Marker, Popup, useMap } = await import('react-leaflet');

    function DynamicClusterLayer({ empresas }: { empresas: EmpresaMapa[] }) {
      const map = useMap();
      const [clusterizados, setClusterizados] = useState<any[]>([]);
      const L = require('leaflet');

      useEffect(() => {
        if (!map) return;

        const calcularClusters = () => {
          const raioPixel = 45;

          const pontosNoEcra = empresas.map(emp => {
            const pontoLatLng = L.latLng(emp.lat, emp.lon);
            const pontoPixel = map.latLngToLayerPoint(pontoLatLng);
            return { ...emp, pontoPixel };
          });

          const processados: any[] = [];
          const usados = new Set();

          pontosNoEcra.forEach((p1, i) => {
            if (usados.has(i)) return;
            const grupo = [p1];
            usados.add(i);

            pontosNoEcra.forEach((p2, j) => {
              if (usados.has(j)) return;
              const distanciaPx = p1.pontoPixel.distanceTo(p2.pontoPixel);
              if (distanciaPx <= raioPixel) {
                grupo.push(p2);
                usados.add(j);
              }
            });

            if (grupo.length === 1) {
              processados.push({ tipo: 'individual', ...grupo[0] });
            } else {
              let somaLat = 0;
              let somaLon = 0;
              grupo.forEach(g => { somaLat += g.lat!; somaLon += g.lon!; });
              processados.push({
                tipo: 'cluster',
                id: `cluster-${i}`,
                lat: somaLat / grupo.length,
                lon: somaLon / grupo.length,
                quantidade: grupo.length,
                itens: grupo,
              });
            }
          });

          setClusterizados(processados);
        };

        calcularClusters();
        map.on('moveend zoomend', calcularClusters);
        return () => { map.off('moveend zoomend', calcularClusters); };
      }, [map, empresas]);

      return (
        <>
          {clusterizados.map((item: any) => {
            if (item.tipo === 'cluster') {
              const iconeCluster = L.divIcon({
                className: 'cluster-marker-root-empresas',
                html: `<div style="background-color: #3b82f6; color: #fff; font-weight: 900; font-family: monospace; font-size: 12px; width: 34px; height: 34px; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(59,130,246,0.6);">${item.quantidade}</div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 17],
              });
              return (
                <Marker key={item.id} position={[item.lat, item.lon]} icon={iconeCluster}>
                  <Popup>
                    <div className="font-mono text-xs text-zinc-950 p-1 space-y-1.5">
                      <strong className="text-blue-600 block font-black text-sm uppercase">Região com {item.quantidade} Clientes</strong>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {item.itens.map((inst: any) => (
                          <div key={inst.id} className="border-b border-zinc-200 pb-1">
                            <span className="font-bold block text-zinc-900">{inst.nome_empresa || 'Anônima'}</span>
                            <span className="text-[10px] text-zinc-600">Plano: {inst.plano || 'Essencial'}</span>
                          </div>
                        ))}
                      </div>
                      <span className="font-sans text-zinc-500 block text-[10px] pt-1">Aproxime o zoom para separar os pins.</span>
                    </div>
                  </Popup>
                </Marker>
              );
            }

            const status = item.status_assinatura?.toLowerCase() || 'ativa';
            const corPin = status === 'inadimplente' ? '#ef4444' : status === 'cancelada' ? '#71717a' : '#10b981';
            const customIcon = L.divIcon({
              className: 'custom-assinante-pin',
              html: `<div style="width:16px;height:16px;background-color:${corPin};border:2px solid #ffffff;box-shadow:0 0 14px ${corPin}, 0 0 24px ${corPin};border-radius:50%;cursor:pointer;"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            });

            return (
              <Marker key={`emp-map-${item.id}`} position={[item.lat, item.lon]} icon={customIcon}>
                <Popup>
                  <div className="font-mono text-xs text-zinc-900 p-1 space-y-1">
                    <strong className="text-emerald-600 block font-black text-sm uppercase">{item.nome_empresa || 'Cliente Anônimo'}</strong>
                    <span className="font-sans text-zinc-700 block"><b>Plano:</b> {item.plano || 'ESSENCIAL'}</span>
                    <span className="font-sans text-zinc-700 block"><b>Status:</b> {item.status_assinatura || 'Ativa'}</span>
                    <span className="font-sans text-zinc-700 block"><b>Leads Processados:</b> {item.consumo?.leads || 0}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </>
      );
    }

    return function MapComponent({ empresas }: { empresas: EmpresaMapa[] }) {
      const centroPadrao: [number, number] = [-15.7797, -47.9297];
      const empresasComCoordenadas = useMemo(
        () => empresas.filter(e => e.lat && e.lon && !isNaN(e.lat) && !isNaN(e.lon)),
        [empresas]
      );

      return (
        <MapContainer center={centroPadrao} zoom={4} minZoom={3} style={{ width: '100%', height: '100%', background: '#09090b' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DynamicClusterLayer empresas={empresasComCoordenadas} />
        </MapContainer>
      );
    };
  },
  { ssr: false }
);

export default function RootEmpresasMapaView({ role }: { role?: string }) {
  const [empresas, setEmpresas] = useState<EmpresaMapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [mapaPronto, setMapaPronto] = useState(false);

  useEffect(() => {
    setMapaPronto(true);
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
        setErro(err.message || 'Erro ao carregar o mapa.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [role]);

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter((e) => (e.nome_empresa || '').toLowerCase().includes(termo));
  }, [empresas, busca]);

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold rounded-lg">Acesso Nível 5 (Root)</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-blue-400" /> Mapa de Clientes
          </h1>
          <p className="text-zinc-400 text-xs mt-0.5">Sede de todas as empresas/provedores cadastrados no V5 Cloud.</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 w-full md:w-96 backdrop-blur">
          <Search className="w-5 h-5 text-zinc-400 ml-2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo nome da empresa..."
            className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"
          />
        </div>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 font-mono text-sm">{erro}</div>
      )}

      {/* Altura FIXA em px (não flex-1/min-h): o Leaflet mede o container no
          momento em que monta, e uma altura vinda de flexbox pode resolver
          para 0px antes do layout assentar — aí o mapa nunca aparece. */}
      <div className="w-full h-[600px] border border-zinc-900 bg-zinc-900/20 rounded-2xl overflow-hidden relative z-0">
        {carregando ? (
          <div className="absolute inset-0 flex items-center justify-center text-emerald-500 font-mono text-xs animate-pulse uppercase font-bold tracking-widest">
            Sincronizando com Supabase...
          </div>
        ) : mapaPronto ? (
          <MapaEmpresasNoSSR empresas={empresasFiltradas} />
        ) : null}
      </div>
    </div>
  );
}
