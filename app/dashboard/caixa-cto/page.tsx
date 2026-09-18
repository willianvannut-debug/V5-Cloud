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
  ShieldAlert
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

  // 🚀 PLANO DIRETO DA SESSÃO / SUPABASE
  const [planoAtual, setPlanoAtual] = useState<string>('');

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
        console.error("Erro ao buscar plano nas CTOs:", err);
        setPlanoAtual('ERRO');
      }
    }
    sincronizarPlanoReal();
  }, [operador, empresa]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('leaflet'),
        import('react-leaflet')
      ]).then(([leaflet, reactLeaflet]) => {
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

  const iconeNeonQuadrado = useMemo(() => {
    if (!L) return null;
    return L.divIcon({
      className: 'custom-neon-square',
      html: `<div style="
        width: 18px; height: 18px; 
        background-color: #10b981; 
        border: 2px solid #ffffff; 
        box-shadow: 0 0 12px #10b981, 0 0 20px #10b981; 
        border-radius: 3px;
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }, [L]);

  const [listaCtos, setListaCtos] = useState<CtoItemSupabase[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [carregandoBanco, setCarregandoBanco] = useState(true);
  const [importandoKmz, setImportandoKmz] = useState(false);
  const [erroSegurancaKmz, setErroSegurancaKmz] = useState<string | null>(null);

  const [modalMapaAberto, setModalMapaAberto] = useState(false);
  const [ctoEditandoId, setCtoEditandoId] = useState<string | null>(null);
  const [enderecoBuscaMapa, setEnderecoBuscaMapa] = useState('');
  const [coordsTemp, setCoordsTemp] = useState<{ lat: number; lon: number }>({ lat: 0, lon: 0 });
  const [enderecoReverso, setEnderecoReverso] = useState('');
  const [carregandoBusca, setCarregandoBusca] = useState(false);

  const markerRef = useRef<any>(null);
  const [mapModalInstancia, setMapModalInstancia] = useState<any>(null);

  // 🚀 BUSCAR DO BANCO APENAS AS CAIXAS DESTA EMPRESA
  useEffect(() => {
    async function buscarCtosDoBanco() {
      const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
      if (!idDaEmpresa) return;

      try {
        setCarregandoBanco(true);
        const { data, error } = await supabase!
          .from('ctos')
          .select('*')
          .eq('provedor_id', idDaEmpresa);

        if (error) {
          console.warn("Aviso do Supabase:", error.message);
          setListaCtos([]);
        } else if (data) {
          setListaCtos(data);
        }
      } catch (err) {
        console.error("Erro inesperado ao carregar CTOs:", err);
        setListaCtos([]);
      } finally {
        setCarregandoBanco(false);
      }
    }

    buscarCtosDoBanco();
  }, [operador, empresa]);

  useEffect(() => {
    if (settings && coordsTemp.lat === 0 && coordsTemp.lon === 0) {
      setCoordsTemp({
        lat: settings.latEmpresa ?? -15.7553,
        lon: settings.lonEmpresa ?? -48.2778
      });
    }
  }, [settings, coordsTemp.lat, coordsTemp.lon]);

  const buscarEnderecoReverso = useCallback(async (novasCoords: { lat: number; lon: number }) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${novasCoords.lat}&lon=${novasCoords.lon}`);
      const data = await res.json();
      if (data && data.display_name) {
        setEnderecoReverso(data.display_name);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (mapModalInstancia && modalMapaAberto) {
      const timer = setTimeout(() => {
        mapModalInstancia.invalidateSize();
      }, 300);

      const onMapClick = (e: any) => {
        const novasCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
        setCoordsTemp(novasCoords);
        buscarEnderecoReverso(novasCoords);
      };
      
      mapModalInstancia.on('click', onMapClick);
      
      return () => {
        clearTimeout(timer);
        mapModalInstancia.off('click', onMapClick);
      };
    }
  }, [mapModalInstancia, modalMapaAberto, buscarEnderecoReverso]);

  const eventHandlersArrasto = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const novasCoords = { lat: latLng.lat, lon: latLng.lng };
          setCoordsTemp(novasCoords);
          buscarEnderecoReverso(novasCoords);
        }
      },
    }),
    [buscarEnderecoReverso]
  );

  if (!settings) return null;

  const cidadeEmpresa = settings.cidadeEmpresa || 'Águas Lindas de Goiás - GO';
  const latEmpresa = settings.latEmpresa ?? -15.7553;
  const lonEmpresa = settings.lonEmpresa ?? -48.2778;

  const configPlanoAtual = PLANOS[planoAtual];
  const limiteCtos = configPlanoAtual ? configPlanoAtual.max_ctos : "ERRO";
  
  const totalCaixas = listaCtos.length;
  const bateuLimite = typeof limiteCtos === 'number' ? totalCaixas >= limiteCtos : false;
  const porcentagemUso = typeof limiteCtos === 'number' && limiteCtos > 0 ? Math.min((totalCaixas / limiteCtos) * 100, 100) : 0;

  // 🛡️ SEGURANÇA MÁXIMA CONTRA ARQUIVOS FAKES / BOMBAS ZIP (MÁX 5 MEGABYTES)
  const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

  const handleImportarKmzComSeguranca = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErroSegurancaKmz(null);

    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErroSegurancaKmz(`Erro de Segurança: O arquivo excede o limite permitido de 5 MB (Enviado: ${(arquivo.size / (1024 * 1024)).toFixed(2)} MB). Proteção contra arquivos maliciosos ativada.`);
      e.target.value = '';
      return;
    }

    const nomeArquivo = arquivo.name.toLowerCase();
    if (!nomeArquivo.endsWith('.kmz') && !nomeArquivo.endsWith('.kml')) {
      setErroSegurancaKmz('Erro: Formato inválido. Envie estritamente um arquivo de extensão .kmz ou .kml.');
      e.target.value = '';
      return;
    }

    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
    if (!idDaEmpresa) {
      alert("Erro ao identificar sua empresa.");
      e.target.value = '';
      return;
    }

    setImportandoKmz(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evento) => {
        try {
          const conteudoTexto = evento.target?.result as string;
          
          if (conteudoTexto && conteudoTexto.length > 10 * 1024 * 1024) {
            setErroSegurancaKmz('Alerta de Segurança: O conteúdo interno do arquivo XML é excessivamente grande e foi bloqueado.');
            setImportandoKmz(false);
            return;
          }

          const regexPlacemark = /<Placemark>([\s\S]*?)<\/Placemark>/g;
          let match;
          const novasCaixasParaInserir = [];
          let contador = listaCtos.length + 1;

          while ((match = regexPlacemark.exec(conteudoTexto)) !== null && novasCaixasParaInserir.length < 50) {
            const bloco = match[1];
            const nameMatch = /<name>(.*?)<\/name>/.exec(bloco);
            const coordMatch = /<coordinates>(.*?)<\/coordinates>/.exec(bloco);

            if (coordMatch) {
              const coordsStr = coordMatch[1].trim().split(',');
              if (coordsStr.length >= 2) {
                const lon = parseFloat(coordsStr[0]);
                const lat = parseFloat(coordsStr[1]);

                if (!isNaN(lat) && !isNaN(lon)) {
                  const nomeIdentificacao = (nameMatch && nameMatch[1]) ? nameMatch[1].trim() : `CTO-KMZ-${contador++}`;
                  novasCaixasParaInserir.push({
                    provedor_id: idDaEmpresa,
                    identificacao: nomeIdentificacao,
                    endereco: cidadeEmpresa,
                    raio: 300,
                    lat,
                    lon
                  });
                }
              }
            }
          }

          if (novasCaixasParaInserir.length === 0) {
            setErroSegurancaKmz('Nenhuma coordenada válida foi encontrada dentro deste arquivo KMZ/KML.');
            setImportandoKmz(false);
            return;
          }

          if (typeof limiteCtos === 'number' && (listaCtos.length + novasCaixasParaInserir.length) > limiteCtos) {
            alert(`A importação ultrapassará o limite do seu plano (${limiteCtos} caixas). Reduza os pontos no mapa ou faça um upgrade.`);
            setImportandoKmz(false);
            return;
          }

          const { data, error } = await supabase!
            .from('ctos')
            .insert(novasCaixasParaInserir)
            .select();

          if (error) {
            alert("Erro ao salvar caixas importadas no Supabase: " + error.message);
          } else if (data) {
            setListaCtos([...listaCtos, ...data]);
            setSalvo(true);
            setTimeout(() => setSalvo(false), 4000);
          }
        } catch (err) {
          console.error("Erro ao processar estrutura do arquivo:", err);
          setErroSegurancaKmz('Falha ao decodificar o arquivo KMZ. Verifique se o arquivo não está corrompido.');
        } finally {
          setImportandoKmz(false);
          e.target.value = '';
        }
      };

      reader.readAsText(arquivo);

    } catch (err) {
      console.error(err);
      setImportandoKmz(false);
    }
  };

  const handleAdicionarCto = async () => {
    if (bateuLimite) {
      alert(`Limite de caixas CTO (${limiteCtos}) atingido para o plano ${configPlanoAtual?.nome || planoAtual}! Faça o upgrade do seu plano.`);
      return;
    }

    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
    if (!idDaEmpresa) {
      alert("Erro ao identificar sua empresa. Tente recarregar a página.");
      return;
    }

    const novaCtoTemp = {
      provedor_id: idDaEmpresa,
      identificacao: `CTO-0${listaCtos.length + 1}`,
      endereco: cidadeEmpresa,
      raio: 300,
      lat: latEmpresa,
      lon: lonEmpresa
    };

    const { data, error } = await supabase!
      .from('ctos')
      .insert([novaCtoTemp])
      .select();

    if (error) {
      console.error("Erro ao inserir CTO:", error);
      alert("Erro ao salvar nova CTO no banco: " + error.message);
    } else if (data && data[0]) {
      setListaCtos([...listaCtos, data[0]]);
    }
  };

  const handleRemoverCto = async (id: string) => {
    const { error } = await supabase!
      .from('ctos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao deletar CTO:", error);
      alert("Erro ao remover CTO do banco.");
    } else {
      setListaCtos(listaCtos.filter(item => item.id !== id));
    }
  };

  const handleAtualizarCtoLocal = (id: string, campo: keyof CtoItemSupabase, valor: any) => {
    setListaCtos(listaCtos.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const abrirModalMapa = (cto: CtoItemSupabase) => {
    setCtoEditandoId(cto.id);
    setEnderecoBuscaMapa(cto.endereco || cidadeEmpresa);
    setCoordsTemp({
      lat: cto.lat || latEmpresa,
      lon: cto.lon || lonEmpresa
    });
    setEnderecoReverso(cto.endereco || '');
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
        setEnderecoReverso(data[0].display_name);
      } else {
        alert("Endereço não encontrado.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoBusca(false);
    }
  };

  const handleSalvarCoordsCto = async () => {
    if (ctoEditandoId) {
      const ctoAlvo = listaCtos.find(i => i.id === ctoEditandoId);
      if (!ctoAlvo) return;

      const atualizacao = {
        lat: coordsTemp.lat,
        lon: coordsTemp.lon,
        endereco: enderecoReverso || ctoAlvo.endereco
      };

      const { error } = await supabase!
        .from('ctos')
        .update(atualizacao)
        .eq('id', ctoEditandoId);

      if (error) {
        console.error("Erro ao atualizar coordenadas:", error);
        alert("Erro ao gravar coordenadas no banco.");
      } else {
        setListaCtos(listaCtos.map(item => item.id === ctoEditandoId ? { ...item, ...atualizacao } : item));
      }
    }
    setModalMapaAberto(false);
    setCtoEditandoId(null);
  };

  const handleSalvarTudoEmLote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const cto of listaCtos) {
        await supabase!
          .from('ctos')
          .update({
            identificacao: cto.identificacao,
            endereco: cto.endereco,
            raio: cto.raio,
            lat: cto.lat,
            lon: cto.lon
          })
          .eq('id', cto.id);
      }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 4000);
    } catch (err) {
      console.error("Erro ao salvar lote:", err);
      alert("Erro ao salvar alterações no banco.");
    }
  };

  const centroGeral = useMemo(() => {
    if (listaCtos.length > 0 && listaCtos[0].lat && listaCtos[0].lon) {
      return [listaCtos[0].lat, listaCtos[0].lon] as [number, number];
    }
    return [latEmpresa, lonEmpresa] as [number, number];
  }, [listaCtos, latEmpresa, lonEmpresa]);

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">
      
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <style jsx global>{`
        .leaflet-tile-pane,
        .leaflet-tile-pane img,
        .leaflet-layer,
        .leaflet-container {
          filter: none !important;
          -webkit-filter: none !important;
        }
      `}</style>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-emerald-400" /> Gestão de Caixas CTO (Supabase Nuvem)
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Infraestrutura sincronizada em tempo real com banco de dados.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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

      {/* 🛡️ BLOCO DE IMPORTAÇÃO SEGURA DE KMZ COM BLINDAGEM ANTI-BOMBA ZIP */}
      <Card className="border border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" /> Importação Expressa via Google Earth (.KMZ / .KML)
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Envie o projeto de rede para cadastrar caixas em lote automaticamente. <strong className="text-emerald-400">Proteção Ativa:</strong> Limite estrito de 5 MB por arquivo.
            </p>
          </div>

          <div className="w-full md:w-auto">
            <label className={`px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              importandoKmz ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}>
              {importandoKmz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importandoKmz ? 'Analisando e Validando...' : 'Selecionar Arquivo KMZ'}
              <input 
                type="file" 
                accept=".kmz,.kml" 
                onChange={handleImportarKmzComSeguranca} 
                disabled={importandoKmz} 
                className="hidden" 
              />
            </label>
          </div>
        </CardContent>
      </Card>

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

      {/* CARD DE CONSUMO DE CTOs DO PLANO DINÂMICO */}
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
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Caixas Cadastradas ({cidadeEmpresa})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {carregandoBanco ? (
              <div className="p-12 text-center text-emerald-400 font-mono text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Buscando caixas no Supabase...
              </div>
            ) : (!listaCtos || listaCtos.length === 0) ? (
              <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                Nenhuma caixa CTO cadastrada no banco. Importe um arquivo KMZ ou clique em Adicionar Caixa CTO.
              </div>
            ) : (
              <div className="space-y-3">
                {listaCtos.map((cto) => (
                  <div key={cto.id} className="p-4 bg-black/40 border border-zinc-900 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Identificação</label>
                      <input 
                        type="text"
                        value={cto.identificacao}
                        onChange={(e) => handleAtualizarCtoLocal(cto.id, 'identificacao', e.target.value)}
                        placeholder="Ex: CTO-01"
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Endereço / Referência</label>
                      <input 
                        type="text"
                        value={cto.endereco}
                        onChange={(e) => handleAtualizarCtoLocal(cto.id, 'endereco', e.target.value)}
                        placeholder="Preenchido ao marcar no mapa"
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Raio (Metros)</label>
                      <input 
                        type="number"
                        value={cto.raio || 300}
                        onChange={(e) => handleAtualizarCtoLocal(cto.id, 'raio', Number(e.target.value))}
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Localização GPS</label>
                      <button
                        type="button"
                        onClick={() => abrirModalMapa(cto)}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" /> 
                        {cto.lat && cto.lon ? "Alterar PIN no Mapa" : "Posicionar PIN"}
                      </button>
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoverCto(cto.id)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {cto.lat !== undefined && cto.lon !== undefined && (
                      <div className="md:col-span-12 text-[10px] font-mono text-emerald-400 pt-1">
                        ✓ PIN Gravado no Banco: Lat {cto.lat.toFixed(5)}, Lon {cto.lon.toFixed(5)}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MAPA GERAL DE COBERTURA */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" /> Mapa Geral de Cobertura - Satélite HD ({cidadeEmpresa})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="relative w-full h-[480px] bg-[#09090b] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.1)] z-0">
              
              {!RL || !L || carregandoBanco ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500/70 font-mono text-xs gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" /> Carregando mapa de satélite...
                </div>
              ) : (
                <RL.MapContainer 
                  key={`${centroGeral[0]}-${centroGeral[1]}`}
                  center={centroGeral} 
                  zoom={16} 
                  maxZoom={21}
                  style={{ width: '100%', height: '100%', background: '#09090b' }}
                >
                  <RL.TileLayer
                    attribution="&copy; Google"
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    maxZoom={21}
                    maxNativeZoom={20}
                  />
                  {listaCtos.map((cto) => {
                    if (cto.lat !== undefined && cto.lon !== undefined && iconeNeonQuadrado) {
                      return (
                        <RL.Marker key={cto.id} position={[cto.lat, cto.lon]} icon={iconeNeonQuadrado}>
                          <RL.Popup>
                            <div className="font-mono text-xs text-zinc-900 p-1 space-y-1">
                              <strong className="text-emerald-700 block font-black text-sm uppercase">{cto.identificacao}</strong>
                              <span className="font-sans text-zinc-700 block">{cto.endereco || "Sem endereço definido"}</span>
                              <div className="text-[10px] text-zinc-500 font-bold uppercase">Raio: {cto.raio || 300} metros</div>
                            </div>
                          </RL.Popup>
                        </RL.Marker>
                      );
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
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs px-6 py-3 rounded-xl transition-all font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar Alterações em Lote
          </button>
        </div>
      </form>

      {/* MODAL DE POSICIONAMENTO TÁTICO */}
      {modalMapaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/40">
              <h3 className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Posicionamento Tático em {cidadeEmpresa} (Satélite HD)
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
                <button type="button" onClick={handleBuscarEnderecoMapa} disabled={carregandoBusca} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5">
                  {carregandoBusca ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Localizar
                </button>
              </div>

              <p className="text-[11px] text-emerald-400 font-mono">
                🖱️ <strong>Instrução:</strong> Aproxime o máximo que precisar. Arraste o quadrado neon verde para cima do poste correto.
              </p>

              <div className="relative w-full h-96 bg-[#09090b] border border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg z-10">
                
                {!RL || !L ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500/70 font-mono text-xs gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" /> Carregando mapa de precisão...
                  </div>
                ) : (
                  <RL.MapContainer 
                    key={`modal-${coordsTemp.lat}-${coordsTemp.lon}`}
                    center={[coordsTemp.lat, coordsTemp.lon]} 
                    zoom={19} 
                    maxZoom={21}
                    ref={setMapModalInstancia}
                    style={{ width: '100%', height: '100%', background: '#09090b' }}
                  >
                    <RL.TileLayer
                      attribution="&copy; Google"
                      url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                      maxZoom={21}
                      maxNativeZoom={20}
                    />
                    {iconeNeonQuadrado && (
                      <RL.Marker 
                        draggable={true} 
                        eventHandlers={eventHandlersArrasto}
                        position={[coordsTemp.lat, coordsTemp.lon]} 
                        ref={markerRef}
                        icon={iconeNeonQuadrado}
                      />
                    )}
                  </RL.MapContainer>
                )}

              </div>

              <div className="p-3 bg-black/60 border border-zinc-800 rounded-xl space-y-1 font-mono text-xs">
                <div className="text-emerald-400 font-bold">📍 Coordenadas Selecionadas: <span className="text-white">Lat {coordsTemp.lat.toFixed(5)}, Lon {coordsTemp.lon.toFixed(5)}</span></div>
                <div className="text-zinc-400 truncate">🏠 Endereço Identificado: <span className="text-zinc-200">{enderecoReverso || "Aguardando ajuste do marcador..."}</span></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalMapaAberto(false)} className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-mono uppercase font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="button" onClick={handleSalvarCoordsCto} className="px-5 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  Salvar Posição no Banco
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}