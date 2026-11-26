"use client"
import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, Building2, MapPin, Navigation, Search, Loader2, ArrowRight, ArrowLeft, FileText, Eye, EyeOff, X, CheckCircle2, Phone, Hash } from 'lucide-react';
import Image from 'next/image';
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
      setCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
    }
  });
  return null;
}

function DraggableMarker({ coords, setCoords }: { coords: { lat: number; lon: number }, setCoords: (c: { lat: number; lon: number }) => void }) {
  const markerRef = useRef<any>(null);
  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latLng = marker.getLatLng();
        setCoords({ lat: latLng.lat, lon: latLng.lng });
      }
    },
  }), [setCoords]);

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[coords.lat, coords.lon]}
      ref={markerRef}
    />
  );
}

function StepIndicator({ etapa }: { etapa: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Credenciais' },
    { n: 2, label: 'Empresa & Sede' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-xs mx-auto">
      {steps.map((step, i) => (
        <React.Fragment key={step.n}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300 ${
              etapa > step.n
                ? 'bg-emerald-500 border-emerald-500 text-black'
                : etapa === step.n
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-zinc-900 border-zinc-700 text-zinc-600'
            }`}>
              {etapa > step.n ? <CheckCircle2 className="w-4 h-4" /> : step.n}
            </div>
            <span className={`text-[9px] uppercase tracking-wider font-bold ${
              etapa >= step.n ? 'text-emerald-400' : 'text-zinc-600'
            }`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all duration-500 ${
              etapa > i + 1 ? 'bg-emerald-500' : 'bg-zinc-800'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-semibold">
        <span className="text-emerald-400">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full bg-black/60 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all";

function CadastroProvedoraContent() {
  const router = useRouter();

  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    html.classList.add('dark');
    return () => { if (!wasDark) html.classList.remove('dark'); };
  }, []);

  const [etapa, setEtapa] = useState<1 | 2>(1);

  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmaSenha, setMostrarConfirmaSenha] = useState(false);
  const [isSenhaForte, setIsSenhaForte] = useState(false);

  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cnpjValido, setCnpjValido] = useState<boolean | null>(null);
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

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`;
    else if (v.length > 8) v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`;
    else if (v.length > 5) v = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`;
    else if (v.length > 2) v = `${v.slice(0,2)}.${v.slice(2)}`;
    setCnpj(v);

    const digits = v.replace(/\D/g, '');
    if (digits.length === 14) {
      setCnpjValido(validarCnpj(digits));
    } else {
      setCnpjValido(null);
    }
  };

  const validarCnpj = (c: string): boolean => {
    if (/^(\d)\1+$/.test(c)) return false;
    const calc = (d: string, x: number) => {
      let sum = 0, pos = x - 7;
      for (let i = x; i >= 1; i--) {
        sum += parseInt(d.charAt(x - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      return sum % 11 < 2 ? 0 : 11 - (sum % 11);
    };
    return calc(c, 12) === parseInt(c[12]) && calc(c, 13) === parseInt(c[13]);
  };

  const handleScrollModal = (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    if (t.scrollHeight - t.scrollTop - t.clientHeight <= 15) setTermoLidoNoModal(true);
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    if (v.length > 10) v = `${v.slice(0,10)}-${v.slice(10)}`;
    setWhatsapp(v);
  };

  const handleCepEmpresaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '');
    setCepEmpresa(v);
    if (v.length === 8) {
      setCarregandoCep(true);
      try {
        const res = await fetch(`https://cep.awesomeapi.com.br/json/${v}`);
        if (res.ok) {
          const d = await res.json();
          const end = `${d.address || ''}, ${d.district || ''}, ${d.city || ''} - ${d.state || ''}`;
          setEnderecoEmpresa(end);
          const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(end)}&limit=1`);
          const gd = await geo.json();
          if (gd?.length > 0) { setLat(parseFloat(gd[0].lat)); setLon(parseFloat(gd[0].lon)); }
        }
      } catch (err) { console.error(err); }
      finally { setCarregandoCep(false); }
    }
  };

  const irParaProximaEtapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !email || !whatsapp || !senha || !confirmaSenha) {
      alert("Preencha todos os campos antes de avançar.");
      return;
    }
    if (!isSenhaForte) {
      alert("Sua senha não é forte o suficiente. Cumpra todos os requisitos antes de prosseguir.");
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
      if (data?.length > 0) { setLat(parseFloat(data[0].lat)); setLon(parseFloat(data[0].lon)); }
      else alert("Endereço não encontrado.");
    } catch (err) { console.error(err); }
    finally { setCarregandoBusca(false); }
  };

  const finalizarCadastro = async () => {
    if (!nomeEmpresa) { alert("Informe o nome da empresa."); return; }
    if (!cnpj || cnpjValido === false) { alert("Informe um CNPJ válido."); return; }
    if (!cepEmpresa || cepEmpresa.length < 8) { alert("Informe um CEP válido."); return; }
    if (!enderecoEmpresa) { alert("Informe o endereço completo."); return; }
    if (!concordouTermos) { alert("Você precisa aceitar os Termos de Uso para continuar."); return; }

    setCarregandoFinalizacao(true);
    try {
      const textoBaseTermo = "V5 Cloud Documentos Legais Versao 1.0 Novembro 2025";
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(textoBaseTermo));
      const hashDocumento = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const dadosTemporarios = {
        usuario, email,
        telefone: whatsapp, whatsapp,
        senha, nomeEmpresa, cnpj,
        cep: cepEmpresa, cepEmpresa, enderecoEmpresa,
        lat, lon,
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
      setTimeout(() => router.push('/planos'), 2000);
    } catch (err) {
      console.error(err);
      alert("Erro ao preparar os dados de cadastro.");
      setCarregandoFinalizacao(false);
    }
  };

  if (sucessoCriacao) {
    return (
      <div className="min-h-screen bg-[#020f07] text-white font-mono flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-emerald-500/40 w-full max-w-md rounded-2xl p-10 text-center space-y-5 shadow-2xl animate-in fade-in duration-300">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-white">Cadastro Concluído!</h1>
            <p className="text-xs text-zinc-400 mt-2">Redirecionando para a escolha do seu plano...</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-mono flex items-center justify-center p-4 py-8 relative">
      {/* Background igual ao login */}
      <div className="fixed inset-0 z-0">
        <Image src="/bg-login.webp" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 bg-black/70 backdrop-blur-md border border-zinc-800/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">

        <div className="px-8 pt-8 pb-6 text-center border-b border-zinc-800/60 space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <Image
              src="/v5-logo-transparent.png"
              alt="V5 Cloud"
              width={110}
              height={82}
              className="drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-white">Conta Corporativa</h1>
            <p className="text-xs text-zinc-400 mt-1 tracking-wide">
              {etapa === 1 ? 'Suas credenciais de acesso' : 'Dados da sua empresa'}
            </p>
          </div>
          <StepIndicator etapa={etapa} />
        </div>

        <div className="px-8 py-6">

          {etapa === 1 && (
            <form onSubmit={irParaProximaEtapa} className="space-y-5 animate-in fade-in duration-200">

              <Field label="Nome do Gestor" icon={<User className="w-3.5 h-3.5" />}>
                <input
                  type="text" required value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="E-mail de Acesso" icon={<Mail className="w-3.5 h-3.5" />}>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@provedor.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="WhatsApp / Contato" icon={<Phone className="w-3.5 h-3.5" />}>
                  <input
                    type="tel" required value={whatsapp}
                    onChange={handleWhatsappChange}
                    placeholder="(61) 99999-9999"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Crie sua Senha" icon={<Lock className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? "text" : "password"} required value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-white cursor-pointer transition-colors">
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {senha.length > 0 && (
                    <div className="pt-1">
                      <PasswordStrengthMeter value={senha} onStrengthChange={(s) => setIsSenhaForte(s)} />
                    </div>
                  )}
                </Field>

                <Field label="Confirme a Senha" icon={<Lock className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <input
                      type={mostrarConfirmaSenha ? "text" : "password"} required value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      className={`${inputClass} pr-10`}
                    />
                    <button type="button" onClick={() => setMostrarConfirmaSenha(!mostrarConfirmaSenha)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-white cursor-pointer transition-colors">
                      {mostrarConfirmaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmaSenha.length > 0 && senha !== confirmaSenha && (
                    <p className="text-[10px] text-red-400 mt-1">As senhas não coincidem</p>
                  )}
                  {confirmaSenha.length > 0 && senha === confirmaSenha && senha.length > 0 && (
                    <p className="text-[10px] text-emerald-400 mt-1">✓ Senhas coincidem</p>
                  )}
                </Field>
              </div>

              <button
                type="submit"
                disabled={senha.length > 0 && !isSenhaForte}
                className={`w-full mt-2 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 ${
                  senha.length > 0 && !isSenhaForte
                    ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-shadow'
                }`}
              >
                AVANÇAR <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-[11px] text-zinc-600 pt-1">
                Já tem conta?{' '}
                <a href="/login" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Fazer login</a>
              </p>
            </form>
          )}

          {etapa === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nome da Empresa / Provedora" icon={<Building2 className="w-3.5 h-3.5" />}>
                  <input
                    type="text" required value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    placeholder="Ex: V5 Fibra Telecomunicações"
                    className={inputClass}
                  />
                </Field>

                <Field label="CNPJ da Empresa" icon={<Hash className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <input
                      type="text" value={cnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0000-00"
                      className={`${inputClass} pr-10 ${
                        cnpjValido === true ? 'border-emerald-500/60' :
                        cnpjValido === false ? 'border-red-500/60' : ''
                      }`}
                    />
                    {cnpjValido === true && (
                      <span className="absolute right-3 top-3 text-emerald-400 text-xs">✓</span>
                    )}
                    {cnpjValido === false && (
                      <span className="absolute right-3 top-3 text-red-400 text-xs">✗</span>
                    )}
                  </div>
                  {cnpjValido === false && (
                    <p className="text-[10px] text-red-400 mt-1">CNPJ inválido — verifique os dígitos</p>
                  )}
                  {cnpjValido === true && (
                    <p className="text-[10px] text-emerald-400 mt-1">✓ CNPJ válido</p>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                  <Field label="CEP da Sede" icon={<MapPin className="w-3.5 h-3.5" />}>
                    <div className="relative">
                      <input
                        type="text" maxLength={8} required value={cepEmpresa}
                        onChange={handleCepEmpresaChange}
                        placeholder="Ex: 72210000"
                        className={inputClass}
                      />
                      {carregandoCep && (
                        <div className="absolute right-3 top-3">
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>
                  </Field>
                </div>
                <div className="md:col-span-8">
                  <Field label="Endereço Completo da Sede" icon={<MapPin className="w-3.5 h-3.5" />}>
                    <input
                      type="text" required value={enderecoEmpresa}
                      onChange={(e) => setEnderecoEmpresa(e.target.value)}
                      placeholder="Preenchido automaticamente pelo CEP"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-semibold">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Localização no Mapa
                </label>
                <div className="flex gap-2">
                  <input
                    type="text" value={enderecoBusca}
                    onChange={(e) => setEnderecoBusca(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarEnderecoNoMapa()}
                    placeholder="Buscar endereço para centralizar..."
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button" onClick={buscarEnderecoNoMapa} disabled={carregandoBusca}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase cursor-pointer flex items-center gap-1.5 border border-zinc-700 transition-colors"
                  >
                    {carregandoBusca ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Buscar
                  </button>
                </div>
                <div className="relative w-full h-44 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg z-10">
                  <MapContainer
                    key={`${lat}-${lon}`}
                    center={[lat, lon]} zoom={15}
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
                <p className="text-[10px] text-zinc-600">Clique no mapa ou arraste o marcador para ajustar a posição exata.</p>
              </div>

              <div className="border border-zinc-700/60 rounded-xl p-4 space-y-3 bg-black/40">
                <div className="flex items-center justify-between">
                  <button
                    type="button" onClick={() => setModalAberto(true)}
                    className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" /> Ler Termos, Privacidade e DPA
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                    termoLidoNoModal
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}>
                    {termoLidoNoModal ? '✓ Lidos' : '⚠ Pendente'}
                  </span>
                </div>

                <label className={`flex items-start gap-3 cursor-pointer select-none group ${!termoLidoNoModal ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <input
                    type="checkbox" id="concordo"
                    disabled={!termoLidoNoModal}
                    checked={concordouTermos}
                    onChange={(e) => setConcordouTermos(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-black text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed accent-emerald-500"
                  />
                  <span className="text-[11px] text-zinc-400 leading-relaxed">
                    Li e concordo com os <span className="text-emerald-400">Termos de Uso</span>, a <span className="text-emerald-400">Política de Privacidade</span> e o <span className="text-emerald-400">DPA</span> da V5 Cloud (V5 FIBRA DE TELECOMUNICAÇÕES LTDA).
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button" onClick={() => setEtapa(1)}
                  className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs uppercase tracking-wider border border-zinc-800 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <button
                  type="button"
                  disabled={carregandoFinalizacao || !concordouTermos}
                  onClick={finalizarCadastro}
                  className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  {carregandoFinalizacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <>FINALIZAR E ESCOLHER PLANO <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Documentos Legais</h3>
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">V5 Cloud · v1.0</span>
              </div>
              <button onClick={() => setModalAberto(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={modalScrollRef}
              onScroll={handleScrollModal}
              className="h-96 overflow-y-auto px-6 py-4 text-xs text-zinc-300 space-y-4 leading-relaxed select-none"
            >
              <div className="text-center space-y-1 pb-3 border-b border-zinc-800">
                <p className="font-bold text-emerald-400 text-sm">DOCUMENTOS LEGAIS — V5 CLOUD</p>
                <p className="text-[11px] text-zinc-400">V5 FIBRA DE TELECOMUNICAÇÕES LTDA | CNPJ 48.928.827/0001-96 | Brasília/DF</p>
                <p className="text-[10px] text-zinc-500">Versão 1.0 — Novembro de 2025</p>
              </div>

              <div><p className="font-bold text-emerald-400 uppercase text-[11px]">1. Termos de Uso</p></div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">1.1 Das Partes</p>
                <p className="mt-1">Contratada: V5 FIBRA DE TELECOMUNICAÇÕES LTDA, CNPJ 48.928.827/0001-96, Brasília/DF. Contratante: a Empresa Provedora cadastrada nesta plataforma (Provedor).</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">1.2 Do Objeto</p>
                <p className="mt-1">A V5 Cloud disponibiliza ao Provedor acesso a uma plataforma SaaS de gestão para provedores de internet, incluindo gestão de clientes, faturamento, ordens de serviço, aplicativos móveis (App Cliente e App Técnico), integração com gateway de pagamento (Asaas) e painel administrativo web.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">1.3 Dos Planos e Preços</p>
                <p className="mt-1">Essencial: R$ 297,00/mês (até 300 assinantes) | Pro: R$ 597,00/mês (até 1.000 assinantes) | Scale: R$ 997,00/mês (até 3.000 assinantes). Valores reajustáveis com aviso prévio de 30 dias.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">1.4 Do Pagamento</p>
                <p className="mt-1">Cobrança mensal antecipada. O não pagamento acarreta: aviso por ticket; suspensão após 5 dias; cancelamento definitivo após 15 dias. Dados excluídos em até 30 dias após cancelamento por inadimplência.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">1.5 Das Responsabilidades</p>
                <p className="mt-1">V5 Cloud: uptime 99%/mês, backup periódico, suporte via ticket (seg–sex 8h–18h), aviso de manutenção com 24h. Provedor: dados atualizados, não compartilhar credenciais, responsável pelas informações cadastradas e pelo uso conforme a LGPD.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">1.6 Da Propriedade Intelectual</p>
                <p className="mt-1">Todo código, interface, marca e funcionalidades são de propriedade exclusiva da V5 FIBRA DE TELECOMUNICAÇÕES LTDA. É vedado copiar, reproduzir, vender ou sublicenciar qualquer parte da plataforma.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">1.7 Do Cancelamento e Foro</p>
                <p className="mt-1">Cancelamento a qualquer momento via ticket, sem reembolso proporcional. 15 dias para exportar dados após cancelamento. Foro eleito: comarca de Brasília/DF.</p>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <p className="font-bold text-emerald-400 uppercase text-[11px]">2. Política de Privacidade</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">2.1 Introdução</p>
                <p className="mt-1">A V5 Cloud está comprometida com a proteção de dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">2.2 Dados Coletados</p>
                <p className="mt-1">Do Provedor: nome, CPF/CNPJ, e-mail, telefone, dados da empresa, faturamento e logs de acesso. Dos Clientes Finais (inseridos pelo Provedor): nome, CPF, endereço, contatos, plano contratado e histórico de pagamentos.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">2.3 Base Legal e Finalidade</p>
                <p className="mt-1">Tratamento com base na execução do contrato (Art. 7, V, LGPD), obrigação legal (Art. 7, II), interesse legítimo (Art. 7, IX) e consentimento (Art. 7, I). Finalidades: prestação dos serviços, faturamento, suporte, melhoria da plataforma e prevenção de fraudes.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">2.4 Compartilhamento e Segurança</p>
                <p className="mt-1">Dados compartilhados com: Asaas (cobranças), Supabase e Vercel (infraestrutura), autoridades competentes quando exigido por lei. A V5 Cloud não vende dados a terceiros. Armazenamento com criptografia SSL/TLS; retenção pelo prazo contratual mais 5 anos.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">2.5 Direitos do Titular</p>
                <p className="mt-1">Acesso, correção, anonimização, bloqueio, eliminação, portabilidade e revogação de consentimento. Solicitações via ticket com resposta em até 15 dias úteis. Contato via suporte no painel.</p>
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <p className="font-bold text-emerald-400 uppercase text-[11px]">3. DPA — Acordo de Processamento de Dados</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">3.1 Papéis</p>
                <p className="mt-1">Controlador: o Provedor, que determina as finalidades do tratamento dos dados de seus clientes finais. Operador: V5 FIBRA DE TELECOMUNICAÇÕES LTDA, que trata os dados exclusivamente por instrução do Controlador.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">3.2 Obrigações do Operador</p>
                <p className="mt-1">Tratar dados somente por instrução do Controlador; garantir confidencialidade; implementar segurança (AES-256 e TLS 1.2+); notificar o Controlador em até 48h sobre incidentes; apoiar no cumprimento dos direitos dos titulares; eliminar dados ao final do contrato.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">3.3 Suboperadores Autorizados</p>
                <p className="mt-1">Supabase Inc. (banco de dados e autenticação), Vercel Inc. (hospedagem e CDN) e Asaas Gestão Financeira (processamento de pagamentos). O Operador notificará o Controlador com 15 dias de antecedência sobre alterações nos suboperadores.</p>
              </div>
              <div>
                <p className="font-bold text-zinc-300 uppercase text-[10px]">3.4 Encerramento</p>
                <p className="mt-1">Ao encerramento: 15 dias para o Controlador exportar seus dados. O Operador excluirá os dados em até 30 dias. Obrigações de confidencialidade permanecem por 5 anos. Lei aplicável: LGPD. Foro: Brasília/DF.</p>
              </div>

              <div className="pt-3 border-t border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 italic">Ao clicar em "ENTENDI E CONCORDO", o Provedor declara ter lido e concordado com os Termos de Uso, a Política de Privacidade e o Acordo de Processamento de Dados acima.</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-900 bg-zinc-950/50">
              <span className="text-[10px] text-zinc-500">
                {termoLidoNoModal ? '✨ Leitura concluída!' : '⬇️ Role até o final para liberar'}
              </span>
              <button
                type="button"
                disabled={!termoLidoNoModal}
                onClick={() => { setConcordouTermos(true); setModalAberto(false); }}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
      <div className="min-h-screen bg-[#020f07] text-white flex items-center justify-center font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    }>
      <CadastroProvedoraContent />
    </Suspense>
  );
}
