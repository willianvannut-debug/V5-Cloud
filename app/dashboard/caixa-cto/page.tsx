//app/dashboard/caixa-cto/page.tsx

"use client"
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Network, 
  Plus, 
  Trash2, 
  MapPin, 
  Save, 
  CheckCircle2, 
  X, 
  Navigation,
  Search,
  Loader2,
  Globe,
  Rocket,
  Upload,
  ShieldAlert,
  List,
  Crosshair,
  SlidersHorizontal,
  Building2,
  CheckSquare,
  Square,
  RefreshCw
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { PLANOS } from '@/lib/planLimites';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export interface CtoItemSupabase {
  id: string;
  identificacao: string;
  endereco: string;
  raio: number;
  lat: number;
  lon: number;
  provedor_id?: string;
}

export default function CaixaCtoPage() {
  const settings = useSettings();
  const { operador, empresa } = useAuth();
  
  const [RL, setRL] = useState<any>(null); 
  const [L, setL] = useState<any>(null);
  const [planoAtual, setPlanoAtual] = useState<string>('');

  const [listaCtos, setListaCtos] = useState<CtoItemSupabase[]>([]);
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregandoBanco, setCarregandoBanco] = useState(true);
  
  const [importandoKmz, setImportandoKmz] = useState(false);
  const [erroSegurancaKmz, setErroSegurancaKmz] = useState<string | null>(null);
  const [mensagemImportacao, setMensagemImportacao] = useState('Selecionar Arquivo KML');

  const [modalEmpresaAberto, setModalEmpresaAberto] = useState(false);
  const [nomeEmpresaTemp, setNomeEmpresaTemp] = useState('V5 Telecom');
  const [arquivoPendente, setArquivoPendente] = useState<File | null>(null);

  const [raioMassa, setRaioMassa] = useState<number>(100);

  const [modalListaAberto, setModalListaAberto] = useState(false);
  const [buscaLista, setBuscaLista] = useState('');

  const [idsSelecionados, setIdsSelecionados] = useState<string[]>([]);
  const [novoNomeEmpresaMassa, setNovoNomeEmpresaMassa] = useState('');

  const [modalMapaAberto, setModalMapaAberto] = useState(false);
  const [ctoEditandoId, setCtoEditandoId] = useState<string | null>(null);
  const [enderecoBuscaMapa, setEnderecoBuscaMapa] = useState('');
  const [coordsTemp, setCoordsTemp] = useState<{ lat: number; lon: number }>({ lat: 0, lon: 0 });
  const [enderecoReverso, setEnderecoReverso] = useState('');
  const [carregandoBusca, setCarregandoBusca] = useState(false);

  const [zoomAtual, setZoomAtual] = useState(16);
  const [mapBounds, setMapBounds] = useState<any>(null);

  const markerRef = useRef<any>(null);
  const mapGeralRef = useRef<any>(null);
  const [mapModalInstancia, setMapModalInstancia] = useState<any>(null);

  const [mascaraMundoGeoJson, setMascaraMundoGeoJson] = useState<any>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries/BRA.geo.json')
      .then(res => res.json())
      .then(data => {
        let aneisBrasil: any[] = [];
        if (data.features[0].geometry.type === 'MultiPolygon') {
          data.features[0].geometry.coordinates.forEach((poligono: any) => {
            aneisBrasil.push(...poligono);
          });
        } else {
          aneisBrasil = data.features[0].geometry.coordinates;
        }

        const quadradoMundo = [
          [
            [-360, 85],
            [360, 85],
            [360, -85],
            [-360, -85],
            [-360, 85]
          ]
        ];

        const mascaraInvertida = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [...quadradoMundo, ...aneisBrasil]
              },
              properties: {}
            }
          ]
        };

        setMascaraMundoGeoJson(mascaraInvertida);
      })
      .catch(err => console.error("Erro ao criar máscara do Brasil:", err));

    async function sincronizarPlanoReal() {
      const planoDoContexto = empresa?.plano || operador?.empresa?.plano;
      if (planoDoContexto) {
        setPlanoAtual(String(planoDoContexto).toLowerCase().trim());
        return;
      }
      if (!supabase) return;
      try {
        const idDaEmpresa = operador?.empresaId || operador?.empresa_id;
        if (!idDaEmpresa) return setPlanoAtual('ERRO');
        const { data } = await supabase.from('empresas').select('plano').eq('id', idDaEmpresa).maybeSingle();
        if (data && data.plano) setPlanoAtual(String(data.plano).toLowerCase().trim());
      } catch (err) {
        setPlanoAtual('ERRO');
      }
    }
    sincronizarPlanoReal();
  }, [operador, empresa]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([import('leaflet'), import('react-leaflet')]).then(([leaflet, reactLeaflet]) => {
        const leaf = leaflet.default || leaflet;
        delete (leaf.Icon.Default.prototype as any)._getIconUrl;
        leaf.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setL(leaf);
        setRL(reactLeaflet);
      });
    }
  }, []);

  useEffect(() => {
    if (!carregandoBanco && mapGeralRef.current) {
      setTimeout(() => {
        mapGeralRef.current.invalidateSize();
      }, 300);
    }
  }, [carregandoBanco, zoomAtual]);

  const iconeLimpoVerde = useMemo(() => {
    if (!L) return null;
    return L.divIcon({
      className: 'clean-green-dot',
      html: `<div style="width: 12px; height: 12px; background-color: #10b981; border: 1.5px solid #000000; border-radius: 2px;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }, [L]);

  const criarIconeCluster = (quantidade: number) => {
    if (!L) return null;
    return L.divIcon({
      className: 'cluster-marker',
      html: `<div style="background-color: #10b981; color: #000; font-weight: 900; font-family: monospace; font-size: 11px; width: 32px; height: 32px; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(16,185,129,0.5);">${quantidade}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  const ctosAgrupadasParaExibir = useMemo(() => {
    if (listaCtos.length === 0) return [];

    const visiveis = (!mapBounds || listaCtos.length <= 1000) 
      ? listaCtos 
      : listaCtos.filter(cto => cto.lat !== undefined && cto.lon !== undefined && mapBounds.contains([cto.lat, cto.lon]));

    if (zoomAtual >= 15) {
      return visiveis.map(c => ({ tipo: 'individual', ...c }));
    }

    const precisaoDecimal = zoomAtual < 12 ? 1 : 2;
    const clustersMap: { [key: string]: { lat: number; lon: number; itens: CtoItemSupabase[] } } = {};

    visiveis.forEach(cto => {
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
          id: `cluster-${cluster.lat}-${cluster.lon}`,
          lat: cluster.lat,
          lon: cluster.lon,
          quantidade: cluster.itens.length,
          itens: cluster.itens
        };
      }
    });
  }, [listaCtos, mapBounds, zoomAtual]);

  // 🚀 CACHE INTELIGENTE: Carrega do navegador (localStorage) para evitar requisições repetidas ao Supabase
  const buscarCtosDaApi = useCallback(async (forcarAtualizacao = false) => {
    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
    if (!idDaEmpresa) return;

    const chaveCache = `v5_ctos_cache_${idDaEmpresa}`;

    if (!forcarAtualizacao) {
      const dadosSalvosCache = localStorage.getItem(chaveCache);
      if (dadosSalvosCache) {
        try {
          const ctosParseadas = JSON.parse(dadosSalvosCache);
          if (Array.isArray(ctosParseadas)) {
            setListaCtos(ctosParseadas);
            setCarregandoBanco(false);
            setTemAlteracoes(false);
            return; // Carregado instantaneamente do navegador!
          }
        } catch (e) {}
      }
    }

    setCarregandoBanco(true);
    try {
      const res = await fetch('/api/ctos');
      const data = await res.json();
      if (data.sucesso && data.ctos) {
        setListaCtos(data.ctos);
        localStorage.setItem(chaveCache, JSON.stringify(data.ctos));
      } else {
        setListaCtos([]);
      }
      setTemAlteracoes(false);
    } catch (err) {
      setListaCtos([]);
    } finally {
      setCarregandoBanco(false);
    }
  }, [operador, empresa]);

  useEffect(() => {
    buscarCtosDaApi();
  }, [buscarCtosDaApi]);

  useEffect(() => {
    if (settings && coordsTemp.lat === 0 && coordsTemp.lon === 0) {
      setCoordsTemp({ lat: settings.latEmpresa ?? -15.7553, lon: settings.lonEmpresa ?? -48.2778 });
    }
  }, [settings, coordsTemp.lat, coordsTemp.lon]);

  const buscarEnderecoReverso = useCallback(async (novasCoords: { lat: number; lon: number }) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${novasCoords.lat}&lon=${novasCoords.lon}`);
      const data = await res.json();
      if (data && data.display_name) setEnderecoReverso(data.display_name);
    } catch (err) {}
  }, []);

  useEffect(() => {
    if (mapModalInstancia && modalMapaAberto) {
      const timer = setTimeout(() => mapModalInstancia.invalidateSize(), 300);
      const onMapClick = (e: any) => {
        const novasCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
        setCoordsTemp(novasCoords);
        buscarEnderecoReverso(novasCoords);
      };
      mapModalInstancia.on('click', onMapClick);
      return () => { clearTimeout(timer); mapModalInstancia.off('click', onMapClick); };
    }
  }, [mapModalInstancia, modalMapaAberto, buscarEnderecoReverso]);

  const eventHandlersArrasto = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latLng = marker.getLatLng();
        const novasCoords = { lat: latLng.lat, lon: latLng.lng };
        setCoordsTemp(novasCoords);
        buscarEnderecoReverso(novasCoords);
      }
    },
  }), [buscarEnderecoReverso]);

  if (!settings) return null;

  const cidadeEmpresa = settings.cidadeEmpresa || 'Águas Lindas de Goiás - GO';
  const latEmpresa = settings.latEmpresa ?? -15.7553;
  const lonEmpresa = settings.lonEmpresa ?? -48.2778;

  const configPlanoAtual = PLANOS[planoAtual];
  const limiteCtos = configPlanoAtual ? configPlanoAtual.max_ctos : "ERRO";
  const totalCaixas = listaCtos.length;
  const bateuLimite = typeof limiteCtos === 'number' ? totalCaixas >= limiteCtos : false;
  const porcentagemUso = typeof limiteCtos === 'number' && limiteCtos > 0 ? Math.min((totalCaixas / limiteCtos) * 100, 100) : 0;

  const handleAplicarRaioEmMassa = () => {
    if (listaCtos.length === 0) return;
    const novaLista = listaCtos.map(item => ({ ...item, raio: Number(raioMassa) }));
    setListaCtos(novaLista);
    setTemAlteracoes(true);
  };

  const handleSelecionarArquivoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErroSegurancaKmz(null);
    const nomeArquivo = arquivo.name.toLowerCase();

    if (nomeArquivo.endsWith('.kmz')) {
      setErroSegurancaKmz('Ficheiro ZIPADO: O .KMZ não pode ser lido diretamente. Extraia o ficheiro .KML para continuar.');
      e.target.value = ''; 
      return;
    }

    if (!nomeArquivo.endsWith('.kml')) {
      setErroSegurancaKmz('Erro: Formato inválido. Selecione ficheiros .KML');
      e.target.value = ''; 
      return;
    }

    setArquivoPendente(arquivo);
    setModalEmpresaAberto(true);
    e.target.value = '';
  };

  const handleConfirmarImportacaoComEmpresa = () => {
    if (!arquivoPendente) return;
    setModalEmpresaAberto(false);

    const arquivo = arquivoPendente;
    const bytes = arquivo.size;
    let tamanhoFormatado = '';
    
    if (bytes >= 1073741824) {
      tamanhoFormatado = (bytes / 1073741824).toFixed(2) + ' GB';
    } else if (bytes >= 1048576) {
      tamanhoFormatado = (bytes / 1048576).toFixed(2) + ' MB';
    } else {
      tamanhoFormatado = (bytes / 1024).toFixed(2) + ' KB';
    }

    setImportandoKmz(true);
    setMensagemImportacao(`A ler ficheiro de ${tamanhoFormatado}...`);

    try {
      const reader = new FileReader();
      reader.onload = async (evento) => {
        try {
          const conteudoTexto = evento.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(conteudoTexto, "text/xml");
          const placemarks = xmlDoc.getElementsByTagName("Placemark");
          const todasAsCaixasExtraidas = [];
          let contador = listaCtos.length + 1;

          for (let i = 0; i < placemarks.length; i++) {
            const placemark = placemarks[i];
            const point = placemark.getElementsByTagName("Point")[0];
            if (!point) continue; 
            const coordsNode = point.getElementsByTagName("coordinates")[0];
            if (!coordsNode) continue;
            const nameNode = placemark.getElementsByTagName("name")[0];
            const nomeCto = nameNode ? nameNode.textContent?.trim() : `CTO-KML-${contador}`;
            const coordsTexto = coordsNode.textContent?.trim() || "";
            const partes = coordsTexto.split(',');

            if (partes.length >= 2) {
              const lon = parseFloat(partes[0]);
              const lat = parseFloat(partes[1]);

              if (!isNaN(lat) && !isNaN(lon)) {
                todasAsCaixasExtraidas.push({
                  id: `temp-${Date.now()}-${contador}`,
                  identificacao: nomeCto || `CTO-KML-${contador}`,
                  endereco: nomeEmpresaTemp || 'V5 Telecom',
                  raio: Number(raioMassa),
                  lat,
                  lon
                });
                contador++;
              }
            }
          }

          if (todasAsCaixasExtraidas.length === 0) {
            setErroSegurancaKmz('Nenhuma caixa encontrada. O KML deve conter pontos válidos.');
            setImportandoKmz(false);
            setMensagemImportacao('Selecionar Arquivo KML');
            return;
          }

          const tamanhoLote = 300;
          let indiceAtual = 0;

          const carregarProximoLote = () => {
            if (indiceAtual < todasAsCaixasExtraidas.length) {
              const lote = todasAsCaixasExtraidas.slice(indiceAtual, indiceAtual + tamanhoLote);
              setListaCtos(prev => [...prev, ...lote]);
              setTemAlteracoes(true);
              indiceAtual += tamanhoLote;
              setMensagemImportacao(`A carregar... (${Math.min(indiceAtual, todasAsCaixasExtraidas.length)} / ${todasAsCaixasExtraidas.length})`);
              setTimeout(carregarProximoLote, 30);
            } else {
              setImportandoKmz(false);
              setMensagemImportacao('Selecionar Arquivo KML');
              setArquivoPendente(null);
            }
          };

          carregarProximoLote();

        } catch (err) {
          setErroSegurancaKmz('Falha ao descodificar o arquivo KML.');
          setImportandoKmz(false);
          setMensagemImportacao('Selecionar Arquivo KML');
        }
      };
      reader.readAsText(arquivo);
    } catch (err) {
      setImportandoKmz(false);
      setMensagemImportacao('Selecionar Arquivo KML');
    }
  };

  const handleAdicionarCto = () => {
    if (bateuLimite) {
      alert(`Limite de caixas CTO atingido!`); return;
    }
    const novaCtoTemp = {
      id: `temp-${Date.now()}`,
      identificacao: `CTO-0${listaCtos.length + 1}`,
      endereco: 'V5 Telecom',
      raio: Number(raioMassa),
      lat: latEmpresa,
      lon: lonEmpresa
    };

    setListaCtos([...listaCtos, novaCtoTemp]);
    setTemAlteracoes(true);
  };

  const handleRemoverCto = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta caixa CTO?")) return;

    if (!id.startsWith('temp-') && supabase) {
      try {
        const { error } = await supabase.from('ctos').delete().eq('id', id);
        if (error) {
          alert("Erro ao apagar no Supabase: " + error.message);
          return;
        }
      } catch (err: any) {
        alert("Erro ao apagar: " + (err.message || err));
        return;
      }
    }

    const novaLista = listaCtos.filter(item => item.id !== id);
    setListaCtos(novaLista);
    setIdsSelecionados(prev => prev.filter(i => i !== id));

    // Atualiza o cache local
    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
    if (idDaEmpresa) {
      localStorage.setItem(`v5_ctos_cache_${idDaEmpresa}`, JSON.stringify(novaLista));
    }
  };

  const handleAtualizarCtoLocal = (id: string, campo: keyof CtoItemSupabase, valor: any) => {
    setListaCtos(listaCtos.map(item => item.id === id ? { ...item, [campo]: valor } : item));
    setTemAlteracoes(true);
  };

  const ctosFiltradas = listaCtos.filter(cto => {
    const termo = buscaLista.toLowerCase();
    return cto.identificacao?.toLowerCase().includes(termo) || cto.endereco?.toLowerCase().includes(termo);
  });

  const toggleSelecionarTodas = () => {
    if (idsSelecionados.length === ctosFiltradas.length) {
      setIdsSelecionados([]);
    } else {
      setIdsSelecionados(ctosFiltradas.map(c => c.id));
    }
  };

  const toggleSelecionarCaixa = (id: string) => {
    if (idsSelecionados.includes(id)) {
      setIdsSelecionados(idsSelecionados.filter(i => i !== id));
    } else {
      setIdsSelecionados([...idsSelecionados, id]);
    }
  };

  const aplicarEmpresaEmMassa = () => {
    if (!novoNomeEmpresaMassa || idsSelecionados.length === 0) return;
    const novaLista = listaCtos.map(item => idsSelecionados.includes(item.id) ? { ...item, endereco: novoNomeEmpresaMassa } : item);
    setListaCtos(novaLista);
    setTemAlteracoes(true);
    setNovoNomeEmpresaMassa('');
    alert(`Empresa atualizada em ${idsSelecionados.length} caixas selecionadas!`);
  };

  const apagarSelecionadasEmMassa = async () => {
    if (idsSelecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja apagar ${idsSelecionados.length} caixas selecionadas?`)) return;

    const idsParaDeletarServidor = idsSelecionados.filter(id => !id.startsWith('temp-'));

    if (idsParaDeletarServidor.length > 0 && supabase) {
      try {
        const tamanhoLote = 100;
        for (let i = 0; i < idsParaDeletarServidor.length; i += tamanhoLote) {
          const lote = idsParaDeletarServidor.slice(i, i + tamanhoLote);
          const { error } = await supabase.from('ctos').delete().in('id', lote);
          if (error) throw error;
        }
      } catch (err: any) {
        alert("Erro ao apagar caixas no Supabase: " + (err.message || err));
        return;
      }
    }

    const novaLista = listaCtos.filter(item => !idsSelecionados.includes(item.id));
    setListaCtos(novaLista);
    setIdsSelecionados([]);
    setModalListaAberto(false);
    setTemAlteracoes(true);

    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
    if (idDaEmpresa) {
      localStorage.setItem(`v5_ctos_cache_${idDaEmpresa}`, JSON.stringify(novaLista));
    }

    alert("Caixas apagadas com sucesso do sistema e do banco de dados!");
  };

  const abrirModalMapa = (cto: CtoItemSupabase) => {
    setCtoEditandoId(cto.id);
    setEnderecoBuscaMapa(cidadeEmpresa);
    setCoordsTemp({ lat: cto.lat || latEmpresa, lon: cto.lon || lonEmpresa });
    setEnderecoReverso('');
    setModalMapaAberto(true);
  };

  const handleBuscarEnderecoMapa = async () => {
    if (!enderecoBuscaMapa) return;
    setCarregandoBusca(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBuscaMapa + ", " + cidadeEmpresa)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCoordsTemp({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      }
    } catch (err) {
    } finally {
      setCarregandoBusca(false);
    }
  };

  const handleSalvarCoordsCto = () => {
    if (ctoEditandoId) {
      const ctoAlvo = listaCtos.find(i => i.id === ctoEditandoId);
      if (!ctoAlvo) return;
      const atualizacao = {
        lat: coordsTemp.lat,
        lon: coordsTemp.lon
      };
      setListaCtos(listaCtos.map(item => item.id === ctoEditandoId ? { ...item, ...atualizacao } : item));
      setTemAlteracoes(true);
    }
    setModalMapaAberto(false);
    setCtoEditandoId(null);
  };

  const handleSalvarTudoEmLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temAlteracoes || !supabase) return;

    setSalvando(true);
    try {
      const novas = listaCtos.filter(c => c.id.startsWith('temp-')).map(({ id, ...rest }) => ({
        ...rest,
        provedor_id: operador?.empresaId || operador?.empresa_id || empresa?.id
      }));

      const atualizadas = listaCtos.filter(c => !c.id.startsWith('temp-'));

      if (novas.length > 0) {
        for (let i = 0; i < novas.length; i += 500) {
          const lote = novas.slice(i, i + 500);
          const { error } = await supabase.from('ctos').insert(lote);
          if (error) throw error;
        }
      }

      if (atualizadas.length > 0) {
        for (let i = 0; i < atualizadas.length; i += 500) {
          const lote = atualizadas.slice(i, i + 500);
          const { error } = await supabase.from('ctos').upsert(lote);
          if (error) throw error;
        }
      }

      setSalvo(true);
      setTimeout(() => setSalvo(false), 4000);
      
      // Atualiza os dados da API e recarrega o cache local fresco
      await buscarCtosDaApi(true);
    } catch (err: any) {
      alert("Erro ao salvar no Supabase: " + (err.message || err));
    } finally {
      setSalvando(false);
    }
  };

  const centroGeral = useMemo(() => {
    if (listaCtos.length > 0 && listaCtos[0].lat && listaCtos[0].lon) return [listaCtos[0].lat, listaCtos[0].lon] as [number, number];
    return [latEmpresa, lonEmpresa] as [number, number];
  }, [listaCtos, latEmpresa, lonEmpresa]);

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style jsx global>{`
        .leaflet-tile-pane, .leaflet-tile-pane img, .leaflet-layer, .leaflet-container {
          filter: none !important; -webkit-filter: none !important;
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-emerald-400" /> Gestão de Caixas CTO (Supabase Nuvem)
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Infraestrutura sincronizada com cache local inteligente (Zero Lag).</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Botão para forçar atualização direto da nuvem */}
          <button
            type="button"
            onClick={() => buscarCtosDaApi(true)}
            className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border border-zinc-700"
            title="Sincronizar com a nuvem"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar Nuvem
          </button>

          <button
            type="button"
            onClick={handleAdicionarCto}
            className={`px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
              bateuLimite 
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            }`}
          >
            {bateuLimite ? (
              <><Rocket className="w-4 h-4" /> Upgrade para Adicionar Caixas</>
            ) : (
              <><Plus className="w-4 h-4" /> Adicionar Caixa CTO</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-emerald-500/30 bg-emerald-500/5 backdrop-blur flex items-center">
          <CardContent className="p-6 w-full flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" /> Importação Expressa via Google Earth (.KML)
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-1">Associa automaticamente à empresa informada.</p>
            </div>
            <label className={`px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              importandoKmz ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}>
              {importandoKmz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {mensagemImportacao}
              <input type="file" accept=".kmz,.kml" onChange={handleSelecionarArquivoInput} disabled={importandoKmz} className="hidden" />
            </label>
          </CardContent>
        </Card>

        <Card className="border border-zinc-800 bg-zinc-900/50 backdrop-blur flex items-center">
          <CardContent className="p-6 w-full flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" /> Raio em Massa
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-1">Metros para todas as caixas.</p>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={raioMassa} 
                onChange={(e) => setRaioMassa(Number(e.target.value))} 
                className="w-20 bg-black/50 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 text-center"
              />
              <button 
                type="button" 
                onClick={handleAplicarRaioEmMassa}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-mono font-bold uppercase cursor-pointer border border-zinc-700"
              >
                Aplicar
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {modalEmpresaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm font-bold uppercase">
              <Building2 className="w-5 h-5" /> Empresa Responsável pelo KML
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Informe o nome da empresa ou provedor dono destas caixas antes de iniciar a importação:
            </p>
            <input 
              type="text" 
              value={nomeEmpresaTemp} 
              onChange={(e) => setNomeEmpresaTemp(e.target.value)} 
              placeholder="Ex: V5 Telecom ou Parceiro X" 
              className="w-full bg-black/60 border border-zinc-700 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => { setModalEmpresaAberto(false); setArquivoPendente(null); }} 
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-mono uppercase font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleConfirmarImportacaoComEmpresa} 
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                Confirmar e Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {erroSegurancaKmz && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" /> {erroSegurancaKmz}
        </div>
      )}

      {salvo && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Caixas CTO sincronizadas com o Supabase com sucesso!
        </div>
      )}

      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex justify-between text-sm font-bold mb-3">
            <span className="text-zinc-300 font-mono uppercase tracking-widest text-xs flex items-center gap-2">
               Uso de Licenças de Rede (Plano {planoAtual ? planoAtual.toUpperCase() : 'CARREGANDO...'})
            </span>
            <span className={bateuLimite ? "text-red-400 font-mono" : "text-emerald-400 font-mono"}>
              {totalCaixas} / {limiteCtos} Caixas Mapeadas
            </span>
          </div>
          <div className="w-full bg-black rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${bateuLimite ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} 
              style={{ width: `${porcentagemUso}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSalvarTudoEmLote} className="space-y-6">
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Caixas Cadastradas ({cidadeEmpresa})
            </CardTitle>
            <span className="text-[10px] font-mono text-zinc-500">Exibindo as 5 primeiras adições</span>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {carregandoBanco ? (
              <div className="p-12 text-center text-emerald-400 font-mono text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Buscando caixas no cache local...
              </div>
            ) : (!listaCtos || listaCtos.length === 0) ? (
              <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                Nenhuma caixa CTO cadastrada no banco. Importe um arquivo KML ou clique em Adicionar Caixa CTO.
              </div>
            ) : (
              <div className="space-y-3">
                {listaCtos.slice(0, 5).map((cto) => (
                  <div key={cto.id} className={`p-4 bg-black/40 border rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end transition-all ${cto.id.startsWith('temp-') ? 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-zinc-900'}`}>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Identificação</label>
                      <input type="text" value={cto.identificacao} onChange={(e) => handleAtualizarCtoLocal(cto.id, 'identificacao', e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Empresa / Provedor</label>
                      <input type="text" value={cto.endereco || ''} onChange={(e) => handleAtualizarCtoLocal(cto.id, 'endereco', e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Raio (Metros)</label>
                      <input type="number" value={cto.raio || 300} onChange={(e) => handleAtualizarCtoLocal(cto.id, 'raio', Number(e.target.value))} className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Localização GPS</label>
                      <button type="button" onClick={() => abrirModalMapa(cto)} className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <MapPin className="w-3.5 h-3.5" /> {cto.lat && cto.lon ? "Alterar PIN" : "Posicionar PIN"}
                      </button>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button type="button" onClick={() => handleRemoverCto(cto.id)} className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer" title="Remover">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {cto.id.startsWith('temp-') && (
                      <div className="md:col-span-12 text-[10px] font-mono text-emerald-400 pt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Caixa em rascunho. Salve para enviar ao banco.
                      </div>
                    )}
                  </div>
                ))}
                
                {listaCtos.length > 5 && (
                  <div className="flex justify-center pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalListaAberto(true)}
                      className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-mono uppercase font-bold transition-all flex items-center gap-2 cursor-pointer border border-zinc-700"
                    >
                      <List className="w-4 h-4" /> Ver Todas as {listaCtos.length} Caixas
                    </button>
                  </div>
                )}

              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" /> Mapa Geral de Cobertura - Satélite HD ({cidadeEmpresa})
            </CardTitle>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => {
                  if (mapGeralRef.current) {
                    mapGeralRef.current.setView(centroGeral, 16);
                    mapGeralRef.current.invalidateSize();
                  }
                }}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-lg text-[10px] font-mono uppercase font-bold flex items-center gap-1 cursor-pointer border border-zinc-700 transition-colors"
                title="Centralizar nas caixas"
              >
                <Crosshair className="w-3 h-3" /> Centralizar nas Caixas
              </button>
              <span className="text-[10px] font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded-lg border border-zinc-800">
                Zoom: {zoomAtual}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="relative w-full h-[480px] bg-[#09090b] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)] z-0">
              {!RL || !L || carregandoBanco ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500/70 font-mono text-xs gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" /> Carregando mapa de satélite...
                </div>
              ) : (
                <RL.MapContainer 
                  center={centroGeral} 
                  zoom={16} 
                  maxZoom={21} 
                  minZoom={4}
                  maxBounds={[
                    [-35.0, -75.0], 
                    [6.0, -32.0]    
                  ]}
                  maxBoundsViscosity={1.0}
                  ref={mapGeralRef}
                  style={{ width: '100%', height: '100%', background: '#09090b' }}
                >
                  <ZoomHandler setZoomAtual={setZoomAtual} />
                  <ViewportHandler setBounds={setMapBounds} />

                  <RL.TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={21} maxNativeZoom={20} />
                  
                  {zoomAtual < 15 && (
                    <RL.TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png" maxZoom={20} subdomains="abcd" opacity={0.85} />
                  )}

                  {mascaraMundoGeoJson && (
                    <RL.GeoJSON 
                      key="mascara-brasil-cto-geral"
                      data={mascaraMundoGeoJson} 
                      style={{
                        color: '#ef4444',
                        weight: 2,
                        opacity: 0.8,
                        dashArray: '5, 10',
                        fillColor: '#09090b',
                        fillOpacity: 0.95,
                        fillRule: 'evenodd'
                      }} 
                    />
                  )}

                  {ctosAgrupadasParaExibir.map((item: any) => {
                    if (item.tipo === 'cluster') {
                      const iconeCluster = criarIconeCluster(item.quantidade);
                      if (!iconeCluster) return null;

                      return (
                        <RL.Marker key={item.id} position={[item.lat, item.lon]} icon={iconeCluster}>
                          <RL.Popup>
                            <div className="font-mono text-xs text-zinc-900 p-1 space-y-1">
                              <strong className="text-emerald-700 block font-black text-sm uppercase">Região com {item.quantidade} Caixas</strong>
                              <span className="font-sans text-zinc-700 block">Aproxime o zoom para ver os detalhes individuais de cada caixa nesta área.</span>
                            </div>
                          </RL.Popup>
                        </RL.Marker>
                      );
                    } else {
                      if (item.lat !== undefined && item.lon !== undefined && iconeLimpoVerde) {
                        return (
                          <RL.Marker key={item.id} position={[item.lat, item.lon]} icon={iconeLimpoVerde}>
                            <RL.Popup>
                              <div className="font-mono text-xs text-zinc-900 p-1 space-y-1">
                                <strong className="text-emerald-700 block font-black text-sm uppercase">{item.identificacao}</strong>
                                <span className="text-emerald-600 block font-bold">Empresa: {item.endereco || "Não definida"}</span>
                                <div className="text-[10px] text-zinc-500 font-bold uppercase">Raio: {item.raio || 300} metros</div>
                              </div>
                            </RL.Popup>
                          </RL.Marker>
                        );
                      }
                    }
                    return null;
                  })}
                </RL.MapContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={!temAlteracoes || salvando}
            className={`px-6 py-3 rounded-xl transition-all font-mono flex items-center gap-2 text-xs font-bold uppercase ${
              temAlteracoes 
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
            }`}
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            {salvando ? 'Sincronizando Banco...' : temAlteracoes ? 'Salvar Alterações em Lote' : 'Tudo Salvo no Banco'}
          </button>
        </div>
      </form>

      {modalListaAberto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-black/60 rounded-t-2xl">
              <div>
                <h3 className="text-sm uppercase font-mono tracking-wider text-white font-bold flex items-center gap-2">
                  <List className="w-4 h-4 text-emerald-400" /> Lista Completa de Caixas CTO ({listaCtos.length})
                </h3>
                <p className="text-zinc-500 text-xs font-mono mt-1">Selecione caixas para editar o provedor ou apagá-las em massa.</p>
              </div>
              <button type="button" onClick={() => setModalListaAberto(false)} className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 cursor-pointer transition-colors border border-transparent hover:border-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 border-b border-zinc-800 bg-[#0a0a0a] flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3 bg-black border border-zinc-800 rounded-xl p-3 flex-1 focus-within:border-emerald-500 transition-colors w-full">
                <Search className="w-4 h-4 text-zinc-500 ml-1" />
                <input 
                  type="text"
                  value={buscaLista}
                  onChange={(e) => setBuscaLista(e.target.value)}
                  placeholder="Pesquisar caixa por nome ou empresa..."
                  className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <button 
                type="button"
                onClick={toggleSelecionarTodas}
                className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border border-zinc-700 shrink-0 w-full md:w-auto justify-center"
              >
                {idsSelecionados.length === ctosFiltradas.length && ctosFiltradas.length > 0 ? (
                  <><CheckSquare className="w-4 h-4 text-emerald-400" /> Desmarcar Todas</>
                ) : (
                  <><Square className="w-4 h-4 text-emerald-400" /> Selecionar Todas ({ctosFiltradas.length})</>
                )}
              </button>
            </div>

            {idsSelecionados.length > 0 && (
              <div className="bg-emerald-500/10 border-y border-emerald-500/30 p-3 px-5 flex flex-col md:flex-row items-center justify-between gap-3 animate-fadeIn">
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase">
                  {idsSelecionados.length} caixas selecionadas
                </span>
                
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                  <input 
                    type="text"
                    value={novoNomeEmpresaMassa}
                    onChange={(e) => setNovoNomeEmpresaMassa(e.target.value)}
                    placeholder="Novo nome da empresa..."
                    className="bg-black/70 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    type="button"
                    onClick={aplicarEmpresaEmMassa}
                    className="px-3.5 py-1.5 bg-emerald-500 text-black hover:bg-emerald-400 rounded-lg text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    Alterar Empresa
                  </button>
                  <button 
                    type="button"
                    onClick={apagarSelecionadasEmMassa}
                    className="px-3.5 py-1.5 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-mono font-bold uppercase cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Apagar Selecionadas
                  </button>
                </div>
              </div>
            )}

            <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-[#0a0a0a]">
              {ctosFiltradas.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 font-mono text-xs">
                  Nenhuma caixa encontrada na pesquisa.
                </div>
              ) : (
                ctosFiltradas.slice(0, 100).map((cto) => {
                  const selecionada = idsSelecionados.includes(cto.id);
                  return (
                    <div key={cto.id} className={`p-4 bg-black/40 border rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end transition-all ${selecionada ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : cto.id.startsWith('temp-') ? 'border-emerald-500/50' : 'border-zinc-900'}`}>
                      <div className="md:col-span-1 flex items-center h-full pb-2">
                        <button 
                          type="button" 
                          onClick={() => toggleSelecionarCaixa(cto.id)}
                          className="text-emerald-400 hover:text-emerald-300 cursor-pointer p-1"
                        >
                          {selecionada ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5 text-zinc-600" />}
                        </button>
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-mono uppercase text-zinc-500">Identificação</label>
                        <input type="text" value={cto.identificacao} onChange={(e) => handleAtualizarCtoLocal(cto.id, 'identificacao', e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Empresa / Provedor</label>
                        <input type="text" value={cto.endereco || ''} onChange={(e) => handleAtualizarCtoLocal(cto.id, 'endereco', e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-mono uppercase text-zinc-500">Raio (Metros)</label>
                        <input type="number" value={cto.raio || 300} onChange={(e) => handleAtualizarCtoLocal(cto.id, 'raio', Number(e.target.value))} className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold">GPS</label>
                        <button type="button" onClick={() => abrirModalMapa(cto)} className="w-full py-2 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer">
                          <MapPin className="w-3 h-3" /> PIN
                        </button>
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button type="button" onClick={() => handleRemoverCto(cto.id)} className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer" title="Remover">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {ctosFiltradas.length > 100 && (
                <div className="text-center py-3 text-xs font-mono text-emerald-400 font-bold">
                  Exibindo os primeiros 100 resultados de {ctosFiltradas.length}. Utilize a pesquisa para refinar.
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-black/60 rounded-b-2xl flex justify-between items-center">
               <span className="text-[10px] font-mono text-zinc-500 uppercase">{idsSelecionados.length} selecionadas / {ctosFiltradas.length} exibidas</span>
               <button type="button" onClick={() => setModalListaAberto(false)} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                 Concluir Edição
               </button>
            </div>
          </div>
        </div>
      )}

      {modalMapaAberto && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/40">
              <h3 className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Posicionamento Tático em {cidadeEmpresa}
              </h3>
              <button onClick={() => setModalMapaAberto(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input type="text" value={enderecoBuscaMapa} onChange={(e) => setEnderecoBuscaMapa(e.target.value)} placeholder="Pesquisar rua ou bairro..." className="flex-1 bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500" />
                <button type="button" onClick={handleBuscarEnderecoMapa} disabled={carregandoBusca} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5">
                  {carregandoBusca ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Localizar
                </button>
              </div>
              <div className="relative w-full h-96 bg-[#09090b] border border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg z-10">
                {!RL || !L ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500/70 font-mono text-xs gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" /> Carregando mapa de precisão...
                  </div>
                ) : (
                  <RL.MapContainer 
                    center={[coordsTemp.lat, coordsTemp.lon]} 
                    zoom={19} 
                    maxZoom={21} 
                    minZoom={4}
                    maxBounds={[
                      [-35.0, -75.0], 
                      [6.0, -32.0]    
                    ]}
                    maxBoundsViscosity={1.0}
                    ref={setMapModalInstancia} 
                    style={{ width: '100%', height: '100%', background: '#09090b' }}
                  >
                    <RL.TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" maxZoom={21} maxNativeZoom={20} />
                    
                    {mascaraMundoGeoJson && (
                      <RL.GeoJSON 
                        key="mascara-brasil-cto-modal"
                        data={mascaraMundoGeoJson} 
                        style={{
                          color: '#ef4444',
                          weight: 2,
                          opacity: 0.8,
                          dashArray: '5, 10',
                          fillColor: '#09090b',
                          fillOpacity: 0.95,
                          fillRule: 'evenodd'
                        }} 
                      />
                    )}

                    {iconeLimpoVerde && (
                      <RL.Marker draggable={true} eventHandlers={eventHandlersArrasto} position={[coordsTemp.lat, coordsTemp.lon]} ref={markerRef} icon={iconeLimpoVerde} />
                    )}
                  </RL.MapContainer>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalMapaAberto(false)} className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-mono uppercase font-bold cursor-pointer">Cancelar</button>
                <button type="button" onClick={handleSalvarCoordsCto} className="px-5 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]">Confirmar Posição (Salvar no Lote)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomHandler({ setZoomAtual }: { setZoomAtual: (zoom: number) => void }) {
  const { useMapEvents } = require('react-leaflet');
  useMapEvents({
    zoomend(e: any) {
      setZoomAtual(e.target.getZoom());
    },
    load(e: any) {
      setZoomAtual(e.target.getZoom());
    }
  });
  return null;
}

function ViewportHandler({ setBounds }: { setBounds: (b: any) => void }) {
  const { useMapEvents } = require('react-leaflet');
  const map = useMapEvents({
    moveend() {
      setBounds(map.getBounds());
    },
    zoomend() {
      setBounds(map.getBounds());
    },
    load() {
      setBounds(map.getBounds());
    }
  });
  return null;
}