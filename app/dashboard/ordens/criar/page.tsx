// ================================================================================
// CRIAR OS - V4 (MAPA COM PIN + COORDENADAS GPS)
// Caminho: app/dashboard/ordens/criar/page.tsx
// ================================================================================

"use client"
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Wrench, Search, Loader2, User, X, XCircle, Plus, CheckCircle2, ArrowLeft, MapPin, Crosshair
} from 'lucide-react';

// Tipos organizados por categoria
const CATEGORIAS = {
  cliente: {
    label: 'Cliente',
    cor: 'text-emerald-400',
    tipos: {
      reparo: 'Reparo',
      troca_equipamento: 'Troca de Equipamento',
      mudanca_endereco: 'Mudança de Endereço',
      retirada: 'Retirada de Equipamento',
    },
  },
  infraestrutura: {
    label: 'Infraestrutura',
    cor: 'text-blue-400',
    tipos: {
      cto_caixa: 'CTO / Caixa de Emenda',
      cabo_rompido: 'Cabo Rompido / Fibra Partida',
      poste_infraestrutura: 'Poste / Infraestrutura Aérea',
      equipamento_rede: 'Equipamento de Rede (Switch, OLT, etc.)',
    },
  },
  outros: {
    label: 'Outros',
    cor: 'text-amber-400',
    tipos: {
      manutencao_preventiva: 'Manutenção Preventiva',
      vistoria: 'Vistoria Técnica',
      outros: 'Outros',
    },
  },
};

// Mapa plano para lookup rápido
const TODOS_TIPOS: Record<string, string> = {};
const TIPO_PARA_CATEGORIA: Record<string, string> = {};
Object.entries(CATEGORIAS).forEach(([catKey, cat]) => {
  Object.entries(cat.tipos).forEach(([tipoKey, tipoLabel]) => {
    TODOS_TIPOS[tipoKey] = tipoLabel;
    TIPO_PARA_CATEGORIA[tipoKey] = catKey;
  });
});

// Tipos que exigem cliente
const TIPOS_CLIENTE_OBRIGATORIO = ['reparo', 'troca_equipamento', 'mudanca_endereco', 'retirada'];


// ==================== COMPONENTE MAPA LEAFLET (dynamic, SSR off) ====================
const MapaPinComponent = dynamic(() => Promise.resolve(MapaPin), { ssr: false });

function MapaPin({ latitude, longitude, onChange }: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (mapRef.current) return;

      const defaultLat = latitude || -15.7801;
      const defaultLng = longitude || -47.9292;
      const defaultZoom = latitude ? 16 : 4;

      const map = L.map(mapContainerRef.current!, {
        center: [defaultLat, defaultLng],
        zoom: defaultZoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '\u00a9 OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      if (latitude && longitude) {
        markerRef.current = L.marker([latitude, longitude]).addTo(map);
      }

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
        onChange(lat, lng);
      });

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={mapContainerRef} className="w-full h-[280px] rounded-lg border border-zinc-800 overflow-hidden" />
  );
}

