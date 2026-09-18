"use client"
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Settings, 
  Building2, 
  Save, 
  CheckCircle2, 
  User, 
  Lock, 
  Key,
  Phone,
  Mail,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
  UserPlus,
  Loader2,
  AlertTriangle,
  CreditCard,
  FileText,
  ShieldAlert,
  X,
  MapPin,
  Navigation,
  Search,
  Rocket,
  Layers,
  Monitor,
  Building2 as BuildingIcon,
  Check
} from 'lucide-react';
import { useSettings, PlanoItem, FuncionarioItem } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@supabase/supabase-js';

import dynamic from 'next/dynamic';

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

export default function ConfiguracoesPage() {
  const settings = useSettings();
  const { operador, empresa, carregando: carregandoAuth, atualizarNomeUsuario } = useAuth();

  const empresaIdLogado = operador?.empresaId || operador?.empresa_id || '';
  const userRole = (operador?.role || 'atendente').toLowerCase();

  const nomeProvedor = settings?.nomeProvedor || '';
  const telefone = settings?.telefone || '';
  const emailEmpresa = settings?.emailEmpresa || '';
  const nomeUsuario = operador?.nome || settings?.nomeUsuario || '';
  
  const cidadeAtual = settings?.cidadeEmpresa || 'Águas Lindas de Goiás - GO';
  const latAtual = settings?.latEmpresa ?? -15.8193;
  const lonAtual = settings?.lonEmpresa ?? -48.1133;

  const ctos = settings?.ctos || [];
  const planos = settings?.planos || [];
  const funcionarios = settings?.funcionarios || [];
  const salvarConfiguracoes = settings?.salvarConfiguracoes || (() => {});
  
  const planoAtivoAtual = empresa?.plano ? String(empresa.plano).toLowerCase().trim() : 'essencial';
  const carregandoPlano = carregandoAuth;

  const [salvo, setSalvo] = useState(false);
  
  const [inputNome, setInputNome] = useState(nomeProvedor);
  const [inputTelefone, setInputTelefone] = useState(telefone);
  const [inputEmailEmpresa, setInputEmailEmpresa] = useState(emailEmpresa);
  const [inputUsuario, setInputUsuario] = useState(nomeUsuario);
  
  const [inputCep, setInputCep] = useState('');
  const [inputEnderecoLoja, setInputEnderecoLoja] = useState(cidadeAtual);
  const [inputLat, setInputLat] = useState<number>(latAtual);
  const [inputLon, setInputLon] = useState<number>(lonAtual);
  const [carregandoCep, setCarregandoCep] = useState(false);

  const [listaPlanos, setListaPlanos] = useState<PlanoItem[]>(planos);
  const [listaFuncionarios, setListaFuncionarios] = useState<FuncionarioItem[]>(funcionarios);
  
  const [exibirCamposSenha, setExibirCamposSenha] = useState(false);
  const [senhaAntiga, setSenhaAntiga] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  const [novoCargo, setNovoCargo] = useState('Atendente');
  const [novoEmail, setNovoEmail] = useState('');
  const [carregandoConvite, setCarregandoConvite] = useState(false);
  const [mensagemConvite, setMensagemConvite] = useState('');

  const [modalMapaAberto, setModalMapaAberto] = useState(false);
  const [enderecoBuscaMapa, setEnderecoBuscaMapa] = useState('');
  const [coordsTemp, setCoordsTemp] = useState<{ lat: number; lon: number }>({ lat: latAtual, lon: lonAtual });
  const [enderecoReverso, setEnderecoReverso] = useState('');
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [iconeNeonQuadrado, setIconeNeonQuadrado] = useState<any>(null);

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [aceiteComunicados, setAceiteComunicados] = useState(true);

  const [modalPlanosAberto, setModalPlanosAberto] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlanoStripe, setLoadingPlanoStripe] = useState<string | null>(null);

  useEffect(() => {
    setInputNome(nomeProvedor);
    setInputTelefone(telefone);
    setInputEmailEmpresa(emailEmpresa);
    setInputUsuario(nomeUsuario);
    setInputEnderecoLoja(cidadeAtual);
    setInputLat(latAtual);
    setInputLon(lonAtual);
    setListaPlanos(planos || []);
    setListaFuncionarios(funcionarios || []);

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
          .leaflet-tile-pane {
            filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(95%) !important;
          }
          .leaflet-container {
            background: #09090b !important;
          }
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
          html: `<div style="
            width: 18px;
            height: 18px;
            background-color: #10b981;
            border: 2px solid #ffffff;
            box-shadow: 0 0 12px #10b981, 0 0 20px #10b981;
            border-radius: 3px;
          "></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        setIconeNeonQuadrado(customSquareIcon);
      });
    }
  }, [nomeProvedor, telefone, emailEmpresa, nomeUsuario, cidadeAtual, latAtual, lonAtual, planos, funcionarios]);

  const handleMudancaCepLoja = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '');
    setInputCep(valor);

    if (valor.length === 8) {
      setCarregandoCep(true);
      try {
        const res = await fetch(`https://cep.awesomeapi.com.br/json/${valor}`);
        if (res.ok) {
          const dados = await res.json();
          const enderecoCompleto = `${dados.address || ''}, ${dados.district || ''}, ${dados.city || ''} - ${dados.state || ''}`;
          setInputEnderecoLoja(enderecoCompleto);

          const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1`);
          const dataGeo = await resGeo.json();
          if (dataGeo && dataGeo.length > 0) {
            setInputLat(parseFloat(dataGeo[0].lat));
            setInputLon(parseFloat(dataGeo[0].lon));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setCarregandoCep(false);
      }
    }
  };

  const abrirModalMapaEmpresa = () => {
    setCoordsTemp({ lat: inputLat, lon: inputLon });
    setEnderecoBuscaMapa(inputEnderecoLoja);
    setModalMapaAberto(true);
  };

  const handleBuscarEnderecoMapa = async () => {
    if (!enderecoBuscaMapa) return;
    setCarregandoBusca(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoBuscaMapa)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCoordsTemp({
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        });
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

  const buscarEnderecoReverso = async (novasCoords: { lat: number; lon: number }) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${novasCoords.lat}&lon=${novasCoords.lon}`);
      const data = await res.json();
      if (data && data.display_name) {
        setEnderecoReverso(data.display_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmarCoordsEmpresa = () => {
    setInputLat(coordsTemp.lat);
    setInputLon(coordsTemp.lon);
    if (enderecoReverso) {
      setInputEnderecoLoja(enderecoReverso);
    }
    setModalMapaAberto(false);
  };

  const handleAdicionarPlano = () => {
    setListaPlanos([...listaPlanos, { id: Date.now().toString(), nome: 'Novo Plano', velocidade: '500 Megas', preco: 'R$ 100,00' }]);
  };

  const handleRemoverPlano = (id: string) => {
    setListaPlanos(listaPlanos.filter(item => item.id !== id));
  };

  const handleAtualizarPlano = (id: string, campo: keyof PlanoItem, valor: string) => {
    setListaPlanos(listaPlanos.map(item => item.id === id ? { ...item, [campo]: valor } : item));
  };

  const handleRemoverFuncionario = (id: string) => {
    setListaFuncionarios(listaFuncionarios.filter(item => item.id !== id));
  };

  const handleEnviarConvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmail) return;

    setCarregandoConvite(true);
    setMensagemConvite('');

    const codigoEmpresa = localStorage.getItem('v5_codigo_convite');

    if (!codigoEmpresa) {
      setMensagemConvite('Erro: Código da empresa não encontrado. Acesse a aba "Equipe" para gerá-lo primeiro.');
      setCarregandoConvite(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/equipe/convidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: novoEmail, 
          cargo: novoCargo,
          codigoEmpresa: codigoEmpresa, 
          empresaId: empresaIdLogado || '00000000-0000-0000-0000-000000000001', 
          nomeEmpresa: inputNome || 'V5 Fibra' 
        })
      });

      const data = await res.json();
      
      if (data.sucesso) {
        const novoFunc: FuncionarioItem = {
          id: Date.now().toString(),
          nome: 'Aguardando Cadastro...',
          cargo: novoCargo,
          email: novoEmail
        };

        setListaFuncionarios([...listaFuncionarios, novoFunc]);
        setMensagemConvite(data.mensagem || `Convite enviado com sucesso para ${novoEmail}!`);
        setNovoEmail('');
      } else {
        setMensagemConvite(data.mensagem || 'Erro ao gerar convite.');
      }
    } catch (err) {
      setMensagemConvite('Erro de conexão ao enviar o convite.');
    } finally {
      setCarregandoConvite(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (exibirCamposSenha && (senhaAntiga.trim() !== '' || novaSenha.trim() !== '')) {
      if (!senhaAntiga.trim() || !novaSenha.trim()) {
        alert("Para alterar a senha, você deve preencher tanto a Senha Antiga quanto a Nova Senha.");
        return;
      }
      
      const senhaSalvaLocal = localStorage.getItem('v5_user_password') || '123456';
      if (senhaAntiga !== senhaSalvaLocal) {
        alert("A senha antiga informada está incorreta.");
        return;
      }

      localStorage.setItem('v5_user_password', novaSenha);
    }

    if (inputUsuario) {
      atualizarNomeUsuario(inputUsuario);
    }

    try {
      // 🛡️ PASSO 2: Captura o ID da empresa guardado no localStorage ou do operador logado
      const empresaIdSalvoLocal = localStorage.getItem('v5_empresa_id') || empresaIdLogado;

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: empresaIdSalvoLocal || null,
          operadorEmail: operador?.email || 'willianvannut@gmail.com',
          nomeProvedor: inputNome,
          telefone: inputTelefone,
          emailEmpresa: inputEmailEmpresa,
          nomeUsuario: inputUsuario,
          cidadeEmpresa: inputEnderecoLoja,
          latEmpresa: inputLat,
          lonEmpresa: inputLon,
          ctos,
          planos: listaPlanos,
          funcionarios: listaFuncionarios
        })
      });

      const resultado = await response.json();
      console.log("📥 Resposta da API /api/settings:", resultado);

      if (!response.ok || !resultado.success) {
        throw new Error(resultado.error || "Erro ao salvar no servidor.");
      }

      setSalvo(true);
      setTimeout(() => setSalvo(false), 4000);
    } catch (err) {
      console.error("❌ Erro ao salvar configurações:", err);
      alert("Erro ao salvar as configurações. Verifique o console.");
    }
  };

  const handleSelecionarPlanoOficial = async (nomePlano: string, precoMensal: number, precoAnual: number, chavePlano: string) => {
    setLoadingPlanoStripe(chavePlano);
    
    const precoFinal = isAnnual ? precoAnual : precoMensal;
    const nomeComCiclo = `V5 SaaS - ${nomePlano} (${isAnnual ? 'Anual' : 'Mensal'})`;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inputEmailEmpresa || "cliente.teste@email.com",
          nomePlano: nomeComCiclo,
          precoCentavos: precoFinal * 100,
          intervalo: isAnnual ? 'year' : 'month',
          empresaId: empresaIdLogado,
          chavePlano: chavePlano
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro no pagamento: " + (data.error || "Tente novamente."));
        setLoadingPlanoStripe(null);
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao processar pagamento.");
      setLoadingPlanoStripe(null);
    }
  };

  const confirmarExclusaoDefinitiva = () => {
    localStorage.clear();
    setModalExcluirAberto(false);
    window.location.href = '/login';
  };

  const handleExportarDados = () => {
    const dadosUsuario = {
      usuario: inputUsuario,
      empresa: inputNome,
      telefone: inputTelefone,
      email: inputEmailEmpresa,
      enderecoLoja: inputEnderecoLoja,
      dataRequisicao: new Date().toLocaleDateString('pt-BR')
    };
    const blob = new Blob([JSON.stringify(dadosUsuario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meus-dados-v5.json';
    a.click();
  };

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" /> Configurações do Sistema V5
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Gerenciamento de parâmetros da empresa, geolocalização e perfil.</p>
        </div>
      </div>

      {salvo && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Configurações salvas com sucesso!
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-6">
        
        {userRole === 'gerente' && (
          <>
            {/* EMPRESA & LOCALIZAÇÃO DA LOJA */}
            <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardHeader className="border-b border-zinc-900/85 pb-4">
                <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" /> Configurações Iniciais da Empresa & Localização Base
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-zinc-400">Nome da Empresa</label>
                    <input 
                      type="text"
                      value={inputNome}
                      onChange={(e) => setInputNome(e.target.value)}
                      placeholder="Ex: V5 Fibra"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" /> Telefone / WhatsApp
                    </label>
                    <input 
                      type="text"
                      value={inputTelefone}
                      onChange={(e) => setInputTelefone(e.target.value)}
                      placeholder="(61) 99999-9999"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" /> E-mail de Contato
                    </label>
                    <input 
                      type="email"
                      value={inputEmailEmpresa}
                      onChange={(e) => setInputEmailEmpresa(e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 border-t border-zinc-900 items-end">
                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-xs font-mono uppercase text-emerald-400 font-bold">CEP da Loja</label>
                    <div className="relative">
                      <input 
                        type="text"
                        maxLength={8}
                        value={inputCep}
                        onChange={handleMudancaCepLoja}
                        placeholder="Ex: 72210000"
                        className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      {carregandoCep && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-6 space-y-1.5">
                    <label className="text-xs font-mono uppercase text-zinc-400">Endereço Completo da Loja</label>
                    <input 
                      type="text"
                      value={inputEnderecoLoja}
                      onChange={(e) => setInputEnderecoLoja(e.target.value)}
                      placeholder="Preenchido pelo CEP ou ajuste manual"
                      className="w-full bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={abrirModalMapaEmpresa}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-emerald-400" /> Alterar PIN da Loja no Mapa
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 font-mono">
                  📍 Coordenadas atuais fixadas: Lat <strong className="text-zinc-300">{inputLat.toFixed(4)}</strong>, Lon <strong className="text-zinc-300">{inputLon.toFixed(4)}</strong>
                </div>

              </CardContent>
            </Card>

            {/* PLANOS */}
            <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" /> Planos, Nomes e Preços
                </CardTitle>
                <button
                  type="button"
                  onClick={handleAdicionarPlano}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Plano
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {(!listaPlanos || listaPlanos.length === 0) ? (
                  <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                    Nenhum plano cadastrado. Clique no botão acima para adicionar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listaPlanos.map((plano) => (
                      <div key={plano.id} className="p-4 bg-black/40 border border-zinc-900 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-mono uppercase text-zinc-500">Nome do Plano</label>
                          <input 
                            type="text"
                            value={plano.nome}
                            onChange={(e) => handleAtualizarPlano(plano.id, 'nome', e.target.value)}
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="md:col-span-4 space-y-1">
                          <label className="text-[10px] font-mono uppercase text-zinc-500">Velocidade</label>
                          <input 
                            type="text"
                            value={plano.velocidade}
                            onChange={(e) => handleAtualizarPlano(plano.id, 'velocidade', e.target.value)}
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-mono uppercase text-zinc-500">Preço</label>
                          <input 
                            type="text"
                            value={plano.preco}
                            onChange={(e) => handleAtualizarPlano(plano.id, 'preco', e.target.value)}
                            className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoverPlano(plano.id)}
                            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remover"
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

            {/* GESTÃO DE EQUIPE */}
            <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
              <CardHeader className="border-b border-zinc-900/85 pb-4">
                <CardTitle className="text-xs uppercase font-mono tracking-wide text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Gestão de Equipe & Envio de Convite por E-mail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="p-4 bg-black/50 border border-zinc-800 rounded-xl space-y-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">Convidar Novo Membro (Via Código Mestre)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">Cargo</label>
                      <select 
                        value={novoCargo}
                        onChange={(e) => setNovoCargo(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-emerald-400 font-mono uppercase font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="Atendente">Atendente</option>
                        <option value="Gerente">Gerente</option>
                        <option value="Técnico">Técnico</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-500">E-mail do Colaborador</label>
                      <input 
                        type="email"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        placeholder="colaborador@provedora.com"
                        className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleEnviarConvite}
                      disabled={carregandoConvite}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {carregandoConvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Enviar Convite
                    </button>
                  </div>
                </div>

                {mensagemConvite && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {mensagemConvite}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">Colaboradores na Equipe ({listaFuncionarios.length})</span>

                  {(!listaFuncionarios || listaFuncionarios.length === 0) ? (
                    <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs font-mono">
                      Nenhum funcionário cadastrado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {listaFuncionarios.map((func) => (
                        <div key={func.id} className="p-3.5 bg-black/40 border border-zinc-900 rounded-xl flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-bold text-white block">{func.nome}</span>
                              <span className="text-[10px] text-emerald-400 uppercase">{func.cargo}</span>
                            </div>
                            <span className="text-zinc-500 text-[11px]">{func.email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverFuncionario(func.id)}
                            className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                            title="Remover membro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* PERFIL E CREDENCIAIS */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" /> Perfil e Credenciais de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-zinc-400">Seu Nome de Exibição (Card de Boas-Vindas)</label>
              <input 
                type="text"
                value={inputUsuario}
                onChange={(e) => setInputUsuario(e.target.value)}
                placeholder="Ex: Vannut"
                className="w-full sm:w-1/2 bg-black/50 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 border-t border-zinc-900/85">
              {!exibirCamposSenha ? (
                <button
                  type="button"
                  onClick={() => setExibirCamposSenha(true)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-emerald-400 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4" /> Alterar Senha
                </button>
              ) : (
                <div className="p-4 bg-black/50 border border-zinc-800 rounded-2xl space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Segurança: Alterar Senha de Acesso
                    </span>
                    <button 
                      type="button"
                      onClick={() => { setExibirCamposSenha(false); setSenhaAntiga(''); setNovaSenha(''); }}
                      className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-zinc-400">Senha Antiga *</label>
                      <input 
                        type="password"
                        placeholder="Digite sua senha atual"
                        value={senhaAntiga}
                        onChange={(e) => setSenhaAntiga(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-zinc-400">Nova Senha *</label>
                      <input 
                        type="password"
                        placeholder="Digite a nova senha"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* PRIVACIDADE E CONFORMIDADE LGPD */}
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardHeader className="border-b border-zinc-900/85 pb-4">
            <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" /> Privacidade & Conformidade LGPD
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem total autonomia sobre as suas informações armazenadas em nossa plataforma.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-black/40 border border-zinc-900 rounded-xl">
              <div>
                <span className="text-xs font-mono font-bold text-white block">Exportar Relatório de Dados Pessoais</span>
                <span className="text-[11px] text-zinc-500 font-mono">Baixe uma cópia contendo seus dados cadastrados em formato JSON.</span>
              </div>
              <button
                type="button"
                onClick={handleExportarDados}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FileText className="w-4 h-4 text-emerald-400" /> Exportar Meus Dados
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox"
                id="comunicados"
                checked={aceiteComunicados}
                onChange={(e) => setAceiteComunicados(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-800 cursor-pointer accent-emerald-500"
              />
              <label htmlFor="comunicados" className="text-xs text-zinc-300 font-mono cursor-pointer">
                Aceito receber e-mails informativos, atualizações do sistema e comunicados operacionais da V5.
              </label>
            </div>
          </CardContent>
        </Card>

        {/* BOTÃO DE SALVAR & OPÇÕES EXCLUSIVAS DE GERENTE */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-zinc-900">
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {userRole === 'gerente' && (
              <>
                <button
                  type="button"
                  onClick={() => setModalPlanosAberto(true)}
                  className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                >
                  <CreditCard className="w-4 h-4" /> Mudar de Plano (Ativo: {carregandoPlano ? 'VERIFICANDO NO BANCO...' : planoAtivoAtual.toUpperCase()})
                </button>

                <button
                  type="button"
                  onClick={() => setModalExcluirAberto(true)}
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                >
                  <AlertTriangle className="w-4 h-4" /> Excluir Conta
                </button>
              </>
            )}
          </div>

          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs px-6 py-3 rounded-xl transition-all font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer w-full sm:w-auto justify-center"
          >
            <Save className="w-4 h-4" /> Salvar Configurações
          </button>
        </div>

      </form>

      {/* MODAL COM OS 4 PLANOS OFICIAIS */}
      {modalPlanosAberto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono overflow-y-auto">
          <div className="bg-[#021708] border border-[#1e3b29] w-full max-w-7xl rounded-2xl p-6 md:p-8 relative text-[#f8fafc] shadow-2xl flex flex-col space-y-6 my-8">
            
            <div className="flex justify-between items-center border-b border-[#1e3b29] pb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Central de Assinaturas V5</span>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider mt-1 text-white">Preços Simples e Transparentes</h3>
              </div>
              <button onClick={() => setModalPlanosAberto(false)} className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-[#1e3b29] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Mensal/Anual */}
            <div className="flex items-center justify-center gap-3 my-2">
              <label htmlFor="billing-toggle-modal" className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="billing-toggle-modal" 
                  className="sr-only peer"
                  checked={isAnnual}
                  onChange={(e) => setIsAnnual(e.target.checked)}
                />
                <div className="w-11 h-6 bg-[#1e3b29] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f8fafc] peer-checked:after:bg-[#021708]"></div>
                <span className="ml-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[#94a3b8] select-none">
                  Pague anualmente e economize 20%
                </span>
              </label>
            </div>

            {/* Grid dos 4 Planos Oficiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              
              {/* Card 1: Essencial */}
              <div className={`relative flex flex-col border rounded-xl bg-[#021708] p-6 transition-all ${planoAtivoAtual === 'essencial' ? 'border-emerald-500 ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-[#1e3b29]'}`}>
                {planoAtivoAtual === 'essencial' && (
                  <span className="absolute -top-3 right-6 bg-emerald-500 text-black text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Atual
                  </span>
                )}
                <div className="flex flex-col items-center text-center mb-6 pt-2">
                  <Layers className="w-8 h-8 text-[#f8fafc] mb-4" />
                  <h3 className="text-xl font-black uppercase tracking-wider mb-2">Essencial</h3>
                  <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para pequenos provedores dando o primeiro passo digital.</p>
                </div>
                <div className="text-center flex-grow flex flex-col">
                  <div className="text-4xl font-mono font-black mb-1 transition-all duration-300 text-white">
                    R$ {isAnnual ? '970' : '97'}
                  </div>
                  <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                  <button 
                    disabled={planoAtivoAtual === 'essencial' || loadingPlanoStripe === 'essencial'}
                    onClick={() => handleSelecionarPlanoOficial("Essencial", 97, 970, 'essencial')}
                    className={`w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 transition-colors cursor-pointer ${
                      planoAtivoAtual === 'essencial'
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                        : 'border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] text-[#f8fafc]'
                    }`}
                  >
                    {loadingPlanoStripe === 'essencial' ? <Loader2 className="w-4 h-4 animate-spin" /> : planoAtivoAtual === 'essencial' ? 'Plano Ativo' : 'Começar Agora'}
                  </button>
                  
                  <div className="text-left text-sm mt-auto">
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                    <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ 1 Usuário (Apenas 1 vendedor)</p>
                    <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ 1 cidade mapeada</p>
                    <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ 1 Tecnico em campo</p>
                    
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Widget de Viabilidade</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>CRM Básico (Kanban)</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]/40 line-through"><X className="w-4 h-4 text-[#94a3b8] shrink-0" /> <span>Integrações (Webhooks)</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]/40 line-through"><X className="w-4 h-4 text-[#94a3b8] shrink-0" /> <span>Suporte prioritário</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 2: Pro */}
              <div className={`relative flex flex-col border rounded-xl bg-[#021708] p-6 transition-all ${planoAtivoAtual === 'pro' ? 'border-emerald-500 ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-[#1e3b29]'}`}>
                {planoAtivoAtual === 'pro' && (
                  <span className="absolute -top-3 right-6 bg-emerald-500 text-black text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Atual
                  </span>
                )}
                <div className="flex flex-col items-center text-center mb-6 pt-2">
                  <Monitor className="w-8 h-8 text-[#f8fafc] mb-4" />
                  <h3 className="text-xl font-black uppercase tracking-wider mb-2">Pro</h3>
                  <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para provedores em expansão que precisam de velocidade.</p>
                </div>
                <div className="text-center flex-grow flex flex-col">
                  <div className="text-4xl font-mono font-black mb-1 transition-all duration-300 text-white">
                    R$ {isAnnual ? '2470' : '247'}
                  </div>
                  <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                  <button 
                    disabled={planoAtivoAtual === 'pro' || loadingPlanoStripe === 'pro'}
                    onClick={() => handleSelecionarPlanoOficial("Pro", 247, 2470, 'pro')}
                    className={`w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 transition-colors cursor-pointer ${
                      planoAtivoAtual === 'pro'
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                        : 'border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] text-[#f8fafc]'
                    }`}
                  >
                    {loadingPlanoStripe === 'pro' ? <Loader2 className="w-4 h-4 animate-spin" /> : planoAtivoAtual === 'pro' ? 'Plano Ativo' : 'Começar Agora'}
                  </button>
                  
                  <div className="text-left text-sm mt-auto">
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                    <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 3 Usuários</p>
                    <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 10 Cidades mapeadas</p>
                    <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Até 10 Tecnico em campo</p>
                    
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Tudo do Essencial</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Webhooks Liberados (n8n)</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Relatórios de conversão</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]/40 line-through"><X className="w-4 h-4 text-[#94a3b8] shrink-0" /> <span>Setup assistido de automação</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 3: Scale */}
              <div className={`relative flex flex-col border rounded-xl bg-[#021708] p-6 transition-all shadow-md z-10 ${planoAtivoAtual === 'scale' ? 'border-emerald-500 ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-[#f8fafc] ring-1 ring-[#f8fafc]/30 scale-[1.03]'}`}>
                {planoAtivoAtual === 'scale' && (
                  <span className="absolute -top-3 right-6 bg-emerald-500 text-black text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Atual
                  </span>
                )}
                <div className="absolute -top-3 left-0 right-0 mx-auto w-fit bg-[#f8fafc] text-[#021708] font-mono text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full font-bold shadow-sm">
                  Recomendado
                </div>
                <div className="flex flex-col items-center text-center mb-6 pt-4">
                  <Rocket className="w-8 h-8 text-[#f8fafc] mb-4" />
                  <h3 className="text-xl font-black uppercase tracking-wider mb-2">Scale</h3>
                  <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para equipes comerciais focadas em conversão.</p>
                </div>
                <div className="text-center flex-grow flex flex-col">
                  <div className="text-4xl font-mono font-black mb-1 transition-all duration-300 text-white">
                    R$ {isAnnual ? '4970' : '497'}
                  </div>
                  <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                  <button 
                    disabled={planoAtivoAtual === 'scale' || loadingPlanoStripe === 'scale'}
                    onClick={() => handleSelecionarPlanoOficial("Scale", 497, 4970, 'scale')}
                    className={`w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 transition-colors cursor-pointer shadow-[0_0_15px_rgba(248,250,252,0.15)] ${
                      planoAtivoAtual === 'scale'
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                        : 'bg-[#f8fafc] text-[#021708] hover:bg-[#f8fafc]/90'
                    }`}
                  >
                    {loadingPlanoStripe === 'scale' ? <Loader2 className="w-4 h-4 animate-spin" /> : planoAtivoAtual === 'scale' ? 'Plano Ativo' : 'Assinar Scale'}
                  </button>
                  
                  <div className="text-left text-sm mt-auto">
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                    <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 10 Usuários</p>
                    <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Áreas de cobertura ilimitadas</p>
                    
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Tudo do Pro</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Roleta de Leads automática</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Analytics Avançado</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Suporte VIP WhatsApp</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 4: Enterprise */}
              <div className={`relative flex flex-col border rounded-xl bg-[#021708] p-6 transition-all ${planoAtivoAtual === 'enterprise' ? 'border-emerald-500 ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-[#1e3b29]'}`}>
                {planoAtivoAtual === 'enterprise' && (
                  <span className="absolute -top-3 right-6 bg-emerald-500 text-black text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                    Atual
                  </span>
                )}
                <div className="flex flex-col items-center text-center mb-6 pt-2">
                  <BuildingIcon className="w-8 h-8 text-[#f8fafc] mb-4" />
                  <h3 className="text-xl font-black uppercase tracking-wider mb-2">Enterprise</h3>
                  <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para grandes operações exigindo automação total.</p>
                </div>
                <div className="text-center flex-grow flex flex-col">
                  <div className="text-2xl font-mono font-black mb-1 transition-all duration-300 text-white">
                    PERSONALIZADO
                  </div>
                  <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest"></p>
                  <a 
                    href="https://api.whatsapp.com/send/?phone=556194193617&text=Olá,%20tenho%20interesse%20em%20entender%20melhor%20o%20plano%20Enterprise%20do%20SaaS%20V5."
                    target="_blank"
                    rel="noreferrer"
                    className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] transition-colors text-[#f8fafc]"
                  >
                    Falar c/ Vendas
                  </a>
                  
                  <div className="text-left text-sm mt-auto">
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                    <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Usuários Ilimitados</p>
                    <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Áreas de cobertura ilimitadas</p>
                    
                    <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Setup VIP (n8n e WhatsApp)</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>White-label (Sem marca V5)</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Gerente de sucesso dedicado</span></li>
                      <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Treinamento da equipe</span></li>
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-4 pt-4 border-t border-[#1e3b29] flex justify-end">
              <button 
                type="button" 
                onClick={() => setModalPlanosAberto(false)} 
                className="px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs uppercase tracking-wider border border-zinc-800 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE MAPA */}
      {modalMapaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/40">
              <h3 className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Definir Localização Base da Loja (PIN Neon)
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
                🖱️ <strong>Instrução:</strong> Posicione o quadrado neon verde exatamente na sede da sua empresa.
              </p>

              <div className="relative w-full h-96 bg-[#09090b] border border-emerald-500/50 rounded-2xl overflow-hidden shadow-lg z-10">
                <MapContainer 
                  key={`${coordsTemp.lat}-${coordsTemp.lon}-${modalMapaAberto}`}
                  center={[coordsTemp.lat, coordsTemp.lon]} 
                  zoom={15} 
                  style={{ width: '100%', height: '100%', background: '#09090b' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapResizeFix />
                  {iconeNeonQuadrado && (
                    <DraggableMarker coords={coordsTemp} setCoords={setCoordsTemp} buscarReverso={buscarEnderecoReverso} />
                  )}
                  <ClickHandler setCoords={setCoordsTemp} buscarReverso={buscarEnderecoReverso} />
                </MapContainer>
              </div>

              <div className="p-3 bg-black/60 border border-zinc-800 rounded-xl space-y-1 font-mono text-xs">
                <div className="text-emerald-400 font-bold">📍 Coordenadas Selecionadas: <span className="text-white">Lat {coordsTemp.lat.toFixed(5)}, Lon {coordsTemp.lon.toFixed(5)}</span></div>
                <div className="text-zinc-400 truncate">🏠 Endereço Identificado: <span className="text-zinc-200">{enderecoReverso || "Aguardando ajuste..."}</span></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalMapaAberto(false)} className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-mono uppercase font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmarCoordsEmpresa} className="px-5 py-2 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  Confirmar Localização da Loja
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO DE CONTA */}
      {modalExcluirAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col p-6 space-y-5">
            <div className="flex justify-between items-start">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button onClick={() => setModalExcluirAberto(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold font-mono text-white">Deseja excluir a minha conta?</h3>
              <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                <strong className="text-red-400">ATENÇÃO:</strong> Conforme a LGPD, esta ação removerá seus dados pessoais de acesso do sistema de forma permanente e irreversível.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button type="button" onClick={() => setModalExcluirAberto(false)} className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono uppercase font-bold cursor-pointer">
                Cancelar
              </button>
              <button type="button" onClick={confirmarExclusaoDefinitiva} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono uppercase font-bold cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                Desejo excluir a minha conta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}