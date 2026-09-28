"use client"
import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, User, Building2, MapPin, Navigation, Search, Loader2, ArrowRight, ArrowLeft, FileText, Eye, EyeOff, X, CheckCircle2, KeyRound } from 'lucide-react';
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

  // Etapas: 1 (Credenciais), 1.5 (Código OTP), 2 (Empresa/Mapa/Termos)
  const [etapa, setEtapa] = useState<1 | 1.5 | 2>(1);

  // Etapa 1: Dados
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false);
  const [isSenhaForte, setIsSenhaForte] = useState(false);
  const [carregandoOtp, setCarregandoOtp] = useState(false);

  // Etapa 1.5: Código OTP
  const [codigoOtp, setCodigoOtp] = useState('');
  const [carregandoVerificacao, setCarregandoVerificacao] = useState(false);

  // Etapa 2: Empresa, Mapa
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [enderecoEmpresa, setEnderecoEmpresa] = useState('');
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

  // 🚀 DISPARAR O CÓDIGO OTP APÓS PREENCHER CREDENCIAIS
  const solicitarCodigoVerificacao = async (e: React.FormEvent) => {
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

    setCarregandoOtp(true);
    try {
      const res = await fetch('/api/auth/enviar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Falha ao enviar código.');

      setEtapa(1.5); // Avança para a tela de digitar o código
    } catch (err: any) {
      alert(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setCarregandoOtp(false);
    }
  };

  // 🚀 VALIDAR O CÓDIGO OTP DIGITADO PELO UTILIZADOR
  const validarCodigoOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoOtp || codigoOtp.length < 6) {
      alert("Digite o código completo de 6 dígitos.");
      return;
    }

    setCarregandoVerificacao(true);
    try {
      const res = await fetch('/api/auth/verificar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: codigoOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Código inválido.');

      setEtapa(2); // E-mail verificado com sucesso! Avança para Dados da Empresa
    } catch (err: any) {
      alert(err.message || "Código incorreto ou expirado.");
    } finally {
      setCarregandoVerificacao(false);
    }
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
        
        {/* Cabeçalho dinâmico */}
        <div className="text-center space-y-2 border-b border-[#1e3b29] pb-4">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">Crie sua Conta Corporativa</h1>
          <p className="text-xs text-zinc-400">
            {etapa === 1 && "Etapa 1 de 3: Credenciais do Gerente"}
            {etapa === 1.5 && "Etapa 2 de 3: Validação de E-mail (Código de 6 Dígitos)"}
            {etapa === 2 && "Etapa 3 de 3: Sede, Mapa e Termos de Uso"}
          </p>
        </div>

        {/* ETAPA 1: CREDENCIAIS */}
        {etapa === 1 && (
          <form onSubmit={solicitarCodigoVerificacao} className="space-y-4 animate-in fade-in duration-200">
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
              disabled={carregandoOtp || (senha.length > 0 && !isSenhaForte)}
              className={`w-full mt-6 py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                senha.length > 0 && !isSenhaForte
                  ? 'bg-emerald-500/20 text-emerald-900/50 cursor-not-allowed border border-emerald-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer'
              }`}
            >
              {carregandoOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <>ENVIAR CÓDIGO DE VERIFICAÇÃO <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* ETAPA 1.5: VALIDAÇÃO DE CÓDIGO OTP (6 DÍGITOS) */}
        {etapa === 1.5 && (
          <form onSubmit={validarCodigoOtp} className="space-y-6 animate-in fade-in duration-200 text-center">
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Verifique seu E-mail</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Enviamos um código de verificação de 6 dígitos para <strong className="text-emerald-400">{email}</strong>. Digite abaixo para confirmar sua identidade.
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <input 
                type="text"
                maxLength={6}
                required
                value={codigoOtp}
                onChange={(e) => setCodigoOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-black/80 border border-emerald-500/50 rounded-xl px-4 py-3 text-center text-2xl font-black text-white tracking-[0.5em] focus:outline-none focus:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEtapa(1)}
                className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs uppercase tracking-wider border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Alterar E-mail
              </button>

              <button
                type="submit"
                disabled={carregandoVerificacao || codigoOtp.length < 6}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {carregandoVerificacao ? <Loader2 className="w-4 h-4 animate-spin" /> : "VERIFICAR CÓDIGO"}
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 2: EMPRESA, MAPA E TERMOS */}
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
                required
                placeholder="Ex: Quadra 108 Conjunto A Lote 27 Setor 10..."
                value={enderecoEmpresa}
                onChange={(e) => setEnderecoEmpresa(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
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
                onClick={() => setEtapa(1.5)}
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
                <p className="font-bold text-emerald-400 text-sm">TERMO DE USO E CONTRATO DE SERVIÇO</p>
                <p className="text-[11px] text-zinc-400">Perfil de Gerente - Administrador da Plataforma</p>
                <p className="text-[10px] text-zinc-500">V5 Cloud Enterprise - Plataforma SaaS de Gestão de Infraestrutura ISP</p>
              </div>
              <div>
                <p className="font-bold text-emerald-400 uppercase">PREÂMBULO</p>
                <p className="mt-1">Este Termo de Uso e Contrato de Serviço regula a relação entre a plataforma V5 Cloud Enterprise e a Empresa Provedora de Serviços de Internet...</p>
              </div>
              <div className="pt-4 border-t border-zinc-800 text-center space-y-1">
                <p className="font-bold text-white">V5 Cloud Enterprise</p>
                <p className="text-zinc-400">Termo de Uso e Contrato de Serviço SaaS - Perfil Gerente</p>
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