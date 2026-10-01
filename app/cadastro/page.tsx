// ================================================================================
// 📝 PÁGINA DE CADASTRO DE PROVEDORA - V5 CLOUD (COM CONTRATO COMPLETO)
// ================================================================================

"use client"
import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, User, Building2, MapPin, Navigation, Search, Loader2, ArrowRight, ArrowLeft, FileText, Eye, EyeOff, X, CheckCircle2, Phone } from 'lucide-react';
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

function ClickHandler({ setCoords }: { setCoords: (c: { lat: number; lon: number }) => void }) {
  useMapEvents({
    click(e) {
      const novasCoords = { lat: e.latlng.lat, lon: e.latlng.lng };
      setCoords(novasCoords);
    }
  });
  return null;
}

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

  // Etapas: 1 (Credenciais e Contato), 2 (Empresa, CEP, Mapa, Termos)
  const [etapa, setEtapa] = useState<1 | 2>(1);

  // Etapa 1: Dados
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false);
  const [isSenhaForte, setIsSenhaForte] = useState(false);

  // Etapa 2: Empresa, CEP, Mapa
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cepEmpresa, setCepEmpresa] = useState('');
  const [enderecoEmpresa, setEnderecoEmpresa] = useState('');
  const [lat, setLat] = useState<number>(-15.8193);
  const [lon, setLon] = useState<number>(-48.1133);
  const [enderecoBusca, setEnderecoBusca] = useState('');
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [carregandoCep, setCarregandoCep] = useState(false);
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

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.slice(0, 11);
    if (valor.length > 2) valor = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    if (valor.length > 10) valor = `${valor.slice(0, 10)}-${valor.slice(10)}`;
    setWhatsapp(valor);
  };

  const handleCepEmpresaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '');
    setCepEmpresa(valor);

    if (valor.length === 8) {
      setCarregandoCep(true);
      try {
        const res = await fetch(`https://cep.awesomeapi.com.br/json/${valor}`);
        if (res.ok) {
          const dados = await res.json();
          const enderecoCompleto = `${dados.address || ''}, ${dados.district || ''}, ${dados.city || ''} - ${dados.state || ''}`;
          setEnderecoEmpresa(enderecoCompleto);

          const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1`);
          const dataGeo = await resGeo.json();
          if (dataGeo && dataGeo.length > 0) {
            setLat(parseFloat(dataGeo[0].lat));
            setLon(parseFloat(dataGeo[0].lon));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP da empresa:", err);
      } finally {
        setCarregandoCep(false);
      }
    }
  };

  const irParaProximaEtapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !email || !whatsapp || !senha || !confirmaSenha) {
      alert("Preencha todos os campos da Etapa 1, incluindo o WhatsApp.");
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

  const finalizarCadastro = async () => {
    if (!nomeEmpresa) {
      alert("Informe o nome da sua empresa/provedora.");
      return;
    }
    if (!cepEmpresa || cepEmpresa.length < 8) {
      alert("Informe um CEP válido para a sede.");
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
        whatsapp,
        senha,
        nomeEmpresa,
        cepEmpresa,
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
        
        {/* Cabeçalho dinâmico */}
        <div className="text-center space-y-2 border-b border-[#1e3b29] pb-4">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">Crie sua Conta Corporativa</h1>
          <p className="text-xs text-zinc-400">
            {etapa === 1 && "Etapa 1 de 2: Informações de Contato e Credenciais"}
            {etapa === 2 && "Etapa 2 de 2: Sede, Mapa e Termos de Uso"}
          </p>
        </div>

        {/* ETAPA 1: CREDENCIAIS E INFORMAÇÕES DE CONTATO (WHATSAPP) */}
        {etapa === 1 && (
          <form onSubmit={irParaProximaEtapa} className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Nome do Gestor
              </label>
              <input 
                type="text" 
                required
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" /> E-mail de Acesso
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@provedor.com"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp / Contato
                </label>
                <input 
                  type="tel" 
                  required
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  placeholder="(61) 99999-9999"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
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
              <>AVANÇAR PARA SEDE E MAPA <ArrowRight className="w-4 h-4" /></>
            </button>
          </form>
        )}

        {/* ETAPA 2: EMPRESA, CEP, MAPA E TERMOS */}
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
                placeholder="Ex: V5 Fibra"
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[10px] uppercase text-emerald-400 font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> CEP da Sede
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    maxLength={8}
                    required
                    value={cepEmpresa}
                    onChange={handleCepEmpresaChange}
                    placeholder="Ex: 72210000"
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {carregandoCep && (
                    <div className="absolute right-3 top-2.5">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-8 space-y-1">
                <label className="text-[10px] uppercase text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Endereço Completo da Sede
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Preenchido pelo CEP ou ajuste manual"
                  value={enderecoEmpresa}
                  onChange={(e) => setEnderecoEmpresa(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

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

      {/* POPUP DOS TERMOS DE USO COM CONTRATO JURÍDICO COMPLETO */}
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

                <p className="font-semibold text-white mt-2">2.4 Proteção de Dados e Confidencialidade</p>
                <p>O Gerente é responsável por garantir que todos os colaboradores (Atendentes e Técnicos) sob sua supervisão mantenham sigilo absoluto sobre dados pessoais de leads e infraestrutura de rede.</p>

                <p className="font-semibold text-white mt-2">2.5 Conformidade com LGPD e Legislação Aplicável</p>
                <p>O Gerente reconhece ser o Controlador dos dados pessoais inseridos na plataforma e assume inteira responsabilidade pelo cumprimento da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</p>

                <p className="font-semibold text-white mt-2">2.6 Segurança de Credencial e Senha</p>
                <p>O Gerente é responsável exclusivo pela segurança de sua senha e credenciais de acesso, mantendo-as complexas e confidenciais.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">3. RESPONSABILIDADE SOLIDÁRIA POR ATOS DE COLABORADORES</p>
                <p className="font-semibold text-white mt-1">3.1 Responsabilidade Integral</p>
                <p>O Gerente/Empresa Provedora assume responsabilidade INTEGRAL e SOLIDÁRIA por toda e qualquer ação, omissão, violação ou infração cometida por seus colaboradores (Atendentes, Técnicos e demais usuários) da plataforma, INDEPENDENTEMENTE de ter conhecimento prévio ou autorização para tal.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">4. CONSEQUÊNCIAS E PENALIDADES POR VIOLAÇÃO</p>
                <p>Identificada qualquer violação grave de confidencialidade, vazamento de dados ou uso indevido, a V5 Cloud reserva-se o direito de suspender acessos imediatamente, rescindir o contrato com justa causa, aplicar multa contratual, notificar a ANPD e adotar medidas judiciais cabíveis.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">5. RESPONSABILIDADE SOBRE DADOS E INFRAESTRUTURA</p>
                <p>A Empresa Provedora é a única e exclusiva responsável pela precisão, atualidade e integridade de TODOS os dados inseridos na plataforma (como coordenadas de CTOs e rotas de fibra).</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">6. REGRAS E PROIBIÇÕES DE USO</p>
                <p>É terminantemente proibido compartilhar credenciais, vender acessos, utilizar ferramentas automatizadas de extração (scraping) ou realizar engenharia reversa na plataforma.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">7. DISPONIBILIDADE DO SERVIÇO E MANUTENÇÃO</p>
                <p>A V5 Cloud envidará seus melhores esforços para manter a plataforma operacional, estando sujeita a paragens programadas para manutenção e atualizações.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">8. LIMITAÇÕES DE RESPONSABILIDADE DA V5 CLOUD</p>
                <p>A responsabilidade total da V5 Cloud por qualquer falha ou dano comprovado será estritamente limitada ao valor equivalente a UMA (1) mensalidade paga pela Empresa Provedora no mês imediatamente anterior.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">9. LEGISLAÇÃO APLICÁVEL E FORO</p>
                <p>Este contrato rege-se pelas leis da República Federativa do Brasil, elegendo o Foro da Comarca da sede da V5 Cloud para dirimir quaisquer litígios.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">10. ACEITAÇÃO E VIGÊNCIA</p>
                <p>O aceite eletrônico através do clique no botão de consentimento possui validade jurídica equivalente à assinatura física de documento.</p>
              </div>

              <div>
                <p className="font-bold text-emerald-400 uppercase">11. DISPOSIÇÕES FINAIS</p>
                <p>Para dúvidas, notificações ou suporte legal, utilize os canais oficiais de atendimento e conformidade da V5 Cloud Enterprise.</p>
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