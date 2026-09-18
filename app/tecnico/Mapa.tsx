"use client"
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Compass, MessageSquare, ExternalLink, X, Calculator, CheckCircle2, XCircle, Send, Menu, Users, Navigation, MapPin } from 'lucide-react';

function CentralizadorMapa({ targetPos }: { targetPos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetPos) {
      map.setView(targetPos, 17, { animate: true });
    }
  }, [targetPos, map]);
  return null;
}

export default function Mapa({ centroMapa, ctos = [], leads = [] }: { centroMapa: [number, number]; ctos?: any[]; leads?: any[] }) {
  const [listaLeads, setListaLeads] = useState<any[]>([]);

  // Sincroniza os leads com o localStorage e filtra apenas os CONVERTIDOS (vendas fechadas)
  useEffect(() => {
    const atualizarLeadsCampo = () => {
      let baseLeads = leads;
      if (typeof window !== 'undefined') {
        const salvos = localStorage.getItem('v5_leads_operacional');
        if (salvos) {
          try {
            const parsed = JSON.parse(salvos);
            baseLeads = leads.map((l: any) => {
              const encontrado = parsed.find((p: any) => p.id === l.id);
              return encontrado ? { ...l, ...encontrado } : l;
            });
          } catch (e) {
            console.error("Erro ao ler leads salvos:", e);
          }
        }
      }
      
      // REGRA DE OURO: Apenas leads onde etapa_funil seja 'CONVERTIDO' vão para o técnico
      const apenasConvertidos = baseLeads.filter((l: any) => l.etapa_funil === 'CONVERTIDO');
      setListaLeads(apenasConvertidos);
    };

    atualizarLeadsCampo();
    window.addEventListener('storage', atualizarLeadsCampo);
    return () => window.removeEventListener('storage', atualizarLeadsCampo);
  }, [leads]);

  const salvarNoStorage = (novaListaCompleta: any[]) => {
    // Atualiza mantendo a regra de exibição e sincroniza com o storage
    if (typeof window !== 'undefined') {
      localStorage.setItem('v5_leads_operacional', JSON.stringify(novaListaCompleta));
    }
    const apenasConvertidos = novaListaCompleta.filter((l: any) => l.etapa_funil === 'CONVERTIDO');
    setListaLeads(apenasConvertidos);
  };

  const [iconeLeadVerde, setIconeLeadVerde] = useState<any>(null);
  const [iconeLeadAmarelo, setIconeLeadAmarelo] = useState<any>(null);
  const [iconeCto, setIconeCto] = useState<any>(null);
  
  const [leadSelecionado, setLeadSelecionado] = useState<any | null>(null);
  const [exibirFormularioNaoFeita, setExibirFormularioNaoFeita] = useState(false);
  const [motivoNaoFeita, setMotivoNaoFeita] = useState('');
  const [rotaAtiva, setRotaAtiva] = useState<{ 
    coordenadas: [number, number][]; 
    distanciaMetros: number; 
    ctoNome: string;
  } | null>(null);

  const [minhaPosicao, setMinhaPosicao] = useState<[number, number] | null>(null);
  const [alvoMapa, setAlvoMapa] = useState<[number, number] | null>(null);

  const [menuAberto, setMenuAberto] = useState(false);
  const [modalListaAberto, setModalListaAberto] = useState(false);

  const [segurandoId, setSegurandoId] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);
  const timerRef = useRef<any>(null);
  const intervaloRef = useRef<any>(null);

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
              background: #0a0a0a !important;
            }
          `;
          document.head.appendChild(style);
        }

        if (!document.getElementById('leaflet-dark-popup')) {
          const stylePopup = document.createElement('style');
          stylePopup.id = 'leaflet-dark-popup';
          stylePopup.innerHTML = `
            .leaflet-popup-content-wrapper {
              background: #121214 !important;
              color: #f4f4f5 !important;
              border: 1px solid #27272a !important;
              border-radius: 12px !important;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5) !important;
            }
            .leaflet-popup-tip {
              background: #121214 !important;
              border: 1px solid #27272a !important;
            }
            .leaflet-container a.leaflet-popup-close-button {
              color: #a1a1aa !important;
              padding: 8px !important;
            }
          `;
          document.head.appendChild(stylePopup);
        }
      } catch (e) {
        console.error("Erro ao injetar estilos do mapa:", e);
      }
    }

    const squareIconVerde = L.divIcon({
      className: 'custom-lead-marker-verde',
      html: `<div style="
        width: 20px;
        height: 20px;
        background-color: #10b981;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px #10b981, 0 0 20px #10b981;
        border-radius: 4px;
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const squareIconAmarelo = L.divIcon({
      className: 'custom-lead-marker-amarelo',
      html: `<div style="
        width: 20px;
        height: 20px;
        background-color: #f59e0b;
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px #f59e0b, 0 0 20px #f59e0b;
        border-radius: 4px;
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const ctoIcon = L.divIcon({
      className: 'custom-cto-marker',
      html: `<div style="
        width: 22px;
        height: 22px;
        background-color: #3b82f6;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px #3b82f6;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
        font-family: monospace;
      ">T</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    setIconeLeadVerde(squareIconVerde);
    setIconeLeadAmarelo(squareIconAmarelo);
    setIconeCto(ctoIcon);
  }, []);

  // Exibe apenas os leads conversões ativas que ainda não foram concluídas pelo técnico
  const leadsAtivosNaTela = listaLeads.filter((l: any) => l.statusOperacional !== 'CONCLUIDA');

  const iniciarToqueLongo = (e: any, lead: any) => {
    e.preventDefault();
    setSegurandoId(lead.id);
    setProgresso(0);

    const tempoTotal = 3000;
    const intervaloAtualizacao = 30;
    const incremento = (intervaloAtualizacao / tempoTotal) * 100;

    intervaloRef.current = setInterval(() => {
      setProgresso((prev) => {
        if (prev >= 100) {
          clearInterval(intervaloRef.current);
          return 100;
        }
        return prev + incremento;
      });
    }, intervaloAtualizacao);

    timerRef.current = setTimeout(() => {
      setSegurandoId(null);
      setProgresso(0);
      ativarFocoLead(lead);
    }, tempoTotal);
  };

  const cancelarToqueLongo = (e?: any) => {
    if (e) e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    setSegurandoId(null);
    setProgresso(0);
  };

  const ativarFocoLead = (lead: any) => {
    setLeadSelecionado(lead);
    setRotaAtiva(null);
    setExibirFormularioNaoFeita(false);
    setMotivoNaoFeita('');
    setModalListaAberto(false);
    setMenuAberto(false);
    if (lead.lat && lead.lon) {
      setAlvoMapa([lead.lat, lead.lon]);
    }
  };

  const irParaClienteMaisProximo = () => {
    if (!leadsAtivosNaTela || leadsAtivosNaTela.length === 0) {
      alert("Nenhum cliente disponível na lista.");
      return;
    }

    const referenciaLat = minhaPosicao ? minhaPosicao[0] : centroMapa[0];
    const referenciaLon = minhaPosicao ? minhaPosicao[1] : centroMapa[1];

    let maisProximo = leadsAtivosNaTela[0];
    let menorDistancia = Infinity;

    leadsAtivosNaTela.forEach((lead) => {
      if (lead.lat && lead.lon) {
        const distancia = Math.hypot(lead.lat - referenciaLat, lead.lon - referenciaLon);
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          maisProximo = lead;
        }
      }
    });

    if (maisProximo && maisProximo.lat && maisProximo.lon) {
      setMenuAberto(false);
      setAlvoMapa([maisProximo.lat, maisProximo.lon]);
    }
  };

  const confirmarInstalacaoFeita = () => {
    if (!leadSelecionado) return;
    
    // Pega o localStorage atual completo para atualizar o item correto
    let salvos = [];
    try {
      salvos = JSON.parse(localStorage.getItem('v5_leads_operacional') || '[]');
    } catch(err) {}

    const novaListaCompleta = leads.map((l: any) => {
      const encontrado = salvos.find((p: any) => p.id === l.id) || l;
      if (l.id === leadSelecionado.id) {
        return { ...encontrado, ...l, statusOperacional: 'CONCLUIDA', motivoPendencia: null };
      }
      return { ...encontrado, ...l };
    });

    salvarNoStorage(novaListaCompleta);
    setLeadSelecionado(null);
    setRotaAtiva(null);
    alert("Instalação registrada como FEITA! O lead foi concluído com sucesso.");
  };

  const enviarMotivoNaoFeita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadSelecionado) return;
    if (!motivoNaoFeita.trim()) {
      alert("Por favor, informe o motivo pelo qual a instalação não foi realizada.");
      return;
    }

    let salvos = [];
    try {
      salvos = JSON.parse(localStorage.getItem('v5_leads_operacional') || '[]');
    } catch(err) {}

    const novaListaCompleta = leads.map((l: any) => {
      const encontrado = salvos.find((p: any) => p.id === l.id) || l;
      if (l.id === leadSelecionado.id) {
        return { ...encontrado, ...l, statusOperacional: 'PENDENTE_ANALISE', motivoPendencia: motivoNaoFeita };
      }
      return { ...encontrado, ...l };
    });

    salvarNoStorage(novaListaCompleta);

    alert(`Justificativa registrada: "${motivoNaoFeita}". O marcador ficou AMARELO para avaliação da central.`);
    setExibirFormularioNaoFeita(false);
    setMotivoNaoFeita('');
    setLeadSelecionado(null);
    setRotaAtiva(null);
  };

  const calcularFibraRuas = async () => {
    if (!leadSelecionado) return;
    if (!ctos || ctos.length === 0) {
      alert("Nenhuma CTO cadastrada para calcular rota.");
      return;
    }

    let melhorCto = null;
    let menorDistanciaRuas = Infinity;
    let melhorGeometriaRota: [number, number][] = [];

    for (let cto of ctos) {
      if (cto.lat && cto.lon) {
        try {
          const url = `https://router.project-osrm.org/route/v1/foot/${leadSelecionado.lon},${leadSelecionado.lat};${cto.lon},${cto.lat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();

          if (data && data.routes && data.routes.length > 0) {
            const rota = data.routes[0];
            const distanciaMetros = rota.distance;

            if (distanciaMetros < menorDistanciaRuas) {
              menorDistanciaRuas = distanciaMetros;
              melhorCto = cto;
              melhorGeometriaRota = rota.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
            }
          }
        } catch (e) {
          console.error(`Erro ao consultar OSRM para a CTO ${cto.identificacao}:`, e);
        }
      }
    }

    if (melhorCto && melhorGeometriaRota.length > 0) {
      setRotaAtiva({
        coordenadas: melhorGeometriaRota,
        distanciaMetros: Math.round(menorDistanciaRuas),
        ctoNome: melhorCto.identificacao,
      });
    } else {
      alert("Não foi possível calcular o roteamento pelas ruas.");
    }
  };

  const abrirWhatsApp = (tel: string, nome: string) => {
    const numeroLimpo = (tel || '61999999999').replace(/\D/g, '');
    const mensagem = encodeURIComponent(`Olá ${nome || 'Cliente'}, aqui é o técnico da V5 Fibra. Estou a caminho para realizar sua instalação.`);
    window.open(`https://wa.me/55${numeroLimpo}?text=${mensagem}`, '_blank');
  };

  const abrirRotaGPS = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  };

  const centralizarMinhaLocalizacao = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMinhaPosicao(pos);
          setAlvoMapa(pos);
        },
        () => {
          alert("Não foi possível obter sua localização atual.");
        }
      );
    } else {
      alert("Geolocalização não é suportada pelo seu navegador.");
    }
  };

  const leadsExibidosNoMapa = leadSelecionado 
    ? leadsAtivosNaTela.filter((l: any) => l.id === leadSelecionado.id)
    : leadsAtivosNaTela;

  return (
    <div className="relative w-full h-full">
      <MapContainer 
        center={centroMapa} 
        zoom={16} 
        zoomControl={false} 
        style={{ width: '100%', height: '100%', background: '#0a0a0a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <CentralizadorMapa targetPos={alvoMapa} />

        {/* CTOs */}
        {ctos.map((cto: any) => {
          if (cto.lat && cto.lon && iconeCto) {
            return (
              <Marker key={cto.id} position={[cto.lat, cto.lon]} icon={iconeCto}>
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff', padding: '4px' }}>
                    <strong style={{ color: '#3b82f6', fontSize: '12px', display: 'block', textTransform: 'uppercase' }}>{cto.identificacao}</strong>
                    <span style={{ color: '#a1a1aa' }}>{cto.endereco || 'Infraestrutura Óptica'}</span>
                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}

        {/* ROTA ATIVA */}
        {rotaAtiva && (
          <Polyline 
            positions={rotaAtiva.coordenadas} 
            pathOptions={{ color: '#10b981', weight: 4, opacity: 0.9, dashArray: '8, 8' }} 
          />
        )}

        {/* LEADS EXIBIDOS (APENAS OS CONVERTIDOS) */}
        {leadsExibidosNoMapa.map((lead: any) => {
          if (lead.lat && lead.lon) {
            const estaSegurando = segurandoId === lead.id;
            const iconeAtivo = lead.statusOperacional === 'PENDENTE_ANALISE' ? iconeLeadAmarelo : iconeLeadVerde;

            if (!iconeAtivo) return null;

            return (
              <Marker key={lead.id} position={[lead.lat, lead.lon]} icon={iconeAtivo}>
                <Popup>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', minWidth: '220px', padding: '6px', color: '#f4f4f5' }}>
                    
                    <div style={{ textTransform: 'uppercase', fontSize: '10px', color: lead.statusOperacional === 'PENDENTE_ANALISE' ? '#f59e0b' : '#10b981', fontWeight: 'bold', marginBottom: '2px' }}>
                      {lead.statusOperacional === 'PENDENTE_ANALISE' ? '⚠️ Instalação Não Realizada (Em Análise)' : 'Venda Fechada (Instalação)'}
                    </div>
                    
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff', borderBottom: '1px solid #27272a', paddingBottom: '6px', marginBottom: '8px' }}>
                      {lead.nome || 'Cliente Instalação'}
                    </div>

                    <div style={{ fontSize: '11px', color: '#d4d4d8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🏠</span> {lead.endereco || 'Endereço não informado'}
                    </div>

                    {lead.motivoPendencia && (
                      <div style={{ fontSize: '10px', color: '#fca5a5', marginBottom: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '4px', borderRadius: '4px' }}>
                        Motivo: {lead.motivoPendencia}
                      </div>
                    )}

                    <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#064e3b', border: '1px solid #059669' }}>
                      <div 
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: estaSegurando ? `${progresso}%` : '0%',
                          backgroundColor: '#10b981',
                          transition: 'width 0.03s linear',
                          zIndex: 1
                        }}
                      />
                      <button
                        onMouseDown={(e) => iniciarToqueLongo(e, lead)}
                        onMouseUp={(e) => cancelarToqueLongo(e)}
                        onMouseLeave={(e) => cancelarToqueLongo(e)}
                        onTouchStart={(e) => iniciarToqueLongo(e, lead)}
                        onTouchEnd={(e) => cancelarToqueLongo(e)}
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ 
                          width: '100%', 
                          backgroundColor: 'transparent', 
                          border: 'none', 
                          color: '#fff', 
                          padding: '9px', 
                          fontSize: '11px', 
                          fontFamily: 'monospace', 
                          fontWeight: 'bold', 
                          cursor: 'pointer', 
                          textAlign: 'center', 
                          textTransform: 'uppercase', 
                          position: 'relative', 
                          zIndex: 2, 
                          userSelect: 'none',
                          outline: 'none',
                          WebkitTouchCallout: 'none'
                        }}
                      >
                        {estaSegurando ? 'Ativando Foco...' : 'Segure para Instalar'}
                      </button>
                    </div>
                    <span style={{ display: 'block', textAlign: 'center', fontSize: '9px', color: '#a1a1aa', marginTop: '4px', fontFamily: 'monospace' }}>
                      Segure 3s para ocultar os outros
                    </span>

                  </div>
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MapContainer>

      {/* BOTÃO FLUTUANTE DE GPS */}
      <button 
        onClick={centralizarMinhaLocalizacao}
        className="absolute bottom-6 right-4 z-[400] bg-zinc-900/90 border border-zinc-700 hover:border-emerald-500 text-emerald-400 p-3 rounded-2xl shadow-xl backdrop-blur transition-all flex items-center justify-center cursor-pointer active:scale-95"
        title="Minha Localização"
      >
        <Compass className="w-5 h-5 animate-pulse" />
      </button>

      {/* MENU FLUTUANTE DE OPÇÕES DE CAMPO */}
      <div className="absolute bottom-6 left-4 z-[400]">
        {menuAberto && (
          <div className="absolute bottom-14 left-0 w-64 bg-zinc-900/95 border border-zinc-700 rounded-2xl p-2 shadow-2xl backdrop-blur-md flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => { setMenuAberto(false); irParaClienteMaisProximo(); }}
              className="w-full bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 font-mono text-[11px] font-bold uppercase p-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all text-left"
            >
              <Navigation className="w-4 h-4 text-emerald-400 shrink-0" /> Cliente Mais Próximo
            </button>

            <button
              onClick={() => { setMenuAberto(false); setModalListaAberto(true); }}
              className="w-full bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-blue-300 font-mono text-[11px] font-bold uppercase p-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all text-left"
            >
              <Users className="w-4 h-4 text-blue-400 shrink-0" /> Lista de Instalações ({leadsAtivosNaTela.length})
            </button>
          </div>
        )}

        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="bg-zinc-900/90 border border-zinc-700 hover:border-emerald-500 text-emerald-400 px-4 py-3 rounded-2xl shadow-xl backdrop-blur flex items-center gap-2 font-mono text-xs uppercase font-bold cursor-pointer transition-all active:scale-95"
        >
          <Menu className="w-4 h-4" /> Opções de Campo
        </button>
      </div>

      {/* MODAL / GAVETA DE LISTA DE CLIENTES */}
      {modalListaAberto && (
        <div className="absolute inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-5 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-white">
                  Lista de Clientes para Instalação
                </h3>
              </div>
              <button 
                onClick={() => setModalListaAberto(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {leadsAtivosNaTela.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                  Nenhuma venda convertida pendente para instalação.
                </div>
              ) : (
                leadsAtivosNaTela.map((lead: any, index: number) => {
                  const estaSegurandoLista = segurandoId === lead.id;

                  return (
                    <div 
                      key={lead.id || index}
                      className="bg-black/40 border border-zinc-800 rounded-xl p-3.5 flex flex-col gap-2.5 hover:border-zinc-700 transition-all"
                    >
                      <div>
                        <span className={`text-[10px] font-mono font-bold uppercase ${lead.statusOperacional === 'PENDENTE_ANALISE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          #{index + 1} — {lead.statusOperacional === 'PENDENTE_ANALISE' ? '⚠️ EM ANÁLISE' : 'VENDA CONVERTIDA'}
                        </span>
                        <h4 className="font-bold text-sm text-white font-sans">{lead.nome || 'Cliente Instalação'}</h4>
                        <p className="text-xs text-zinc-400 font-sans flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" /> {lead.endereco || 'Endereço não informado'}
                        </p>
                      </div>

                      <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#064e3b', border: '1px solid #059669' }}>
                        <div 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: estaSegurandoLista ? `${progresso}%` : '0%',
                            backgroundColor: '#10b981',
                            transition: 'width 0.03s linear',
                            zIndex: 1
                          }}
                        />
                        <button
                          onMouseDown={(e) => iniciarToqueLongo(e, lead)}
                          onMouseUp={(e) => cancelarToqueLongo(e)}
                          onMouseLeave={(e) => cancelarToqueLongo(e)}
                          onTouchStart={(e) => iniciarToqueLongo(e, lead)}
                          onTouchEnd={(e) => cancelarToqueLongo(e)}
                          onContextMenu={(e) => e.preventDefault()}
                          style={{ 
                            width: '100%', 
                            backgroundColor: 'transparent', 
                            border: 'none', 
                            color: '#fff', 
                            padding: '10px', 
                            fontSize: '11px', 
                            fontFamily: 'monospace', 
                            fontWeight: 'bold', 
                            cursor: 'pointer', 
                            textAlign: 'center', 
                            textTransform: 'uppercase', 
                            position: 'relative', 
                            zIndex: 2, 
                            userSelect: 'none',
                            outline: 'none',
                            WebkitTouchCallout: 'none'
                          }}
                        >
                          {estaSegurandoLista ? 'Ativando Foco...' : 'Instalar'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAINEL FLUTUANTE INFERIOR DE ATENDIMENTO */}
      {leadSelecionado && (
        <div className="absolute bottom-4 left-4 right-4 z-[500] bg-zinc-900/95 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">Atendimento em Foco Exclusivo</span>
              <h4 className="font-sans font-bold text-sm text-white">{leadSelecionado.nome || 'Cliente Instalação'}</h4>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">🏠 {leadSelecionado.endereco || 'Endereço não informado'}</p>
            </div>
            <button 
              onClick={() => { setLeadSelecionado(null); setRotaAtiva(null); setExibirFormularioNaoFeita(false); }}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Sair do modo foco"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {exibirFormularioNaoFeita ? (
            <form onSubmit={enviarMotivoNaoFeita} className="mt-3 space-y-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-amber-400 font-bold mb-1">
                  Motivo da Instalação Não Realizada (Ficará Amarelo):
                </label>
                <textarea
                  value={motivoNaoFeita}
                  onChange={(e) => setMotivoNaoFeita(e.target.value)}
                  placeholder="Ex: Cliente ausente, infraestrutura indisponível..."
                  rows={3}
                  className="w-full bg-black/50 border border-zinc-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-sans resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExibirFormularioNaoFeita(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-[10px] font-mono py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase text-[10px] font-mono py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                >
                  <Send className="w-3.5 h-3.5" /> Salvar (Pendente)
                </button>
              </div>
            </form>
          ) : (
            <>
              {rotaAtiva && (
                <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-zinc-800 font-mono text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] block uppercase">CTO Atendimento</span>
                    <span className="text-blue-400 font-bold">{rotaAtiva.ctoNome}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block uppercase">Fibra Necessária</span>
                    <span className="text-emerald-400 font-bold">{rotaAtiva.distanciaMetros} metros</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-3">
                {!rotaAtiva ? (
                  <button
                    onClick={calcularFibraRuas}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs font-mono py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  >
                    <Calculator className="w-4 h-4" /> Calcular Quantidade de Fibra
                  </button>
                ) : (
                  <button
                    onClick={calcularFibraRuas}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-[10px] font-mono py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
                  >
                    <Calculator className="w-3.5 h-3.5" /> Recalcular Fibra por Ruas
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => abrirWhatsApp(leadSelecionado.telefone, leadSelecionado.nome)}
                    className="flex-1 bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/30 text-emerald-400 font-bold uppercase text-[10px] font-mono py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </button>

                  <button
                    onClick={() => abrirRotaGPS(leadSelecionado.lat, leadSelecionado.lon)}
                    className="flex-1 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600/30 text-blue-400 font-bold uppercase text-[10px] font-mono py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir GPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 mt-1">
                  <button
                    onClick={confirmarInstalacaoFeita}
                    className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold uppercase text-[11px] font-mono py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Instalação Feita
                  </button>

                  <button
                    onClick={() => setExibirFormularioNaoFeita(true)}
                    className="bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600 text-amber-300 hover:text-white font-bold uppercase text-[11px] font-mono py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Não Feita
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}