export default function CriarOSPage() {
  const router = useRouter();
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  // Form
  const [tipo, setTipo] = useState('reparo');
  const [prioridade, setPrioridade] = useState('media');
  const [descricao, setDescricao] = useState('');
  const [tecnicosIds, setTecnicosIds] = useState<string[]>([]);
  const [agendadaPara, setAgendadaPara] = useState('');
  const [localizacao, setLocalizacao] = useState('');

  // Coordenadas do mapa
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mostrarPin, setMostrarPin] = useState(false);

  const toggleTecnico = (id: string) => {
    setTecnicosIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  // Busca cliente
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientesBusca, setClientesBusca] = useState<any[]>([]);
  const [clienteSel, setClienteSel] = useState<any>(null);
  const [buscandoCli, setBuscandoCli] = useState(false);

  const categoriaAtual = TIPO_PARA_CATEGORIA[tipo] || 'cliente';
  const exigeCliente = TIPOS_CLIENTE_OBRIGATORIO.includes(tipo);
  const exibeLocalizacao = !exigeCliente; // Infra e Outros mostram campo de localização

  useEffect(() => {
    const carregarTecnicos = async () => {
      try {
        const res = await fetch('/api/tecnicos');
        if (res.ok) {
          const data = await res.json();
          setTecnicos(Array.isArray(data) ? data : []);
        }
      } catch (e) {}
    };
    carregarTecnicos();
  }, []);

  // Autocomplete cliente
  useEffect(() => {
    if (buscaCliente.length < 2) { setClientesBusca([]); return; }
    const t = setTimeout(async () => {
      setBuscandoCli(true);
      try {
        const res = await fetch(`/api/clientes?busca=${encodeURIComponent(buscaCliente)}&limit=5`);
        if (res.ok) {
          const d = await res.json();
          setClientesBusca(Array.isArray(d) ? d : d.clientes || []);
        }
      } catch (e) {}
      setBuscandoCli(false);
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  const handleMapChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const removerPin = () => {
    setLatitude(null);
    setLongitude(null);
  };

  const alternarMostrarPin = (marcado: boolean) => {
    setMostrarPin(marcado);
    if (!marcado) {
      setLatitude(null);
      setLongitude(null);
    }
  };

  const criarOS = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!tipo) { setErro('Selecione o tipo da OS'); return; }
    if (exigeCliente && !clienteSel) { setErro('Selecione o cliente para este tipo de OS'); return; }
    if (exibeLocalizacao && !clienteSel && !localizacao.trim()) { setErro('Informe a localização ou selecione um cliente'); return; }
    if (tecnicosIds.length === 0) { setErro('Escolha pelo menos um técnico para a OS'); return; }
    if (!descricao.trim()) { setErro('Preencha a descrição do problema'); return; }

    setSalvando(true);
    try {
      const res = await fetch('/api/ordens-servico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          cliente_id: clienteSel?.id || null,
          descricao: descricao || null,
          prioridade,
          tecnico_id: tecnicosIds[0] || null,
          tecnicos_ids: tecnicosIds,
          agendada_para: agendadaPara || null,
          endereco: localizacao || null,
          latitude: latitude || null,
          longitude: longitude || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Erro ao criar OS'); return; }

      setSucesso(true);
      setTimeout(() => {
        router.push('/dashboard/ordens/status');
      }, 1500);
    } catch (e) {
      setErro('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-black uppercase font-mono text-white">OS Criada!</h2>
          <p className="text-sm text-zinc-400 font-mono">Redirecionando para Status OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/ordens/status')}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-2.5 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Wrench className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
              Criar Ordem de Servico
            </h1>
          </div>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={criarOS} className="space-y-6">

          {/* TIPO (com categorias) + PRIORIDADE */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Tipo *</label>
                <select value={tipo} onChange={(e) => { setTipo(e.target.value); setErro(''); }}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                  {Object.entries(CATEGORIAS).map(([catKey, cat]) => (
                    <optgroup key={catKey} label={`── ${cat.label} ──`}>
                      {Object.entries(cat.tipos).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-[10px] font-mono mt-1.5">
                  <span className={CATEGORIAS[categoriaAtual as keyof typeof CATEGORIAS]?.cor}>
                    {CATEGORIAS[categoriaAtual as keyof typeof CATEGORIAS]?.label}
                  </span>
                  {exigeCliente && <span className="text-zinc-600"> · Cliente obrigatório</span>}
                  {!exigeCliente && <span className="text-zinc-600"> · Cliente opcional</span>}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Prioridade</label>
                <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer">
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* CLIENTE */}
          <div className="relative z-50 border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">
              Cliente {exigeCliente ? '*' : '(Opcional)'}
            </label>
            {clienteSel ? (
              <div className="bg-black/50 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold">{clienteSel.nome}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {clienteSel.cpf} · {clienteSel.bairro}{clienteSel.cidade ? `, ${clienteSel.cidade}` : ''}
                  </p>
                  {clienteSel.telefone && (
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{clienteSel.telefone}</p>
                  )}
                </div>
                <button type="button" onClick={() => { setClienteSel(null); setBuscaCliente(''); }}
                  className="text-zinc-400 hover:text-white cursor-pointer p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="text" value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Digite o nome ou CPF do cliente..."
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50" />
                {buscandoCli && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />}
                {clientesBusca.length > 0 && (
                  <div className="absolute z-[100] w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                    {clientesBusca.map((c: any) => (
                      <button key={c.id} type="button"
                        onClick={() => { setClienteSel(c); setBuscaCliente(''); setClientesBusca([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800/50 last:border-0">
                        <p className="text-sm text-white font-bold">{c.nome}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{c.cpf} · {c.bairro}{c.cidade ? `, ${c.cidade}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LOCALIZAÇÃO (para infra e outros sem cliente) */}
          {exibeLocalizacao && !clienteSel && (
            <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
              <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Localização *
              </label>
              <input type="text" value={localizacao} onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Ex: Rua das Flores, 123 - próximo ao poste 45, Bairro Centro..."
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50" />
              <p className="text-[10px] font-mono text-zinc-600 mt-2">
                Informe o endereço ou ponto de referência do problema
              </p>
            </div>
          )}


          {/* ==================== PIN NO MAPA (OPCIONAL) ==================== */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mostrarPin}
                onChange={(e) => alternarMostrarPin(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1.5">
                <Crosshair className="w-3 h-3" /> Colocar pin no mapa (opcional)
              </span>
            </label>
            <p className="text-[10px] font-mono text-zinc-600 mt-1.5 ml-6">
              Marque esta opção se quiser indicar a localização exata para o técnico navegar via GPS. Se não marcar, a OS é criada normalmente, sem pin.
            </p>

            {mostrarPin && (
              <div className="mt-4">
                <p className="text-[10px] font-mono text-zinc-600 mb-3">
                  Clique no mapa para marcar a localização exata. O técnico usará essas coordenadas para navegar.
                </p>

                <MapaPinComponent
                  latitude={latitude}
                  longitude={longitude}
                  onChange={handleMapChange}
                />

                {latitude && longitude ? (
                  <div className="mt-3 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        Pin definido: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </span>
                    </div>
                    <button type="button" onClick={removerPin}
                      className="text-zinc-400 hover:text-red-400 cursor-pointer p-1 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-mono text-amber-400">
                      Nenhum pin colocado ainda — clique no mapa acima
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DESCRICAO */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Descricao do Problema *</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder={exigeCliente
                ? "Ex: Cliente relata conexao instavel desde ontem, sinal caindo frequentemente..."
                : "Ex: CTO da Rua X danificada por queda de arvore, 15 clientes afetados..."
              }
              rows={4}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none" />
          </div>

          {/* TECNICOS (multi-select) */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">
              Técnicos * <span className="text-zinc-600 normal-case">(selecione um ou mais)</span>
            </label>

            {/* Tags dos selecionados */}
            {tecnicosIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tecnicosIds.map(id => {
                  const tec = tecnicos.find(t => t.id === id);
                  return tec ? (
                    <span key={id} className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full">
                      <User className="w-3 h-3" /> {tec.nome}
                      <button type="button" onClick={() => toggleTecnico(id)} className="hover:text-white ml-0.5 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {/* Lista de técnicos com checkbox */}
            <div className="bg-black/50 border border-zinc-800 rounded-lg max-h-40 overflow-y-auto">
              {tecnicos.length === 0 ? (
                <p className="text-xs text-zinc-600 font-mono p-3 text-center">Nenhum técnico cadastrado</p>
              ) : (
                tecnicos.map((t: any) => {
                  const selecionado = tecnicosIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleTecnico(t.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer border-b border-zinc-800/50 last:border-0 transition-colors ${
                        selecionado ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/50'
                      }`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        selecionado ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
                      }`}>
                        {selecionado && <CheckCircle2 className="w-3 h-3 text-black" />}
                      </div>
                      <span className={`text-sm font-mono ${selecionado ? 'text-emerald-400 font-bold' : 'text-zinc-300'}`}>
                        {t.nome}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-[10px] font-mono text-zinc-600 mt-2">
              {tecnicosIds.length === 0 ? 'Nenhum técnico selecionado' : `${tecnicosIds.length} técnico${tecnicosIds.length > 1 ? 's' : ''} selecionado${tecnicosIds.length > 1 ? 's' : ''}`}
            </p>
          </div>

          {/* AGENDAMENTO */}
          <div className="relative z-0 border border-zinc-900 bg-zinc-900/40 rounded-xl p-5">
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-2">Agendar Para</label>
            <input type="datetime-local" value={agendadaPara} onChange={(e) => setAgendadaPara(e.target.value)}
              className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 cursor-pointer" />
            <p className="text-[10px] font-mono text-zinc-600 mt-3">
              Se atribuir tecnico e agendar, a OS ja nasce como "Agendada"
            </p>
          </div>

          {/* ERRO */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs font-mono text-red-400">{erro}</span>
            </div>
          )}

          {/* BOTOES */}
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/dashboard/ordens/status')}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono font-bold uppercase text-xs py-3 rounded-lg transition-colors cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {salvando ? 'Criando...' : 'Criar OS'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
