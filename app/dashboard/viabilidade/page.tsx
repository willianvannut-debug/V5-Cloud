"use client"
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, Loader2, CheckCircle2, XCircle, Building, RefreshCw, Navigation, X, User, Phone, PlusCircle } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useApp } from '@/context/AppContext';

import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then((mod) => mod.useMap), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then((mod) => mod.useMapEvents), { ssr: false });

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map && typeof map.invalidateSize === 'function') {
        map.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function ClickHandler({ setCoords, buscarReverso }: { setCoords: (c: { lat: number; lon: number }) => void, buscarReverso: (c: { lat: number; lon: number }) => void }) {
  useMapEvents({
    click(e) {
      const novasCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
      setCoords(novasCoords);
      buscarReverso(novasCoords);
    }
  });
  return null;
}

function DraggableMarker({ coords, setCoords, buscarReverso }: { coords: { lat: number; lon: number }, setCoords: (c: { lat: number; lon: number }) => void, buscarReverso: (c: { lat: number; lon: number }) => void }) {
  const markerRef = useRef<any>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const novasCoords = { lat: latLng.lat, lon: latLng.lng };
          setCoords(novasCoords);
          buscarReverso(novasCoords);
        }
      },
    }),
    [setCoords, buscarReverso],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[coords.lat, coords.lon]}
      ref={markerRef}
    />
  );
}

interface ConsultaItem {
  id: string;
  data: string;
  nomeCliente: string;
  telefoneCliente: string;
  cep: string;
  logradouro: string;
  numero: string; 
  bairro: string;
  cidade: string;
  status: 'COM COBERTURA' | 'SEM COBERTURA';
  cto: string;
  distancia: number;
}

