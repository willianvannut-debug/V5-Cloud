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

  const [planoAtual, setPlanoAtual] = useState<string>('');

  // 🛡️ FUNÇÃO DE AUDITORIA LEGAL
  const registrarLogAuditoria = useCallback(async (acao: string, entidadeTipo: string, entidadeId?: string, detalhes?: any) => {
    try {
      const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
      await fetch('/api/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operador_email: operador?.email || 'admin@v5.com',
          acao,
          ip: '0.0.0.0',
          empresa_id: idDaEmpresa || null,
          entidade_tipo: entidadeTipo,
          entidade_id: entidadeId || null,
          detalhes: detalhes || {}
        })
      });
    } catch (err) {
      console.error("Erro ao enviar log de auditoria:", err);
    }
  }, [operador, empresa]);

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

  const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

  const handleImportarKmzComSeguranca = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErroSegurancaKmz(null);

    if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
      setErroSegurancaKmz(`Erro de Segurança: O arquivo excede o limite permitido de 5 MB.`);
      e.target.value = '';
      return;
    }

    const nomeArquivo = arquivo.name.toLowerCase();
    if (!nomeArquivo.endsWith('.kmz') && !nomeArquivo.endsWith('.kml')) {
      setErroSegurancaKmz('Erro: Formato inválido.');
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
            setErroSegurancaKmz('Nenhuma coordenada válida encontrada.');
            setImportandoKmz(false);
            return;
          }

          const { data, error } = await supabase!
            .from('ctos')
            .insert(novasCaixasParaInserir)
            .select();

          if (error) {
            alert("Erro ao salvar caixas importadas: " + error.message);
          } else if (data) {
            setListaCtos([...listaCtos, ...data]);
            setSalvo(true);
            setTimeout(() => setSalvo(false), 4000);
            // 🛡️ AUDITORIA
            await registrarLogAuditoria('IMPORTAR_KMZ_CTOS', 'cto', undefined, { total: novasCaixasParaInserir.length });
          }
        } catch (err) {
          console.error(err);
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
      alert(`Limite de caixas atingido.`);
      return;
    }

    const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
    if (!idDaEmpresa) {
      alert("Erro ao identificar empresa.");
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
      alert("Erro ao salvar nova CTO: " + error.message);
    } else if (data && data[0]) {
      setListaCtos([...listaCtos, data[0]]);
      // 🛡️ AUDITORIA DISPARADA COM SUCESSO
      await registrarLogAuditoria('CRIAR_CTO', 'cto', data[0].id, { identificacao: data[0].identificacao });
    }
  };

  const handleRemoverCto = async (id: string) => {
    const { error } = await supabase!
      .from('ctos')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Erro ao remover CTO.");
    } else {
      setListaCtos(listaCtos.filter(item => item.id !== id));
      // 🛡️ AUDITORIA
      await registrarLogAuditoria('EXCLUIR_CTO', 'cto', id);
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
        alert("Erro ao gravar coordenadas.");
      } else {
        setListaCtos(listaCtos.map(item => item.id === ctoEditandoId ? { ...item, ...atualizacao } : item));
        // 🛡️ AUDITORIA
        await registrarLogAuditoria('ATUALIZAR_COORDENADAS_CTO', 'cto', ctoEditandoId, atualizacao);
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
      // 🛡️ AUDITORIA
      await registrarLogAuditoria('ATUALIZAR_LOTE_CTOS', 'cto', undefined, { total_atualizado: listaCtos.length });
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar lote.");
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
                ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {bateuLimite ? <><Rocket className="w-4 h-4" /> Upgrade Necessário</> : <><Plus className="w-4 h-4" /> Adicionar Caixa CTO</>}
          </button>
        </div>
      </div>

      <Card className="border border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" /> Importação Expressa via Google Earth (.KMZ / .KML)
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-1">Limite estrito de 5 MB por arquivo.</p>
          </div>
          <div className="w-full md:w-auto">
            <label className={`px-5 py-3 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              importandoKmz ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}>
              {importandoKmz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importandoKmz ? 'Analisando...' : 'Selecionar Arquivo KMZ'}
              <input type="file" accept=".kmz,.kml" onChange={handleImportarKmzComSeguranca} disabled={importandoKmz} className="hidden" />
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
          <CheckCircle2 className="w-4 h-4" /> Alterações guardadas com sucesso!
        </div>
      )}

      <form onSubmit={handleSalvarTudoEmLote} className="space-y-6">
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Caixas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {carregandoBanco ? (
              <div className="p-12 text-center text-emerald-400 font-mono text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> A carregar caixas do Supabase...
              </div>
            ) : listaCtos.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                Nenhuma caixa CTO registada.
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
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Endereço</label>
                      <input 
                        type="text"
                        value={cto.endereco}
                        onChange={(e) => handleAtualizarCtoLocal(cto.id, 'endereco', e.target.value)}
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Raio (M)</label>
                      <input 
                        type="number"
                        value={cto.raio || 300}
                        onChange={(e) => handleAtualizarCtoLocal(cto.id, 'raio', Number(e.target.value))}
                        className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold">GPS</label>
                      <button
                        type="button"
                        onClick={() => abrirModalMapa(cto)}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Posicionar
                      </button>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoverCto(cto.id)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs px-6 py-3 rounded-xl font-mono flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar Alterações em Lote
          </button>
        </div>
      </form>

      {modalMapaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/40">
              <h3 className="text-xs uppercase font-mono text-emerald-400 font-bold">Posicionamento Tático</h3>
              <button onClick={() => setModalMapaAberto(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={enderecoBuscaMapa}
                  onChange={(e) => setEnderecoBuscaMapa(e.target.value)}
                  className="flex-1 bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
                <button type="button" onClick={handleBuscarEnderecoMapa} className="px-4 py-2.5 rounded-xl bg-zinc-800 text-white font-mono text-xs font-bold cursor-pointer">Localizar</button>
              </div>
              <div className="relative w-full h-96 bg-[#09090b] border border-emerald-500/50 rounded-2xl overflow-hidden z-10">
                {RL && L && (
                  <RL.MapContainer 
                    center={[coordsTemp.lat, coordsTemp.lon]} 
                    zoom={19} 
                    maxZoom={21}
                    ref={setMapModalInstancia}
                    style={{ width: '100%', height: '100%', background: '#09090b' }}
                  >
                    <RL.TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" maxZoom={21} />
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
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalMapaAberto(false)} className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-mono cursor-pointer">Cancelar</button>
                <button type="button" onClick={handleSalvarCoordsCto} className="px-5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-mono font-bold cursor-pointer">Salvar Posição</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}