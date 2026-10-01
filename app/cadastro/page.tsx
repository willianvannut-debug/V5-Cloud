// ================================================================================
// 📝 PÁGINA DE CADASTRO DE PROVEDORA - V5 CLOUD
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

      {/* POPUP DOS TERMOS DE USO */}
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
                <p className="font-bold text-emerald-400 text-sm">TERMO DE USO E CONTRATO DE SERVIÇO V5 CLOUD</p>
                <p className="text-[11px] text-zinc-400">Perfil de Gerente - Administrador da Plataforma</p>
              </div>
              <div>
                <p className="font-bold text-emerald-400 uppercase">1. OBJETO DO CONTRATO</p>
                <p className="mt-1">O presente instrumento rege a concessão de licença de uso da plataforma SaaS V5 Cloud Enterprise, destinada à gestão de infraestrutura de Provedores de Serviços de Internet (ISP), abrangendo módulos de viabilidade técnica, geolocalização de caixas CTO, CRM comercial e controlo operacional.</p>
              </div>
              <div>
                <p className="font-bold text-emerald-400 uppercase">2. DAS OBRIGAÇÕES DO CONTRATANTE (GESTOR)</p>
                <p className="mt-1">O Gestor compromete-se a fornecer dados verdadeiros, atualizados e precisos no ato do cadastro, incluindo identificação fiscal, coordenadas geográficas da sede e canais válidos de atendimento via WhatsApp e e-mail corporativo. O uso indevido da plataforma ou tentativas de engenharia reversa resultarão no cancelamento imediato da conta sem direito a reembolso.</p>
              </div>
              <div>
                <p className="font-bold text-emerald-400 uppercase">3. DA DISPONIBILIDADE E SUPORTE</p>
                <p className="mt-1">A V5 Cloud empenhar-se-á em manter a plataforma disponível 99,9% do tempo ao longo do mês, ressalvadas paragens programadas para manutenção corretiva ou evolutiva. O suporte técnico prestar-se-á exclusivamente por canais oficiais descritos no painel administrativo.</p>
              </div>
              <div>
                <p className="font-bold text-emerald-400 uppercase">4. PROTEÇÃO DE DADOS (LGPD)</p>
                <p className="mt-1">Ambas as partes obrigam-se a cumprir rigorosamente as diretrizes da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), garantindo o sigilo absoluto sobre leads, rotas de fibra e informações de clientes finais coletadas pelos widgets de viabilidade.</p>
              </div>
              <div className="pt-4 border-t border-zinc-800 text-center space-y-1">
                <p className="font-bold text-white">V5 Cloud Enterprise</p>
                <p className="text-zinc-400">Termo de Uso e Contrato de Serviço SaaS - Versão 1.0</p>
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