export default function ViabilidadePage() {
  const settings = useSettings();
  const ctos = settings?.ctos || [];
  const { adicionarLead } = useApp();
  
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');

  const [cep, setCep] = useState('');
  const [numeroLote, setNumeroLote] = useState(''); 
  const [carregandoCep, setCarregandoCep] = useState(false);
  const [calculandoRota, setCalculandoRota] = useState(false);
  
  const [coordsCliente, setCoordsCliente] = useState<{ lat: number; lon: number } | null>(null);
  
  const [endereco, setEndereco] = useState({
    logradouro: '',
    bairro: '',
    cidade: 'Águas Lindas de Goiás',
    uf: 'GO'
  });

  const [modalMapaAberto, setModalMapaAberto] = useState(false);
  const [enderecoBuscaMapa, setEnderecoBuscaMapa] = useState('');
  const [coordsTemp, setCoordsTemp] = useState<{ lat: number; lon: number }>({ lat: -15.7641, lon: -48.2743 });
  const [enderecoReverso, setEnderecoReverso] = useState('');
  const [carregandoBuscaMapa, setCarregandoBuscaMapa] = useState(false);

  const [iconeNeonQuadrado, setIconeNeonQuadrado] = useState<any>(null);

  const [resultadoAtual, setResultadoAtual] = useState<ConsultaItem | null>(null);
  const [historico, setHistorico] = useState<ConsultaItem[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

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

      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const customSquareIcon = L.divIcon({
          className: 'custom-neon-square',
          html: `<div style="
            width: 18px;
            height: 18px;
            background-color: #10b981;
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px #10b981, 0 0 20px #10b981;
            border-radius: 3px;
          "></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        setIconeNeonQuadrado(customSquareIcon);
      });
    }
  }, []);

  const handleMudancaCep = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorDigitado = e.target.value;
    const cepLimpo = valorDigitado.replace(/\D/g, '');
    setCep(cepLimpo);

    if (cepLimpo.length === 8) {
      setCarregandoCep(true);
      try {
        const resposta = await fetch(`https://cep.awesomeapi.com.br/json/${cepLimpo}`);
        if (resposta.ok) {
          const dados = await resposta.json();
          const ruaLimpa = dados.address || '';
          
          setEndereco({
            logradouro: ruaLimpa,
            bairro: dados.district || '',
            cidade: dados.city || 'Águas Lindas de Goiás',
            uf: dados.state || 'GO'
          });
          setEnderecoBuscaMapa(`${ruaLimpa}, Águas Lindas de Goiás`);
          
          const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ruaLimpa + ", Águas Lindas de Goiás, GO")}&limit=1`);
          const dataGeo = await resGeo.json();
          if (dataGeo && dataGeo.length > 0) {
            setCoordsTemp({
              lat: parseFloat(dataGeo[0].lat),
              lon: parseFloat(dataGeo[0].lon)
            });
          }
        }
      } catch (erro) {
        console.error(erro);
      } finally {
        setCarregandoCep(false);
      }
    }
  };

  const abrirModalMapaCliente = () => {
    setModalMapaAberto(true);
  };

  const handleBuscarEnderecoMapa = async () => {
    if (!enderecoBuscaMapa) return;
    setCarregandoBuscaMapa(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBuscaMapa + ", Águas Lindas de Goiás, GO")}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCoordsTemp({
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        });
        setEnderecoReverso(data[0].display_name);
      } else {
        alert("Endereço não encontrado.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoBuscaMapa(false);
    }
  };

  const buscarEnderecoReverso = async (novasCoords: { lat: number; lon: number }) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${novasCoords.lat}&lon=${novasCoords.lon}`);
      const data = await res.json();
      if (data && data.display_name) {
        setEnderecoReverso(data.display_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmarPinCliente = () => {
    setCoordsCliente({
      lat: coordsTemp.lat,
      lon: coordsTemp.lon
    });
    if (enderecoReverso) {
      setEndereco(prev => ({ ...prev, logradouro: enderecoReverso.split(',')[0] || prev.logradouro }));
    }
    setModalMapaAberto(false);
  };

  const handleCalcularViabilidade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeCliente.trim()) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }

    if (!coordsCliente) {
      alert("Por favor, posicione o PIN no mapa na casa do cliente.");
      return;
    }

    if (!ctos || ctos.length === 0) {
      alert("Atenção: Não há nenhuma caixa CTO cadastrada no sistema. Cadastre uma na aba 'Caixas CTO'.");
      return;
    }

    setCalculandoRota(true);

    try {
      let menorDistanciaRuas = Infinity;
      let ctoMaisProxima = ctos[0].identificacao;
      let raioPermitido = 300;

      for (let cto of ctos) {
        if (cto.lat !== undefined && cto.lon !== undefined) {
          try {
            const url = `https://router.project-osrm.org/route/v1/foot/${cto.lon},${cto.lat};${coordsCliente.lon},${coordsCliente.lat}?overview=false`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const distanciaRealRuas = data.routes[0].distance;

              if (distanciaRealRuas < menorDistanciaRuas) {
                menorDistanciaRuas = distanciaRealRuas;
                ctoMaisProxima = cto.identificacao;
                raioPermitido = cto.raio || 300;
              }
            }
          } catch (err) {
            console.error(`Erro ao consultar OSRM para a CTO ${cto.identificacao}:`, err);
          }
        }
      }

      if (menorDistanciaRuas === Infinity) {
        for (let cto of ctos) {
          if (cto.lat !== undefined && cto.lon !== undefined) {
            const R = 6371000;
            const dLat = (cto.lat - coordsCliente.lat) * Math.PI / 180;
            const dLon = (cto.lon - coordsCliente.lon) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
                      Math.cos(coordsCliente.lat * Math.PI / 180) * Math.cos(cto.lat * Math.PI / 180) *
                      Math.sin(dLon / 2) ** 2;
            const distanciaMetros = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
            if (distanciaMetros < menorDistanciaRuas) {
              menorDistanciaRuas = distanciaMetros;
              ctoMaisProxima = cto.identificacao;
              raioPermitido = cto.raio || 300;
            }
          }
        }
      }

      const temCobertura = menorDistanciaRuas <= raioPermitido;
      const statusFinal = temCobertura ? 'COM COBERTURA' : 'SEM COBERTURA';

      const novaConsulta: ConsultaItem = {
        id: Date.now().toString(),
        data: new Date().toLocaleString('pt-BR'),
        nomeCliente: nomeCliente.trim(),
        telefoneCliente: telefoneCliente.trim() || '(61) 99999-9999',
        cep: cep || '72900-000',
        logradouro: endereco.logradouro || 'Endereço por Mapa',
        numero: numeroLote || 'S/N',
        bairro: endereco.bairro || 'Centro',
        cidade: `${endereco.cidade} - ${endereco.uf}`,
        status: statusFinal,
        cto: ctoMaisProxima,
        distancia: Math.round(menorDistanciaRuas)
      };

      setResultadoAtual(novaConsulta);
      setHistorico([novaConsulta, ...historico]);

      // 🚀 AQUI ESTÁ A CORREÇÃO! Forçando o lead a nascer como 'NOVO' obrigatoriamente.
      adicionarLead({
        nome: nomeCliente.trim(),
        telefone: telefoneCliente.trim() || '(61) 99999-9999',
        cep: cep,
        endereco: `${endereco.logradouro}, Nº ${numeroLote}`,
        status: statusFinal,
        cto: ctoMaisProxima,
        plano: 'Fibra V5 - 600 Megas',
        data: new Date().toLocaleDateString('pt-BR'),
        lat: coordsCliente.lat,
        lon: coordsCliente.lon,
        etapa_funil: 'NOVO', // GARANTE QUE É "NOVO LEAD" E NÃO "CONVERTIDO"
        status_instalacao: null // GARANTE QUE NÃO ESTÁ "PENDENTE" PRO TÉCNICO AINDA
      } as any);

    } catch (error) {
      console.error("Erro no cálculo de viabilidade por ruas:", error);
    } finally {
      setCalculandoRota(false);
    }
  };

  const limparTudo = () => {
    setNomeCliente('');
    setTelefoneCliente('');
    setCep('');
    setNumeroLote('');
    setCoordsCliente(null);
    setResultadoAtual(null);
    setEndereco({ logradouro: '', bairro: '', cidade: 'Águas Lindas de Goiás', uf: 'GO' });
  };

  // Função para reiniciar os campos e fazer um novo teste sem recarregar a página
  const novoTeste = () => {
    setNomeCliente('');
    setTelefoneCliente('');
    setCep('');
    setNumeroLote('');
    setCoordsCliente(null);
    setResultadoAtual(null);
    setEndereco({ logradouro: '', bairro: '', cidade: 'Águas Lindas de Goiás', uf: 'GO' });
  };

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-white font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Navigation className="w-6 h-6 text-emerald-400" /> Central de Viabilidade Assistida (Atendente)
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Faça o teste de cobertura para o cliente e posicione o PIN exato no mapa.</p>
        </div>

        <button 
          onClick={limparTudo}
          className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase border bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Limpar Consulta
        </button>
      </div>

      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" /> 1. Dados do Cliente & Localização no Mapa
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleCalcularViabilidade} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Nome do Cliente */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nome do Cliente *
              </label>
              <input 
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Ex: João da Silva"
                required
                className="w-full bg-black/50 border border-emerald-500/50 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Telefone / WhatsApp
              </label>
              <input 
                type="text"
                value={telefoneCliente}
                onChange={(e) => setTelefoneCliente(e.target.value)}
                placeholder="Ex: (61) 99999-9999"
                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* CEP */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-mono uppercase text-emerald-400 font-bold">CEP</label>
              <div className="relative">
                <input 
                  type="text"
                  maxLength={8}
                  value={cep}
                  onChange={handleMudancaCep}
                  placeholder="Ex: 72925135"
                  className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                {carregandoCep && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Logradouro */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">Logradouro / Rua</label>
              <input 
                type="text"
                value={endereco.logradouro}
                onChange={(e) => setEndereco({...endereco, logradouro: e.target.value})}
                placeholder="Preenchido pelo CEP ou Mapa"
                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Número / Lote */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-mono uppercase text-emerald-400 font-bold">Lote / Nº da Casa *</label>
              <input 
                type="text"
                value={numeroLote}
                onChange={(e) => setNumeroLote(e.target.value)}
                placeholder="Ex: Lote 15"
                className="w-full bg-black/50 border border-emerald-500/50 rounded-xl px-3.5 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Bloco do Mapa / PIN */}
            <div className="md:col-span-12 mt-2 p-4 bg-black/40 border border-zinc-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-zinc-300 font-bold uppercase block">Localização Exata da Residência (PIN no Mapa)</span>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {coordsCliente 
                    ? `✓ PIN Posicionado: Lat ${coordsCliente.lat.toFixed(5)}, Lon ${coordsCliente.lon.toFixed(5)}` 
                    : "⚠️ Obrigatório: Peça a localização ou fixe o PIN no mapa onde o cliente reside."}
                </p>
              </div>

              <button
                type="button"
                onClick={abrirModalMapaCliente}
                className="px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                {coordsCliente ? "Alterar PIN no Mapa" : "Posicionar PIN da Casa no Mapa"}
              </button>
            </div>

            {/* Botão de Cálculo */}
            <div className="md:col-span-12 mt-2">
              <button 
                type="submit"
                disabled={!coordsCliente || calculandoRota}
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black uppercase text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                {calculandoRota ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculando Menor Metragem pelas Ruas...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Calcular Viabilidade e Criar Lead p/ o Cliente
                  </>
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Exibição do Resultado Atual + Botão de Novo Teste */}
      {resultadoAtual && (
        <Card className={`border ${resultadoAtual.status === 'COM COBERTURA' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'} backdrop-blur animate-in fade-in duration-300`}>
          <CardHeader className={`border-b ${resultadoAtual.status === 'COM COBERTURA' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'} pb-4 flex flex-row items-center justify-between`}>
            <CardTitle className="text-xs uppercase font-mono tracking-wide flex items-center gap-2">
              {resultadoAtual.status === 'COM COBERTURA' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} 
              Resultado da Viabilidade para {resultadoAtual.nomeCliente} (Metragem Real pelas Ruas: {resultadoAtual.distancia}m da CTO)
            </CardTitle>

            {/* BOTÃO NOVO TESTE */}
            <button
              type="button"
              onClick={novoTeste}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            >
              <PlusCircle className="w-4 h-4" /> Novo Teste
            </button>
          </CardHeader>

          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Cliente & Contato</span>
              <h4 className="font-bold text-sm text-white font-sans mt-0.5">{resultadoAtual.nomeCliente}</h4>
              <span className="text-xs text-zinc-400 font-mono">{resultadoAtual.telefoneCliente}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Endereço Registrado</span>
              <h4 className="font-bold text-xs text-white font-sans mt-0.5">{resultadoAtual.logradouro}, Nº {resultadoAtual.numero}</h4>
              <span className="text-[11px] text-zinc-400 font-mono">{resultadoAtual.bairro} — {resultadoAtual.cidade}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Status da Rede & CTO</span>
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold border ${
                  resultadoAtual.status === 'COM COBERTURA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {resultadoAtual.status}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">{resultadoAtual.cto}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Ação Comercial</span>
              <div className="mt-1">
                {resultadoAtual.status === 'COM COBERTURA' ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold uppercase text-xs font-mono">
                    Liberado p/ Venda
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold uppercase text-xs font-mono">
                    Fora da Área
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Consultas */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" /> Histórico de Consultas Assistidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4">Cliente & Contato</th>
                  <th className="p-4">Endereço & Lote</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">CTO & Metragem Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {historico.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-zinc-500">
                      Nenhuma consulta realizada nesta sessão.
                    </td>
                  </tr>
                ) : (
                  historico.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 text-zinc-400">{item.data}</td>
                      <td className="p-4">
                        <div className="font-bold font-sans text-sm text-white">{item.nomeCliente}</div>
                        <div className="text-[11px] text-zinc-500">{item.telefoneCliente}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold font-sans text-xs text-white">{item.logradouro}, Nº {item.numero}</div>
                        <div className="text-[11px] text-zinc-500">{item.bairro} — {item.cidade}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold border ${
                          item.status === 'COM COBERTURA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400">
                        {item.cto} <span className="text-[11px] text-zinc-500 font-normal">({item.distancia}m de cabo)</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal do Mapa para Arrastar o PIN */}
      {modalMapaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/40">
              <h3 className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Arraste o PIN Neon para a Casa do Cliente
              </h3>
              <button onClick={() => setModalMapaAberto(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={enderecoBuscaMapa}
                  onChange={(e) => setEnderecoBuscaMapa(e.target.value)}
                  placeholder="Pesquisar rua ou bairro..."
                  className="flex-1 bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button type="button" onClick={handleBuscarEnderecoMapa} disabled={carregandoBuscaMapa} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5">
                  {carregandoBuscaMapa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Localizar
                </button>
              </div>

              <p className="text-[11px] text-emerald-400 font-mono">
                🖱️ <strong>Instrução:</strong> Peça a localização via WhatsApp ao cliente e solte o quadrado neon verde exatamente em cima da residência dele.
              </p>

              <div className="relative w-full h-96 bg-[#09090b] border border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg z-10">
                <MapContainer 
                  center={[coordsTemp.lat, coordsTemp.lon]} 
                  zoom={16} 
                  style={{ width: '100%', height: '100%', background: '#09090b' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapResizeFix />
                  {iconeNeonQuadrado && (
                    <DraggableMarker coords={coordsTemp} setCoords={setCoordsTemp} buscarReverso={buscarEnderecoReverso} />
                  )}
                  <ClickHandler setCoords={setCoordsTemp} buscarReverso={buscarEnderecoReverso} />
                </MapContainer>
              </div>

              <div className="p-3 bg-black/60 border border-zinc-800 rounded-xl space-y-1 font-mono text-xs">
                <div className="text-emerald-400 font-bold">📍 Coordenadas Selecionadas: <span className="text-white">Lat {coordsTemp.lat.toFixed(5)}, Lon {coordsTemp.lon.toFixed(5)}</span></div>
                <div className="text-zinc-400 truncate">🏠 Endereço Identificado: <span className="text-zinc-200">{enderecoReverso || "Aguardando ajuste do PIN..."}</span></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalMapaAberto(false)} className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-mono uppercase font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmarPinCliente} className="px-5 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  Confirmar PIN e Coordenadas
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}