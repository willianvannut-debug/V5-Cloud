"use client"
import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, User, Building2, MapPin, Navigation, Search, Loader2, ArrowRight, ArrowLeft, FileText, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { PasswordStrengthMeter } from '@/components/ui/password-strength';

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

// 🛠️ Atualizado: O mapa agora apenas atualiza as coordenadas, sem mexer no texto do endereço
function ClickHandler({ setCoords }: { setCoords: (c: { lat: number; lon: number }) => void }) {
  useMapEvents({
    click(e) {
      const novasCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
      setCoords(novasCoords);
    }
  });
  return null;
}

// 🛠️ Atualizado: O marcador arrastável também apenas mexe nas coordenadas
function DraggableMarker({ coords, setCoords }: { coords: { lat: number; lon: number }, setCoords: (c: { lat: number; lon: number }) => void }) {
  const markerRef = useRef<any>(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const novasCoords = { lat: latLng.lat, lon: latLng.lng };
          setCoords(novasCoords);
        }
      },
    }),
    [setCoords],
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

function CadastroProvedoraContent() {
  const router = useRouter();

  const [etapa, setEtapa] = useState(1);

  // Etapa 1: Dados
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false);
  const [isSenhaForte, setIsSenhaForte] = useState(false);

  // Etapa 2: Empresa, Mapa
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [enderecoEmpresa, setEnderecoEmpresa] = useState(''); // Começa vazio para o utilizador digitar livremente
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
    if (!isSenhaForte) {
      alert("Sua senha não é forte o suficiente. Cumpra todos os requisitos visuais antes de prosseguir.");
      return;
    }
    if (senha !== confirmaSenha) {
      alert("As senhas não coincidem. Digite novamente.");
      return;
    }
    setEtapa(2);
  };

  // Botão de busca serve apenas para centralizar o mapa na região procurada
  const buscarEnderecoNoMapa = async () => {
    if (!enderecoBusca) return;
    setCarregandoBusca(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBusca)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLon(parseFloat(data[0].lon));
      } else {
        alert("Endereço não encontrado.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoBusca(false);
    }
  };

  // 🚀 ARMAZENAMENTO TEMPORÁRIO LOCAL ANTES DO PAGAMENTO (NÃO CRIA NO SUPABASE AINDA)
  const finalizarCadastro = async () => {
    if (!nomeEmpresa) {
      alert("Informe o nome da sua empresa/provedora.");
      return;
    }
    if (!enderecoEmpresa) {
      alert("Informe o endereço completo da sede.");
      return;
    }
    if (!concordouTermos) {
      alert("Você precisa ler e aceitar os Termos de Uso no botão acima para continuar.");
      return;
    }

    setCarregandoFinalizacao(true);

    try {
      const textoBaseTermo = "V5 Cloud Enterprise Termo de Uso e Contrato de Serviço Versao 1.0 Perfil Gerente";
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(textoBaseTermo);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashDocumento = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const dadosTemporarios = {
        usuario,
        email,
        senha,
        nomeEmpresa,
        enderecoEmpresa,
        lat,
        lon,
        termo_aceito: true,
        termo_versao: '1.0',
        termo_data_aceite: new Date().toISOString(),
        termo_user_agent: navigator.userAgent,
        termo_hash: hashDocumento,
        plano: 'pendente'
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('v5_dados_cadastro_pendente', JSON.stringify(dadosTemporarios));
      }

      setCarregandoFinalizacao(false);
      setSucessoCriacao(true);
      
      setTimeout(() => {
        router.push('/planos');
      }, 2000);

    } catch (err) {
      console.error(err);
      alert("Erro ao preparar os dados de cadastro.");
      setCarregandoFinalizacao(false);
    }
  };

  if (sucessoCriacao) {
    return (
      <div className="min-h-screen bg-[#021708] text-[#f8fafc] font-mono flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-emerald-500/40 w-full max-w-md rounded-2xl p-8 text-center space-y-4 shadow-2xl animate-in fade-in duration-300">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-black uppercase text-white">Dados Registrados com Sucesso!</h1>
          <p className="text-xs text-zinc-400">
            Redirecionando você para a escolha de planos e pagamento seguro...
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
          <h1 className="text-xl font-black uppercase tracking-wider text-white">Crie sua Conta Corporativa</h1>
          <p className="text-xs text-zinc-400">
            {etapa === 1 ? "Etapa 1 de 2: Credenciais do Gerente" : "Etapa 2 de 2: Sede, Mapa e Termos de Uso"}
          </p>
        </div>

        {/* ETAPA 1 */}
        {etapa === 1 && (
          <form onSubmit={avancarParaEtapa2} className="space-y-4 animate-in fade-in duration-200">
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Nome do Gestor
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
                <Mail className="w-3.5 h-3.5 text-emerald-400" /> E-mail de Acesso
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
                {senha.length > 0 && (
                  <div className="pt-2">
                    <PasswordStrengthMeter 
                      value={senha} 
                      onStrengthChange={(isStrong) => setIsSenhaForte(isStrong)} 
                    />
                  </div>
                )}
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
              disabled={senha.length > 0 && !isSenhaForte}
              className={`w-full mt-6 py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                senha.length > 0 && !isSenhaForte
                  ? 'bg-emerald-500/20 text-emerald-900/50 cursor-not-allowed border border-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer'
              }`}
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
              {/* O utilizador digita livremente e o mapa NÃO altera este texto */}
              <input 
                type="text" 
                required
                placeholder="Ex: Quadra 108 Conjunto A Lote 27 Setor 10..."
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
                    <DraggableMarker coords={{ lat, lon }} setCoords={(c) => { setLat(c.lat); setLon(c.lon); }} />
                  )}
                  <ClickHandler setCoords={(c) => { setLat(c.lat); setLon(c.lon); }} />
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
                {carregandoFinalizacao ? <Loader2 className="w-4 h-4 animate-spin" /> : "FINALIZAR E ESCOLHER PLANO"}
              </button>
            </div>

          </div>
        )}

      </div>

      {/* POPUP DOS TERMOS DE USO COMPLETO E ATUALIZADO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#1e3b29] w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Termo de Uso e Contrato de Serviço</h3>
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
              className="w-full h-80 bg-black/90 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 overflow-y-auto space-y-4 select-none leading-relaxed"
            >
              <div className="text-center space-y-1 pb-2 border-b border-zinc-800">
                <p className="font-bold text-emerald-400 text-sm">TERMO DE USO E CONTRATO DE SERVIÇO</p>
                <p className="text-[11px] text-zinc-400">Perfil de Gerente - Administrador da Plataforma</p>
                <p className="text-[10px] text-zinc-500">V5 Cloud Enterprise - Plataforma SaaS de Gestão de Infraestrutura ISP</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">PREÂMBULO</p>
                <p className="mt-1">Este Termo de Uso e Contrato de Serviço regula a relação entre a plataforma V5 Cloud Enterprise (doravante 'V5 Cloud' ou 'Fornecedora') e a Empresa Provedora de Serviços de Internet (doravante 'Contratante' ou 'Gerente'), através do perfil administrativo de Gerente.</p>
                <p className="mt-1">O Gerente é o usuário principal responsável pela administração, supervisão, gestão de acessos e cumprimento de todas as obrigações legais e contratuais relacionadas ao uso da plataforma V5 Cloud Enterprise.</p>
                <p className="mt-1">Ao clicar em 'Aceitar e Criar Conta', o Gerente declara expressa e irrevogavelmente que:</p>
                <p>(i) Leu, compreendeu e concorda integralmente com todas as disposições deste documento;</p>
                <p>(ii) Possui autoridade legal para vincular a Empresa Provedora a este contrato;</p>
                <p>(iii) Reconhece as responsabilidades assumidas e as consequências de violações.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">1. DEFINIÇÃO E ESCOPO DO SERVIÇO</p>
                <p className="font-semibold text-white mt-1">1.1 Descrição do V5 Cloud Enterprise</p>
                <p>O V5 Cloud Enterprise é uma plataforma de Software as a Service (SaaS) desenvolvida especificamente para Provedores de Serviços de Internet (ISPs). O sistema fornece ferramentas digitais para:</p>
                <p>(a) Mapeamento de infraestrutura de rede de fibra óptica (localização de Caixas de Terminação Óptica - CTOs);</p>
                <p>(b) Análise automatizada de viabilidade técnica de cobertura para novos endereços;</p>
                <p>(c) Estimativa de distância para lançamento de cabos de fibra;</p>
                <p>(d) Gestão centralizada de potenciais clientes (leads) e equipes operacionais.</p>

                <p className="font-semibold text-white mt-2">1.2 Acesso e Perfis de Usuário</p>
                <p>A plataforma oferece três níveis de acesso com privilégios diferenciados:</p>
                <p>• <strong>Gerente (Administrador):</strong> Acesso total ao sistema, gestão de equipe, análise de dados, configurações globais;</p>
                <p>• <strong>Atendente:</strong> Acesso restrito a captação de leads e gestão pré-comercial;</p>
                <p>• <strong>Técnico:</strong> Acesso mínimo restrito a dados operacionais de campo (instalação e validação técnica).</p>

                <p className="font-semibold text-white mt-2">1.3 Não Há Garantia de Resultado</p>
                <p>A V5 Cloud fornece exclusivamente as ferramentas tecnológicas para análise e gestão. Os resultados das análises de viabilidade, distâncias estimadas e recomendações técnicas são informações referenciais e não constituem garantia absoluta de viabilidade prática ou sucesso comercial. O sucesso da contratante depende de decisões comerciais, operacionais e técnicas tomadas internamente.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">2. RESPONSABILIDADES DO GERENTE (ADMINISTRADOR)</p>
                <p className="font-semibold text-white mt-1">2.1 Supervisão e Gestão de Acessos</p>
                <p>O Gerente é a única pessoa autorizada a:</p>
                <p>(i) Criar contas de novos usuários (Atendentes e Técnicos);</p>
                <p>(ii) Atribuir níveis de acesso e privilégios apropriados a cada colaborador;</p>
                <p>(iii) Modificar ou revogar acessos quando necessário;</p>
                <p>(iv) Deletar contas de colaboradores desligados ou sem mais necessidade de acesso;</p>
                <p>(v) Monitorar e auditar logs de atividades de todos os colaboradores;</p>
                <p>(vi) Implementar controles internos de segurança e confidencialidade.</p>

                <p className="font-semibold text-white mt-2">2.2 Obrigação de Revogar Acessos Imediatamente</p>
                <p>O Gerente compromete-se a revogar o acesso de qualquer colaborador NO MESMO DIA em que:</p>
                <p>(a) O colaborador seja desligado ou rescindido;</p>
                <p>(b) Mude de cargo ou atribuições;</p>
                <p>(c) Saia da empresa ou tome licença;</p>
                <p>(d) Suspeita-se de qualquer comportamento inadequado ou violação de confidencialidade.</p>
                <p className="mt-1 text-amber-400">O Gerente reconhece que FALHA em revogar acessos oportunamente constitui violação grave deste contrato e responsabiliza-se pessoalmente por toda e qualquer ação ou acesso realizado por ex-colaboradores.</p>

                <p className="font-semibold text-white mt-2">2.3 Monitoramento de Atividades e Logs</p>
                <p>O Gerente é responsável por revisar regularmente (no mínimo semanalmente) os logs de atividades disponibilizados pela V5 Cloud, a fim de identificar comportamentos suspeitos, acessos não autorizados, vazamentos de dados ou qualquer atividade fora dos padrões operacionais normais.</p>
                <p>Em caso de identificação de qualquer atividade anômala, o Gerente compromete-se a:</p>
                <p>(i) Notificar imediatamente a V5 Cloud (dentro de 24 horas);</p>
                <p>(ii) Investigar internamente e tomar medidas disciplinares cabíveis;</p>
                <p>(iii) Cooperar plenamente com investigações de segurança ou incidentes.</p>

                <p className="font-semibold text-white mt-2">2.4 Proteção de Dados e Confidencialidade</p>
                <p>O Gerente é responsável por garantir que todos os colaboradores (Atendentes e Técnicos) sob sua supervisão mantenham sigilo absoluto sobre:</p>
                <p>(a) Dados pessoais de potenciais clientes (leads) - nomes, telefones, endereços;</p>
                <p>(b) Mapa de infraestrutura de rede - localização de CTOs, rotas de fibra, dados estratégicos;</p>
                <p>(c) Informações financeiras e de faturamento;</p>
                <p>(d) Qualquer informação classificada como confidencial pela V5 Cloud.</p>
                <p className="mt-1">O Gerente implementará, no mínimo, as seguintes medidas:</p>
                <p>✓ Assinatura de Termos de Confidencialidade com todos os colaboradores;</p>
                <p>✓ Treinamento regular sobre proteção de dados e LGPD;</p>
                <p>✓ Políticas internas claras sobre compartilhamento de informações;</p>
                <p>✓ Monitoramento de acessos e atividades suspeitas.</p>

                <p className="font-semibold text-white mt-2">2.5 Conformidade com LGPD e Legislação Aplicável</p>
                <p>O Gerente reconhece ser o Controlador dos dados pessoais (potenciais clientes) inseridos na plataforma e assume inteira responsabilidade pelo cumprimento da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), incluindo:</p>
                <p>(i) Obtenção de consentimento legítimo para coleta de dados;</p>
                <p>(ii) Informação clara aos titulares sobre finalidade do uso (análise de viabilidade técnica e contato comercial);</p>
                <p>(iii) Atendimento a solicitações de acesso, correção, exclusão ou bloqueio de dados (direitos LGPD);</p>
                <p>(iv) Notificação imediata à ANPD em caso de incidente de segurança envolvendo dados (conforme prazo legal);</p>
                <p>(v) Manutenção de registros de processamento de dados (por auditoria).</p>
                <p className="mt-1">A V5 Cloud atua exclusivamente como Operadora de dados. O não cumprimento de obrigações LGPD pela contratante resultará em responsabilização exclusiva do Gerente/Empresa Provedora.</p>

                <p className="font-semibold text-white mt-2">2.6 Segurança de Credencial e Senha</p>
                <p>O Gerente é responsável exclusivo pela segurança de sua senha e credenciais de acesso, comprometendo-se a:</p>
                <p>(i) Manter senha complexa (no mínimo 12 caracteres, incluindo letras, números e símbolos);</p>
                <p>(ii) Nunca compartilhar senha com qualquer pessoa, mesmo colegas ou família;</p>
                <p>(iii) Alterar senha periodicamente (mínimo a cada 90 dias);</p>
                <p>(iv) Fazer logout ao término da utilização, especialmente em computadores compartilhados;</p>
                <p>(v) Notificar imediatamente V5 Cloud se suspeitar de comprometimento de sua conta.</p>
                <p className="mt-1">V5 Cloud exime-se de responsabilidade por acessos não autorizados resultantes de falha do Gerente em proteger sua senha.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">3. RESPONSABILIDADE SOLIDÁRIA POR ATOS DE COLABORADORES</p>
                <p className="font-semibold text-white mt-1">3.1 Responsabilidade Integral</p>
                <p>O Gerente/Empresa Provedora assume responsabilidade INTEGRAL e SOLIDÁRIA por toda e qualquer ação, omissão, violação ou infração cometida por seus colaboradores (Atendentes, Técnicos e demais usuários) da plataforma, INDEPENDENTEMENTE de ter conhecimento prévio ou autorização para tal.</p>

                <p className="font-semibold text-white mt-2">3.2 Violações Cobertas pela Responsabilidade Solidária</p>
                <p className="font-bold text-zinc-400 mt-1">(A) VAZAMENTO E COMPARTILHAMENTO DE DADOS:</p>
                <p>• Divulgar nomes, telefones ou endereços de leads para concorrentes ou terceiros;</p>
                <p>• Vender lista de clientes ou informações de viabilidade;</p>
                <p>• Compartilhar mapa de infraestrutura ou localização de CTOs com pessoas não autorizadas;</p>
                <p>• Transferir dados para empresa concorrente ou parceira não autorizada.</p>

                <p className="font-semibold text-white mt-2">(B) VIOLAÇÃO DE CONFIDENCIALIDADE E ACESSO NÃO AUTORIZADO:</p>
                <p>• Compartilhar credenciais de acesso entre usuários;</p>
                <p>• Permitir acesso a terceiros através de sua conta;</p>
                <p>• Tentativa de contornar protocolos de segurança ou privilégios;</p>
                <p>• Engenharia reversa ou tentativa de explorar vulnerabilidades.</p>

                <p className="font-semibold text-white mt-2">(C) USO ABUSIVO E INDEVIDO:</p>
                <p>• Exportação em massa ou cópia não autorizada de bases de dados;</p>
                <p>• Utilizar bots, scripts ou ferramentas automatizadas para extração de dados;</p>
                <p>• Sobrecarga intencional de servidores ou ataques de negação de serviço;</p>
                <p>• Armazenamento de malware, vírus ou qualquer código prejudicial no sistema;</p>
                <p>• Uso para fins ilícitos, fraudulentos ou não autorizados.</p>
                <p className="mt-1 text-red-400">Qualquer violação destas proibições resultará em suspensão imediata e rescisão contratual com justa causa.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">4. CONSEQUÊNCIAS E PENALIDADES POR VIOLAÇÃO</p>
                <p className="font-semibold text-white mt-1">4.1 Direitos da V5 Cloud em Caso de Incidente</p>
                <p>Identificada qualquer violação grave de confidencialidade, vazamento de dados, compartilhamento não autorizado, ou qualquer infração listada na Seção 3.2 acima, a V5 Cloud reserva-se o direito de, cumulativamente:</p>
                <p className="font-bold text-white mt-1">(A) SUSPENSÃO IMEDIATA DE ACESSO:</p>
                <p>Suspender o acesso do Gerente e/ou de todos os usuários da Empresa Provedora à plataforma, sem necessidade de aviso prévio, se houver risco iminente de vazamento, comprometimento de sistema ou segurança de dados.</p>
                <p className="font-bold text-white mt-1">(B) RESCISÃO CONTRATUAL COM JUSTA CAUSA:</p>
                <p>Rescindir imediatamente e sem aviso prévio o contrato/assinatura da Empresa Provedora, sem direito a reembolso proporcionais de qualquer valor já pago ou devido, caso seja confirmada violação grave.</p>
                <p className="font-bold text-white mt-1">(C) MULTA CONTRATUAL:</p>
                <p>Cobrar multa contratual de até 3 (três) vezes o valor da última mensalidade paga, ou valor equivalente aos danos comprovados, conforme tabela abaixo:</p>
                <p>• Vazamento de dados de leads: R$ [definir] ou 3x mensalidade</p>
                <p>• Compartilhamento de infraestrutura com concorrentes: R$ [definir] ou 3x mensalidade</p>
                <p>• Exportação/cópia não autorizada de base de dados: R$ [definir] ou 3x mensalidade</p>
                <p>• Negligência em revogar acesso (ex-funcionário dano): R$ [definir] ou 3x mensalidade</p>
                <p>• Não conformidade LGPD ou notificação atrasada: R$ [definir] ou 3x mensalidade</p>
                <p className="mt-1 text-zinc-400">Nota: O Gerente/Empresa Provedora recebe prévia notificação da multa e tem 30 dias para impugnar ou negociar. Após este prazo, a multa é cobrada automaticamente via meio de pagamento registrado.</p>

                <p className="font-bold text-white mt-2">(D) NOTIFICAÇÃO À ANPD E AUTORIDADES:</p>
                <p>A V5 Cloud notificará a Autoridade Nacional de Proteção de Dados (ANPD) e demais autoridades competentes (polícia civil, delegacia de crimes eletrônicos) sobre qualquer incidente que constitua violação de LGPD ou crime informático, conforme exigido por lei.</p>
                <p className="font-bold text-white mt-1">(E) REMOÇÃO PERMANENTE DE DADOS:</p>
                <p>Todos os dados da Empresa Provedora (mapa de infraestrutura, leads, configurações) serão deletados permanentemente e irrecuperável em até 30 dias após cancelamento por justa causa, sem backup ou possibilidade de recuperação.</p>
                <p className="font-bold text-white mt-1">(F) AÇÃO JUDICIAL:</p>
                <p>A V5 Cloud se reserva o direito de acionar medidas judiciais para:</p>
                <p>• Cobrar indenizações por danos morais e materiais;</p>
                <p>• Requerer medidas cautelares (bloqueio de bens, contas bancárias, etc.);</p>
                <p>• Buscar qualquer outra reparação permitida por lei.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">5. RESPONSABILIDADE SOBRE DADOS E INFRAESTRUTURA</p>
                <p className="font-semibold text-white mt-1">5.1 Responsabilidade pela Precisão de Dados Cadastrados</p>
                <p>A Empresa Provedora é a única e exclusiva responsável pela precisão, atualidade e integridade de TODOS os dados inseridos na plataforma, incluindo:</p>
                <p>• Localização exata das Caixas de Terminação Óptica (CTOs);</p>
                <p>• Rotas de fibra óptica e infraestrutura de rede;</p>
                <p>• Dados de potenciais clientes (leads) inseridos para teste de viabilidade.</p>
                <p className="mt-1">A V5 Cloud exime-se completamente de responsabilidade por:</p>
                <p>❌ Análises de viabilidade incorretas resultantes de dados de infraestrutura imprecisos;</p>
                <p>❌ Estimativas de cabeamento errôneas;</p>
                <p>❌ Perda de vendas ou falhas de instalação presencial;</p>
                <p>❌ Qualquer impacto operacional ou comercial decorrente de dados desatualizados ou equivocados.</p>

                <p className="font-semibold text-white mt-2">5.2 Limitações Técnicas do Sistema</p>
                <p>O Gerente/Empresa Provedora reconhece e aceita que:</p>
                <p>(i) A análise de cobertura fornecida é uma ESTIMATIVA baseada em linha reta no mapa, não considerando obstáculos físicos reais (muros, propriedades privadas, topografia do terreno);</p>
                <p>(ii) O funcionamento depende de APIs e serviços de terceiros (geolocalização, mapeamento, imagens de satélite) que podem estar indisponíveis ou desatualizados;</p>
                <p>(iii) Não há garantia de disponibilidade contínua - o sistema está sujeito a manutenções, oscilações de servidor e restrições de conectividade;</p>
                <p>(iv) V5 Cloud exime-se de qualquer responsabilidade por perdas de vendas, lucros cessantes ou impactos comerciais resultantes de limitações técnicas ou indisponibilidades do sistema.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">6. REGRAS E PROIBIÇÕES DE USO</p>
                <p className="font-semibold text-white mt-1">6.1 Proibições Absolutas</p>
                <p>É terminantemente proibido ao Gerente e à Empresa Provedora:</p>
                <p>🚫 Compartilhar credenciais de acesso com outras pessoas ou empresas;</p>
                <p>🚫 Vender, revender, sublocar ou explorar comercialmente o acesso à plataforma;</p>
                <p>🚫 Usar a plataforma para fins ilícitos, fraudulentos ou não autorizados;</p>
                <p>🚫 Utilizar bots, scripts, web scrapers ou ferramentas automatizadas para extração de dados;</p>
                <p>🚫 Fazer engenharia reversa, descompilar ou tentar explorar vulnerabilidades;</p>
                <p>🚫 Enviar comunicações não solicitadas (spam) através de números de clientes capturados;</p>
                <p>🚫 Armazenar arquivos maliciosos, vírus ou qualquer código prejudicial;</p>
                <p>🚫 Sobrecarregar intencionalmente os servidores ou executar ataques de negação de serviço.</p>
                <p className="mt-1 text-red-400">Qualquer violação destas proibições resultará em suspensão imediata e rescisão contratual com justa causa.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">7. DISPONIBILIDADE DO SERVIÇO E MANUTENÇÃO</p>
                <p className="font-semibold text-white mt-1">7.1 Esforços de Disponibilidade</p>
                <p>A V5 Cloud envidará seus melhores esforços para manter a plataforma disponível e operacional. Contudo, o sistema está sujeito a indisponibilidades temporárias decorrentes de:</p>
                <p>• Manutenção preventiva e corretiva;</p>
                <p>• Atualizações de segurança e performance;</p>
                <p>• Falhas em infraestrutura de terceiros (provedores de nuvem, internet);</p>
                <p>• Eventos de força maior fora do controle da V5 Cloud.</p>

                <p className="font-semibold text-white mt-2">7.2 Sem Responsabilidade por Indisponibilidades</p>
                <p>A V5 Cloud não será responsabilizada por lucros cessantes, perda de receitas, perdas comerciais ou qualquer prejuízo resultante de indisponibilidades temporárias do sistema, mesmo que tenha sido notificada da possibilidade de tais danos.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">8. LIMITAÇÕES DE RESPONSABILIDADE DA V5 CLOUD</p>
                <p className="font-semibold text-white mt-1">8.1 Exclusão de Responsabilidade por Danos Consequenciais</p>
                <p>Em nenhuma circunstância a V5 Cloud, seus diretores, colaboradores ou parceiros serão responsabilizados por quaisquer danos:</p>
                <p>❌ Diretos, indiretos, incidentais, especiais ou consequenciais;</p>
                <p>❌ Perda de lucros, receitas, dados, clientes ou oportunidades de negócio;</p>
                <p>❌ Interrupção de operações ou serviços;</p>
                <p>❌ Qualquer outro prejuízo resultante do uso ou incapacidade de uso da plataforma.</p>

                <p className="font-semibold text-white mt-2">8.2 Limite Máximo de Responsabilidade</p>
                <p>A responsabilidade total da V5 Cloud por qualquer falha, erro ou dano comprovado será estritamente limitada ao valor equivalente a UMA (1) mensalidade paga pela Empresa Provedora no mês imediatamente anterior.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">9. LEGISLAÇÃO APLICÁVEL E FORO</p>
                <p>Este Termo de Uso e Contrato de Serviço é regido e interpretado de acordo com as leis da República Federativa do Brasil, em especial:</p>
                <p>• Lei Geral de Proteção de Dados Pessoais - LGPD (Lei nº 13.709/2018);</p>
                <p>• Marco Civil da Internet (Lei nº 12.965/2014);</p>
                <p>• Lei sobre Crimes Informáticos (Lei nº 12.737/2012);</p>
                <p>• Código Civil Brasileiro (Lei nº 10.406/2002) e demais leis aplicáveis.</p>
                <p className="mt-2">Fica eleito o Foro da Comarca da sede da V5 Cloud para dirimir quaisquer dúvidas, controvérsias, conflitos ou litígios oriundos da utilização do sistema ou da interpretação deste documento, com expressa renúncia pela Empresa Provedora a qualquer outro foro, por mais privilegiado que seja ou venha a ser.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">10. ACEITAÇÃO E VIGÊNCIA</p>
                <p className="font-semibold text-white mt-1">10.1 Aceite Eletrônico Vinculante</p>
                <p>Ao clicar no botão 'Aceitar e Criar Conta', o Gerente/Empresa Provedora declara, sob pena de perjúrio, que:</p>
                <p>(i) Leu integralmente este Termo de Uso e Contrato de Serviço;</p>
                <p>(ii) Compreendeu todas as disposições, obrigações e consequências;</p>
                <p>(iii) Concorda expressa e irrevogavelmente com todas elas;</p>
                <p>(iv) Possui autoridade legal para vincular a Empresa Provedora a este contrato;</p>
                <p>(v) Aceita todas as responsabilidades, multas e consequências aqui descritas.</p>
                <p className="mt-1">Este aceite eletrônico é juridicamente vinculante e equivalente a assinatura de documento físico, conforme legislação brasileira.</p>

                <p className="font-semibold text-white mt-2">10.2 Vigência</p>
                <p>Este contrato entra em vigor no momento da aceitação eletrônica (clique em 'Aceitar') e permanece vigente enquanto a Empresa Provedora mantiver ativa sua assinatura na plataforma V5 Cloud Enterprise.</p>

                <p className="font-semibold text-white mt-2">10.3 Modificações Futuras</p>
                <p>A V5 Cloud reserva-se o direito de modificar este Termo de Uso e Contrato de Serviço a qualquer tempo. Modificações significativas serão comunicadas à Empresa Provedora com no mínimo 30 dias de antecedência. O continuar uso da plataforma após tal período constitui aceite das novas condições.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">11. DISPOSIÇÕES FINAIS</p>
                <p className="font-semibold text-white mt-1">11.1 Contato para Dúvidas e Notificações</p>
                <p>Para quaisquer dúvidas, notificações de incidentes, solicitações de direitos ou exercício de qualquer direito relacionado a este contrato, a Empresa Provedora deverá entrar em contato com:</p>
                <p className="mt-1 text-zinc-300">
                  V5 Cloud Enterprise - Atendimento Legal e Compliance<br />
                  E-mail: [legal@v5cloud.com.br] ou [contato@v5cloud.com.br]<br />
                  Data Protection Officer (DPO): [willianvannut@gmail.com]
                </p>

                <p className="font-semibold text-white mt-2">11.2 Integralidade do Documento</p>
                <p>Este Termo de Uso e Contrato de Serviço, juntamente com a Política de Privacidade, constitui o acordo completo entre as partes. Qualquer acordo anterior, conversa ou promessa não documentada é revogada.</p>

                <p className="font-semibold text-white mt-2">11.3 Severabilidade</p>
                <p>Se alguma disposição deste contrato for considerada inválida ou inaplicável, as demais disposições permanecerão em pleno vigor e efeito.</p>
              </div>

              <div className="pt-4 border-t border-zinc-800 text-center space-y-1">
                <p className="font-bold text-white">V5 Cloud Enterprise</p>
                <p className="text-zinc-400">Termo de Uso e Contrato de Serviço SaaS - Perfil Gerente</p>
                <p className="text-zinc-500 text-[10px]">Versão 1.0 | Data: 20/09/2026</p>
              </div>
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
      <CadastroProvedoraContent />
    </Suspense>
  );
}