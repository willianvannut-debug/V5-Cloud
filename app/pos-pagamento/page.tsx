"use client"
import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Mail, User, Building2, MapPin, Navigation, Search, Loader2, ArrowRight, ArrowLeft, AlertTriangle, FileText, Eye, EyeOff, X, CheckCircle2, Rocket } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';

// 🚀 IMPEDE A VERCEL DE FAZER CACHE DESTA PÁGINA
export const dynamicParams = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

function PosPagamentoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  // 🚀 CAPTURA O PLANO EXATO DA URL (essencial, pro, scale, enterprise)
  const planoUrl = searchParams.get('plano') || 'pro';
  const planoComprado = planoUrl.toLowerCase().trim();

  const [etapa, setEtapa] = useState(1);
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [isUpgrade, setIsUpgrade] = useState(false); 

  // Etapa 1: Dados
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false);

  // Etapa 2: Empresa, Mapa
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [enderecoEmpresa, setEnderecoEmpresa] = useState('Ceilândia - DF');
  const [lat, setLat] = useState<number>(-15.8193);
  const [lon, setLon] = useState<number>(-48.1133);
  const [enderecoBusca, setEnderecoBusca] = useState('');
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [iconeNeon, setIconeNeon] = useState<any>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [termoLidoNoModal, setTermoLidoNoModal] = useState(false);
  const [concordouTermos, setConcordouTermos] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const [carregandoFinalizacao, setCarregandoFinalizacao] = useState(false);
  const [sucessoCriacao, setSucessoCriacao] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setAcessoLiberado(false);
    } else {
      setAcessoLiberado(true);
    }
    setVerificando(false);
  }, [sessionId]);

  // 🚀 LÓGICA INTELIGENTE: SEPARA CLIENTES NOVOS DE UPGRADES
  useEffect(() => {
    const processarUpgradeSeguro = async () => {
      if (sessionId && planoComprado) {
        
        let idEmpresaAlvo = searchParams.get('empresa_id') || searchParams.get('empresaId');
        let isLogado = false;

        // Se não tem ID na URL, verifica se já está logado no navegador
        if (!idEmpresaAlvo && typeof window !== 'undefined') {
          try {
            const authStorage = localStorage.getItem('v5_operador') || localStorage.getItem('operador') || localStorage.getItem('empresa');
            if (authStorage) {
              const parsed = JSON.parse(authStorage);
              idEmpresaAlvo = parsed?.empresaId || parsed?.empresa_id || parsed?.id || null;
              if (idEmpresaAlvo) isLogado = true;
            }
          } catch (e) {
            console.error("Erro ao ler dados locais:", e);
          }
        }

        // SE TEM EMPRESA ID OU ESTÁ LOGADO -> É UPGRADE!
        if (idEmpresaAlvo || isLogado) {
          setIsUpgrade(true);
          
          try {
            console.log("⚡ [UPGRADE] Atualizando plano no Supabase. Empresa ID:", idEmpresaAlvo);
            if (supabase && idEmpresaAlvo) {
              await supabase.from('empresas').update({ plano: planoComprado }).eq('id', idEmpresaAlvo);
            }
            await fetch('/api/upgrade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ empresaId: idEmpresaAlvo, plano: planoComprado })
            });
          } catch (e) {
            console.error("Erro no processamento do upgrade:", e);
          }

          const timer = setTimeout(() => {
            router.push('/dashboard'); 
          }, 4000);
          return () => clearTimeout(timer);

        } else {
          // SE NÃO TEM NADA -> É CLIENTE NOVO!
          // Mantém o isUpgrade falso para mostrar o formulário de Cadastro.
          setIsUpgrade(false);
        }
      }
    };
    
    processarUpgradeSeguro();
  }, [sessionId, planoComprado, searchParams, router]);

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
          .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(95%) !important; }
          .leaflet-container { background: #09090b !important; }
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
          html: `<div style="width: 18px; height: 18px; background-color: #10b981; border: 2px solid #ffffff; box-shadow: 0 0 12px #10b981, 0 0 20px #10b981; border-radius: 3px;"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        setIconeNeon(customSquareIcon);
      });
    }
  }, []);

  const handleScrollModal = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (scrollBottom <= 15) {
      setTermoLidoNoModal(true);
    }
  };

  const avancarParaEtapa2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !email || !senha || !confirmaSenha) {
      alert("Preencha todos os campos da Etapa 1.");
      return;
    }
    if (senha !== confirmaSenha) {
      alert("As senhas não coincidem. Digite novamente.");
      return;
    }
    setEtapa(2);
  };

  const buscarEnderecoNoMapa = async () => {
    if (!enderecoBusca) return;
    setCarregandoBusca(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBusca)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLon(parseFloat(data[0].lon));
        setEnderecoEmpresa(data[0].display_name);
      } else {
        alert("Endereço não encontrado.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoBusca(false);
    }
  };

  const buscarEnderecoReverso = async (novasCoords: { lat: number; lon: number }) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${novasCoords.lat}&lon=${novasCoords.lon}`);
      const data = await res.json();
      if (data && data.display_name) {
        setEnderecoEmpresa(data.display_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const finalizarCadastro = async () => {
    if (!nomeEmpresa) {
      alert("Informe o nome da sua empresa/provedora.");
      return;
    }
    if (!concordouTermos) {
      alert("Você precisa ler e aceitar os Termos de Uso no botão acima para continuar.");
      return;
    }

    setCarregandoFinalizacao(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario,
          email,
          senha,
          nomeEmpresa,
          enderecoEmpresa,
          lat,
          lon,
          plano: planoComprado 
        })
      });

      const data = await res.json();

      if (res.ok) {
        setCarregandoFinalizacao(false);
        setSucessoCriacao(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        alert(data.mensagem || "Erro ao registrar os dados.");
        setCarregandoFinalizacao(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão com o servidor.");
      setCarregandoFinalizacao(false);
    }
  };

  if (verificando) {
    return (
      <div className="min-h-screen bg-[#021708] text-white flex items-center justify-center font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!acessoLiberado) {
    return (
      <div className="min-h-screen bg-[#021708] text-[#f8fafc] font-mono flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-red-500/40 w-full max-w-md rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="inline-flex p-3 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-black uppercase text-red-400">Acesso Negado</h1>
          <p className="text-xs text-zinc-400">
            Você tentou acessar uma página protegida sem concluir o pagamento da assinatura.
          </p>
          <button
            onClick={() => router.push('/planos')}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs transition-all cursor-pointer"
          >
            VER PLANOS E ASSINAR
          </button>
        </div>
      </div>
    );
  }

  // 🚀 TELA DE UPGRADE DINÂMICA
  if (isUpgrade) {
    return (
      <div className="min-h-screen bg-[#021708] text-[#f8fafc] font-mono flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-emerald-500/40 w-full max-w-md rounded-2xl p-8 text-center space-y-4 shadow-2xl animate-in fade-in duration-300">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Rocket className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-black uppercase text-white">Upgrade Concluído!</h1>
          <p className="text-xs text-zinc-400">
            Identificamos que você já possui uma conta. Seu plano <strong className="text-emerald-400 uppercase tracking-widest">{planoComprado.toUpperCase()}</strong> foi ativado com sucesso e os novos limites já estão disponíveis!
          </p>
          <p className="text-[10px] text-zinc-500 pt-2">
            Redirecionando de volta para o painel...
          </p>
          <div className="pt-1">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (sucessoCriacao) {
    return (
      <div className="min-h-screen bg-[#021708] text-[#f8fafc] font-mono flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-emerald-500/40 w-full max-w-md rounded-2xl p-8 text-center space-y-4 shadow-2xl animate-in fade-in duration-300">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-black uppercase text-white">Conta Criada com Sucesso!</h1>
          <p className="text-xs text-zinc-400">
            Redirecionando você para a página de login para acessar o painel...
          </p>
          <div className="pt-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021708] text-[#f8fafc] font-mono flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-[#1e3b29] w-full max-w-2xl rounded-2xl p-6 md:p-8 relative shadow-2xl space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2 border-b border-[#1e3b29] pb-4">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">Pagamento Aprovado com Sucesso!</h1>
          <p className="text-xs text-zinc-400">
            {etapa === 1 ? "Etapa 1 de 2: Credenciais do Gerente" : "Etapa 2 de 2: Sede, Mapa e Termos de Uso"}
          </p>
        </div>

        {/* ETAPA 1 */}
        {etapa === 1 && (
          <form onSubmit={avancarParaEtapa2} className="space-y-4 animate-in fade-in duration-200">
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Nome de Usuário (Apelido para o Painel)
              </label>
              <input 
                type="text" 
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> E-mail de Acesso (O mesmo da compra)
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Crie sua Senha
                </label>
                <div className="relative">
                  <input 
                    type={mostrarSenha ? "text" : "password"} 
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Confirme a Senha
                </label>
                <div className="relative">
                  <input 
                    type={mostrarConfirmaSenha ? "text" : "password"} 
                    required
                    value={confirmaSenha}
                    onChange={(e) => setConfirmaSenha(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmaSenha(!mostrarConfirmaSenha)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {mostrarConfirmaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              PRÓXIMA ETAPA: DADOS DA EMPRESA <ArrowRight className="w-4 h-4" />
            </button>

          </form>
        )}

        {/* ETAPA 2 */}
        {etapa === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Nome da Empresa / Provedora
              </label>
              <input 
                type="text" 
                required
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Endereço Completo da Sede
              </label>
              <input 
                type="text" 
                value={enderecoEmpresa}
                onChange={(e) => setEnderecoEmpresa(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Busca no Mapa */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] uppercase text-emerald-400 font-bold flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5" /> Fixar PIN Exato da Sede no Mapa
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={enderecoBusca}
                  onChange={(e) => setEnderecoBusca(e.target.value)}
                  placeholder="Pesquisar endereço para centralizar o mapa..."
                  className="flex-1 bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button 
                  type="button" 
                  onClick={buscarEnderecoNoMapa} 
                  disabled={carregandoBusca}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5"
                >
                  {carregandoBusca ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Buscar
                </button>
              </div>

              {/* Caixa do Mapa Leaflet */}
              <div className="relative w-full h-44 bg-[#09090b] border border-emerald-500/50 rounded-xl overflow-hidden shadow-lg z-10">
                <MapContainer 
                  key={`${lat}-${lon}`}
                  center={[lat, lon]} 
                  zoom={15} 
                  style={{ width: '100%', height: '100%', background: '#09090b' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapResizeFix />
                  {iconeNeon && (
                    <DraggableMarker coords={{ lat, lon }} setCoords={(c) => { setLat(c.lat); setLon(c.lon); }} buscarReverso={buscarEnderecoReverso} />
                  )}
                  <ClickHandler setCoords={(c) => { setLat(c.lat); setLon(c.lon); }} buscarReverso={buscarEnderecoReverso} />
                </MapContainer>
              </div>
            </div>

            {/* BOTÃO PARA ABRIR O POPUP DOS TERMOS */}
            <div className="pt-2 border-t border-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setModalAberto(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> LER TERMOS DE USO E LICENCIAMENTO
                </button>
                <span className={`text-[10px] font-bold ${termoLidoNoModal ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {termoLidoNoModal ? "✅ TERMOS LIDOS" : "⚠️ LEITURA PENDENTE"}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="concordo"
                  disabled={!termoLidoNoModal}
                  checked={concordouTermos}
                  onChange={(e) => setConcordouTermos(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-800 bg-black text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <label htmlFor="concordo" className={`text-[11px] select-none ${!termoLidoNoModal ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-300 cursor-pointer'}`}>
                  Li e concordo com os Termos de Uso e Política de Licenciamento da V5 Cloud.
                </label>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEtapa(1)}
                className="px-4 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs uppercase tracking-wider border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>

              <button
                type="button"
                disabled={carregandoFinalizacao || !concordouTermos}
                onClick={finalizarCadastro}
                className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {carregandoFinalizacao ? <Loader2 className="w-4 h-4 animate-spin" /> : "FINALIZAR E IR PARA O LOGIN"}
              </button>
            </div>

          </div>
        )}

      </div>

      {/* POPUP DOS TERMOS DE USO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#1e3b29] w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Termos de Uso e Licenciamento</h3>
              </div>
              <button 
                onClick={() => setModalAberto(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              ref={modalScrollRef}
              onScroll={handleScrollModal}
              className="w-full h-64 bg-black/90 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 overflow-y-auto space-y-3 select-none"
            >
              <p className="font-bold text-emerald-400">1. CONDIÇÕES DE USO DA V5 CLOUD ENTERPRISE</p>
              <p>Ao utilizar o software V5 Cloud Enterprise, você concorda em cumprir todas as diretrizes operacionais de redes de telecomunicações, em conformidade com as normas da Anatel e leis de proteção de dados (LGPD).</p>
              
              <p className="font-bold text-emerald-400">2. RESPONSABILIDADE DA PROVEDORA</p>
              <p>O administrador (gerente) é inteiramente responsável pelos dados cadastrados, geolocalização da sede e pelas credenciais fornecidas aos colaboradores da equipe.</p>
              
              <p className="font-bold text-emerald-400">3. PAGAMENTOS E ASSINATURAS</p>
              <p>O acesso aos recursos avançados do SaaS permanece ativo mediante confirmação periódica da fatura de assinatura processada via gateway seguro (Stripe).</p>
              
              <p className="font-bold text-emerald-400">4. SUPORTE E ATUALIZAÇÕES</p>
              <p>A V5 Telecom garante atualizações contínuas de segurança e melhorias de interface no layout Dark Green padrão.</p>

              <p className="font-bold text-emerald-400">5. PRIVACIDADE E DADOS DA REDE</p>
              <p>Os dados de mapeamento, coordenadas geográficas e informações de clientes inseridas no sistema são de propriedade exclusiva da provedora contratante, mantendo sigilo absoluto em servidores seguros.</p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-zinc-500">
                {termoLidoNoModal ? "✨ Leitura concluída com sucesso!" : "⬇️ Desça a barra de rolagem até o final para liberar"}
              </span>
              <button
                type="button"
                disabled={!termoLidoNoModal}
                onClick={() => {
                  setConcordouTermos(true);
                  setModalAberto(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                ENTENDI E CONCORDO
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function PosPagamentoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#021708] text-white flex items-center justify-center font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    }>
      <PosPagamentoContent />
    </Suspense>
  );
}