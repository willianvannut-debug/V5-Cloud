// ================================================================================
// 🌍 PÁGINA DE VIABILIDADE DO CLIENTE - V5 CLOUD
// 4 ETAPAS + VISUAL PREMIUM + ANIMAÇÕES + LEAD SCORING
// app/viabilidade/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { Search, CheckCircle2, XCircle, Loader2, Phone, User, Navigation, Building2, Home, Store, Warehouse, ArrowRight, ArrowLeft, Users, Gamepad2, Briefcase } from 'lucide-react';

const MapWithNoSSR = dynamic(
  async () => {
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = await import('react-leaflet');
    const L = await import('leaflet');

    // 🚀 PINO VERDE NEON PEQUENO
    const customPinIcon = L.divIcon({
      className: 'custom-client-pin',
      html: `<div style="width: 14px; height: 14px; background-color: #10b981; box-shadow: 0 0 10px 3px rgba(16, 185, 129, 0.8), 0 0 20px rgba(16, 185, 129, 0.5); border-radius: 50%;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    function CorretorTamanhoMapa() {
      const map = useMap();
      useEffect(() => {
        setTimeout(() => map.invalidateSize(), 300);
      }, [map]);
      return null;
    }

    function MarcadorInterativo({ posicao, setPosicao }: { posicao: [number, number]; setPosicao: (pos: [number, number]) => void }) {
      useMapEvents({ click(e) { setPosicao([e.latlng.lat, e.latlng.lng]); } });
      return (
        <Marker position={posicao} draggable={true} icon={customPinIcon} eventHandlers={{
          dragend(e: any) { const pos = e.target.getLatLng(); setPosicao([pos.lat, pos.lng]); }
        }} />
      );
    }

    return function MapComponent({ posicaoPin, setPosicaoPin }: { posicaoPin: [number, number]; setPosicaoPin: (pos: [number, number]) => void }) {
      return (
        <MapContainer center={posicaoPin} zoom={16} minZoom={12} maxZoom={17} zoomControl={false} style={{ width: '100%', height: '100%', borderRadius: '8px' }}>
          <CorretorTamanhoMapa />
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={17} maxNativeZoom={17}
          />
          <MarcadorInterativo posicao={posicaoPin} setPosicao={setPosicaoPin} />
        </MapContainer>
      );
    };
  },
  { ssr: false }
);

export default function ViabilidadePremiumStepsPage() {
  const [mounted, setMounted] = useState(false);
  const [telaAtiva, setTelaAtiva] = useState<'FORM' | 'LOADER' | 'SUCCESS' | 'EXPANSION'>('FORM');
  const [etapaAtual, setEtapaAtual] = useState(1);
  
  // Dados do Cliente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [posicaoPin, setPosicaoPin] = useState<[number, number]>([-15.7641, -48.2743]);
  const [tipoImovel, setTipoImovel] = useState('CASA');
  const [perfilUso, setPerfilUso] = useState('FAMILIA');
  const [aceiteLgpd, setAceiteLgpd] = useState(false);
  const [aceiteIdade, setAceiteIdade] = useState(false);

  // Estados de Animação
  const [loaderText, setLoaderText] = useState('Iniciando varredura na rede V5...');
  const [timerText, setTimerText] = useState('15:00');
  let timerInterval: any = null;

  useEffect(() => { setMounted(true); }, []);

  // Máscaras
  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length > 11) valor = valor.slice(0, 11);
    if (valor.length > 2) valor = `(${valor.slice(0, 2)}) ${valor.slice(2)}`;
    if (valor.length > 10) valor = `${valor.slice(0, 10)}-${valor.slice(10)}`;
    setTelefone(valor);
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, ''); 
    if (valor.length > 8) valor = valor.slice(0, 8); 
    if (valor.length > 5) valor = `${valor.slice(0, 5)}-${valor.slice(5)}`;
    setCep(valor);
  };

  // Navegação entre Etapas
  const avancarEtapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (etapaAtual === 1) {
      const numerosTelefone = telefone.replace(/\D/g, '');
      if (!nome.trim() || numerosTelefone.length < 10) { alert("Por favor, preencha o seu nome e um WhatsApp válido com DDD."); return; }
    }
    if (etapaAtual === 2 && !tipoImovel) { alert("Selecione o tipo de imóvel."); return; }
    if (etapaAtual === 3 && !perfilUso) { alert("Selecione o perfil de uso."); return; }
    setEtapaAtual((prev) => prev + 1);
  };

  const voltarEtapa = () => {
    setEtapaAtual((prev) => prev - 1);
  };

  const startTimer = (durationMinutes: number) => {
    clearInterval(timerInterval);
    let time = durationMinutes * 60;
    timerInterval = setInterval(() => {
      let m = parseInt(String(time / 60), 10);
      let s = parseInt(String(time % 60), 10);
      setTimerText(`${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`);
      if (--time < 0) { clearInterval(timerInterval); setTimerText("00:00"); }
    }, 1000);
  };

  // Envio Final (Passo 4)
  const processarViabilidade = async (e: FormEvent) => {
    e.preventDefault();
    if (!cep.trim() || !numero.trim()) { alert("Preencha o CEP e o Endereço."); return; }
    if (!aceiteLgpd || !aceiteIdade) { alert("Aceite os termos para prosseguir."); return; }

    setTelaAtiva('LOADER');

    const etapasAnimacao = ['Mapeando portas OLT...', 'Roteando fibra no bairro...', 'Sincronizando viabilidade...', 'Calculando Lead Score...'];
    let index = 0;
    const loaderInterval = setInterval(() => {
      if (index < etapasAnimacao.length) { setLoaderText(etapasAnimacao[index]); index++; }
      else { clearInterval(loaderInterval); }
    }, 1000);

    try {
      const resCtos = await fetch('/api/ctos');
      if (!resCtos.ok) throw new Error("Erro de API.");
      
      const dadosBrutos = await resCtos.json();
      const ctosLista = Array.isArray(dadosBrutos) ? dadosBrutos : (dadosBrutos?.ctos || dadosBrutos?.data || []);
      const limiteEmpresa = Number(dadosBrutos?.limiteMetros || 250);

      let menorDistancia = Infinity;
      let ctoEleita = null;
      const R = 6371e3; const rad = Math.PI / 180; const lat1 = posicaoPin[0] * rad;

      ctosLista.forEach((cto: any) => {
        const latCto = Number(cto.lat ?? cto.latitude ?? cto.Y);
        const lonCto = Number(cto.lon ?? cto.longitude ?? cto.X);
        if (!isNaN(latCto) && !isNaN(lonCto)) {
          const lat2 = latCto * rad; const dLat = (latCto - posicaoPin[0]) * rad; const dLon = (lonCto - posicaoPin[1]) * rad;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const distMetros = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          if (distMetros < menorDistancia) { menorDistancia = distMetros; ctoEleita = cto; }
        }
      });

      const temCobertura = menorDistancia <= limiteEmpresa;
      const statusCalculado = temCobertura ? 'COM COBERTURA' : 'SEM COBERTURA';
      const nomeCtoVinculada = ctoEleita ? (ctoEleita.identificacao || ctoEleita.nome || ctoEleita.codigo || 'CTO-01') : 'Sem CTO';

      // Cálculo do Score Dinâmico
      let pontuacaoLead = 0;
      if (temCobertura) {
        const prop = menorDistancia / limiteEmpresa; 
        if (prop <= 0.33) pontuacaoLead += 50; else if (prop <= 0.66) pontuacaoLead += 30; else pontuacaoLead += 15; 
      }
      if (perfilUso === 'GAMER') pontuacaoLead += 30; else if (perfilUso === 'TRABALHO') pontuacaoLead += 25; else if (perfilUso === 'FAMILIA') pontuacaoLead += 15; else if (perfilUso === 'SOLO') pontuacaoLead += 10;
      if (tipoImovel === 'COMERCIO') pontuacaoLead += 20; else if (tipoImovel === 'PREDIO') pontuacaoLead += 15; else if (tipoImovel === 'CASA') pontuacaoLead += 10; else if (tipoImovel === 'GALPAO') pontuacaoLead += 5;

      // Envia Lead
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, telefone, cep,
          endereco: `${numero} [${tipoImovel} / ${perfilUso}]`,
          perfil: statusCalculado, cto: nomeCtoVinculada, lat: posicaoPin[0], lon: posicaoPin[1], origem: 'cliente_publico', score: pontuacaoLead
        })
      });

      setTimeout(() => {
        clearInterval(loaderInterval);
        if (temCobertura) { setTelaAtiva('SUCCESS'); startTimer(15); } 
        else { setTelaAtiva('EXPANSION'); }
      }, 4500);

    } catch (err: any) {
      console.error(err);
      clearInterval(loaderInterval);
      alert("Erro ao analisar a viabilidade. Tente novamente.");
      setTelaAtiva('FORM');
    }
  };

  const resetForm = () => {
    setTelaAtiva('FORM'); setEtapaAtual(1); setNome(''); setTelefone(''); setCep(''); setNumero(''); setAceiteLgpd(false); setAceiteIdade(false); clearInterval(timerInterval);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!mounted) return <div style={{background: '#0a0a0c', minHeight: '100vh', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>A carregar terminal V5...</div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root { --bg-dark: #0a0a0c; --card-bg: #121318; --accent-yellow: #FFB800; --accent-orange: #FF5E00; --success-green: #62c073; --error-red: #ff4d4d; --text-muted: #a1a1aa; --border-color: rgba(255, 255, 255, 0.1); --font-main: 'Montserrat', sans-serif; --font-mono: 'JetBrains Mono', monospace; }
        .v5-widget-wrapper { background-color: var(--bg-dark); color: #ffffff; font-family: var(--font-main); width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 4rem 1rem; box-sizing: border-box; background-image: radial-gradient(circle at 50% 10%, rgba(98, 192, 115, 0.04) 0%, transparent 50%), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px); background-size: 100% 100%, 40px 40px, 40px 40px; }
        .v5-widget-wrapper * { box-sizing: border-box; }
        .v5-container { width: 100%; max-width: 650px; margin: 0 auto; }
        .status-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(98, 192, 115, 0.08); border: 1px solid rgba(98, 192, 115, 0.2); padding: 6px 16px; border-radius: 100px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--success-green); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 1.5rem; }
        .pulse-dot { width: 8px; height: 8px; background-color: var(--success-green); border-radius: 50%; box-shadow: 0 0 10px var(--success-green); animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.8; } }
        
        .coverage-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 2.5rem 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.8); position: relative; overflow: hidden; }
        .card-title { font-size: 1.5rem; font-weight: 900; text-transform: uppercase; line-height: 1.1; margin-bottom: 0.5rem; color: #ffffff !important; font-family: var(--font-mono); letter-spacing: 1px;}
        .card-subtitle { color: var(--success-green); font-size: 0.8rem; font-family: var(--font-mono); text-transform: uppercase; margin-bottom: 2rem; letter-spacing: 1px; }
        
        /* Nav Steps Header */
        .steps-header { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); justify-content: center; flex-wrap: wrap;}
        .step-badge { padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.05); }
        .step-badge.active { background: var(--success-green); color: #000; font-weight: bold; }
        
        .form-group { margin-bottom: 1.25rem; text-align: left; }
        .form-label { display: block; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: 0.5rem; }
        .form-input { width: 100%; background: rgba(0, 0, 0, 0.5); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.9rem 1rem; color: #ffffff; font-family: var(--font-main); font-size: 0.95rem; transition: all 0.3s ease; outline: none; }
        .form-input:focus { border-color: var(--success-green); box-shadow: 0 0 15px rgba(98, 192, 115, 0.15); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        
        /* Grid de Seleção (Imóvel e Uso) */
        .selection-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 1.5rem; }
        .selection-btn { background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem 1rem; color: var(--text-muted); cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; gap: 10px; font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; font-weight: bold; }
        .selection-btn:hover { border-color: rgba(98, 192, 115, 0.5); color: #fff; }
        .selection-btn.active { background: rgba(98, 192, 115, 0.1); border-color: var(--success-green); color: var(--success-green); box-shadow: 0 0 15px rgba(98, 192, 115, 0.2); }

        .checkbox-label { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; color: var(--text-muted); font-size: 0.8rem; line-height: 1.4; margin-bottom: 1rem; }
        .checkbox-input { margin-top: 3px; accent-color: var(--success-green); width: 16px; height: 16px; }
        
        .nav-buttons { display: flex; gap: 12px; margin-top: 1.5rem; }
        .btn-back { background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: var(--text-muted); border-radius: 8px; padding: 1.1rem; font-weight: 900; text-transform: uppercase; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; width: 120px; }
        .btn-back:hover { background: #fff; color: #000; }
        .btn-check { flex: 1; background: var(--success-green); color: #000000; border: none; border-radius: 8px; padding: 1.1rem; font-weight: 900; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%;}
        .btn-check:hover { background: #ffffff; box-shadow: 0 10px 25px rgba(98, 192, 115, 0.4); transform: translateY(-2px); }
        
        .loader-overlay { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1rem; text-align: center; width: 100%; animation: fadeIn 0.5s ease; }
        .city-fiber-animation { position: relative; width: 100%; max-width: 350px; height: 120px; margin: 0 auto 2rem auto; }
        .skyline { display: flex; align-items: flex-end; justify-content: space-between; width: 100%; height: 80px; position: absolute; bottom: 40px; padding: 0 10px; }
        .building { background-color: #1a1a24; border: 1px solid rgba(255, 255, 255, 0.05); border-bottom: none; position: relative; box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.5); }
        .b1 { width: 12%; height: 40%; } .b2 { width: 15%; height: 70%; } .b3 { width: 10%; height: 100%; } .b4 { width: 18%; height: 50%; } .b5 { width: 14%; height: 85%; } .b6 { width: 12%; height: 90%; } .b7 { width: 11%; height: 30%; }
        .antenna { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); width: 2px; height: 15px; background-color: #1a1a24; }
        .antenna::after { content: ''; position: absolute; top: -4px; left: -2px; width: 6px; height: 6px; background-color: #ff4d4d; border-radius: 50%; animation: blinkRed 1s infinite; }
        @keyframes blinkRed { 0%, 100% { opacity: 0.2; box-shadow: none; } 50% { opacity: 1; box-shadow: 0 0 8px #ff4d4d; } }
        .ground { position: absolute; bottom: 39px; width: 100%; height: 1px; background-color: rgba(255, 255, 255, 0.1); }
        .underground { position: absolute; bottom: 0; width: 100%; height: 40px; }
        .fiber-line { position: absolute; top: 20px; left: 0; width: 100%; height: 2px; background-color: rgba(98, 192, 115, 0.15); }
        .light-pulse { position: absolute; top: 19px; left: -50px; width: 50px; height: 4px; background: linear-gradient(90deg, transparent, var(--success-green), #ffffff); border-radius: 10px; box-shadow: 0 0 15px var(--success-green), 0 0 30px var(--success-green); animation: shootLight 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes shootLight { 0% { left: -50px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
        .node { position: absolute; top: 17px; width: 8px; height: 8px; background-color: #121318; border: 2px solid rgba(98, 192, 115, 0.3); border-radius: 50%; z-index: 2; animation: nodePulse 2s infinite; }
        .n1 { left: 20%; animation-delay: 0.3s; } .n2 { left: 50%; animation-delay: 0.8s; } .n3 { left: 80%; animation-delay: 1.3s; }
        @keyframes nodePulse { 0%, 100% { background-color: #121318; border-color: rgba(98, 192, 115, 0.3); box-shadow: none; } 10%, 30% { background-color: var(--success-green); border-color: #fff; box-shadow: 0 0 15px var(--success-green); } }
        .loader-status-container { margin-top: 1rem; }
        .loader-text-highlight { font-family: var(--font-mono); font-size: 0.95rem; font-weight: 800; color: var(--success-green); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem; }
        .loader-subtext { font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-main); text-transform: uppercase; letter-spacing: 2px; animation: pulseText 1.5s infinite; }
        @keyframes pulseText { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        
        .result-screen { animation: fadeIn 0.5s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .result-badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem; }
        .badge-success { background: rgba(98, 192, 115, 0.15); color: var(--success-green); border: 1px solid var(--success-green); }
        .badge-expansion { background: rgba(255, 94, 0, 0.15); color: var(--accent-orange); border: 1px solid var(--accent-orange); }
        .result-title { font-size: 1.75rem; font-weight: 900; margin-bottom: 0.75rem; line-height: 1.2; color: #ffffff !important; }
        .result-desc { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
        .address-box { background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); border-left: 3px solid var(--success-green); padding: 1rem; border-radius: 6px; font-family: var(--font-mono); font-size: 0.85rem; text-align: left; margin-bottom: 1.5rem; color: var(--text-muted); }
        .address-box strong { color: #fff; }
        .bonus-box { background: rgba(98, 192, 115, 0.05); border: 1px dashed var(--success-green); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; text-align: left; position: relative; }
        .bonus-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(98, 192, 115, 0.2); }
        .bonus-title { color: var(--success-green); font-family: var(--font-mono); font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .timer-badge { background: rgba(255, 77, 77, 0.15); color: var(--error-red); padding: 4px 10px; border-radius: 4px; font-family: var(--font-mono); font-weight: 800; font-size: 0.85rem; animation: pulseRed 2s infinite; }
        @keyframes pulseRed { 0%, 100% { box-shadow: none; } 50% { box-shadow: 0 0 10px rgba(255, 77, 77, 0.4); } }
        .bonus-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 0.75rem; font-size: 0.85rem; line-height: 1.4; }
        .bonus-item:last-child { margin-bottom: 0; }
        .bonus-item-icon { color: var(--success-green); font-weight: bold; }
        .price-strike { color: var(--error-red); text-decoration: line-through; margin-right: 5px; opacity: 0.8; }
        .price-free { color: var(--success-green); font-weight: 800; text-transform: uppercase; }
        .btn-whatsapp { width: 100%; background: var(--success-green); color: #000; border: none; border-radius: 8px; padding: 1.1rem; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.3s ease; text-align: center; }
        .btn-whatsapp:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(98, 192, 115, 0.3); }
        .btn-expansion-color { background: var(--accent-orange); }
        .btn-expansion-color:hover { box-shadow: 0 10px 25px rgba(255, 94, 0, 0.3); }
        .btn-reset { background: transparent; border: none; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 1.5rem; cursor: pointer; text-decoration: underline; width: 100%; }
        
        .v5-pricing-section { width: 100%; max-width: 1200px; margin: 0 auto; padding: 60px 20px; font-family: 'Montserrat', sans-serif; color: #ffffff; animation: fadeIn 1s ease; }
        .v5-pricing-header { text-align: center; margin-bottom: 50px; }
        .v5-pricing-title { font-size: clamp(2.2rem, 4vw, 3rem) !important; font-weight: 800 !important; text-transform: uppercase !important; margin-bottom: 15px !important; letter-spacing: -0.02em !important; color: #ffffff !important; }
        .v5-pricing-desc { color: rgba(255, 255, 255, 0.7); font-size: 1.1rem; line-height: 1.6; }
        .v5-pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; align-items: stretch; }
        .v5-pricing-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px 30px; position: relative; backdrop-filter: blur(12px); display: flex; flex-direction: column; transition: all 0.4s ease; }
        .v5-pricing-card:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.3); transform: translateY(-8px); }
        .v5-pricing-card.v5-popular { border: 2px solid #09A05C; background: rgba(9, 160, 92, 0.04); }
        .v5-popular-badge { position: absolute; top: 0; right: 0; background: #09A05C; color: #ffffff; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 16px; border-bottom-left-radius: 16px; border-top-right-radius: 22px; }
        .v5-card-content { display: flex; flex-direction: column; height: 100%; }
        .v5-plan-name { font-size: 1.1rem; font-weight: 700; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.05em; }
        .v5-plan-price { display: flex; align-items: baseline; margin: 20px 0 10px 0; }
        .v5-currency { font-size: 1.2rem; font-weight: 600; margin-right: 4px; }
        .v5-amount { font-size: 3.2rem; font-weight: 800; line-height: 1; }
        .v5-cents { font-size: 1.2rem; font-weight: 700; }
        .v5-period { font-size: 0.9rem; color: rgba(255, 255, 255, 0.6); margin-left: 6px; }
        .v5-plan-sub { font-size: 0.9rem; color: rgba(255, 255, 255, 0.7); min-height: 40px; margin-bottom: 25px; }
        .v5-feature-list { list-style: none; padding: 0; margin: 0 0 25px 0; display: flex; flex-direction: column; gap: 12px; flex-grow: 1; }
        .v5-feature-list li { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: rgba(255, 255, 255, 0.9); }
        .v5-check { color: #09A05C; font-weight: 900; }
        .v5-divider { width: 100%; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 20px 0; }
        .v5-btn { display: block; width: 100%; padding: 14px 20px; border-radius: 50px; font-weight: 700; text-align: center; text-decoration: none; transition: all 0.3s ease; cursor: pointer; font-size: 1rem; }
        .v5-btn-outline { background: transparent; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.3); }
        .v5-btn-outline:hover { background: #ffffff; color: #010a08; border-color: #ffffff; }
        .v5-btn-primary { background: #09A05C; color: #ffffff; border: 1px solid #09A05C; }
        .v5-btn-primary:hover { background: #0bba6c; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(9, 160, 92, 0.3); }
        .v5-card-footer { font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); text-align: center; margin-top: 15px; }
        @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; gap: 0; } .coverage-card { padding: 1.5rem 1.25rem; } .card-title { font-size: 1.6rem; } .v5-pricing-grid { grid-template-columns: 1fr; } .v5-amount { font-size: 2.6rem; } }
      `}} />

      <div className="v5-widget-wrapper">
        <div className="v5-container">
          <div style={{ textAlign: 'center' }}>
            <div className="status-chip"><span className="pulse-dot"></span>Verificação de Malha de Fibra V5</div>
          </div>

          <div className="coverage-card">
            
            {/* ===================== FORMULÁRIO (4 ETAPAS) ===================== */}
            {telaAtiva === 'FORM' && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div className="steps-header">
                  <span className={`step-badge ${etapaAtual === 1 ? 'active' : ''}`}>1. Dados</span> ➔
                  <span className={`step-badge ${etapaAtual === 2 ? 'active' : ''}`}>2. Imóvel</span> ➔
                  <span className={`step-badge ${etapaAtual === 3 ? 'active' : ''}`}>3. Uso</span> ➔
                  <span className={`step-badge ${etapaAtual === 4 ? 'active' : ''}`}>4. Localização</span>
                </div>

                {/* ETAPA 1: DADOS */}
                {etapaAtual === 1 && (
                  <form onSubmit={avancarEtapa} style={{ animation: 'fadeIn 0.3s ease' }}>
                    <h1 className="card-title">Passo 1 de 4</h1>
                    <p className="card-subtitle">Identificação</p>
                    <div className="form-group">
                      <label className="form-label">Nome Completo</label>
                      <input type="text" className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João da Silva" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">WhatsApp / Telefone</label>
                      <input type="tel" className="form-input" value={telefone} onChange={handleTelefoneChange} placeholder="(61) 99999-9999" required />
                    </div>
                    <button type="submit" className="btn-check" style={{ marginTop: '2rem' }}>Avançar <ArrowRight className="w-5 h-5"/></button>
                  </form>
                )}

                {/* ETAPA 2: TIPO DE IMÓVEL */}
                {etapaAtual === 2 && (
                  <form onSubmit={avancarEtapa} style={{ animation: 'fadeIn 0.3s ease' }}>
                    <h1 className="card-title">Passo 2 de 4</h1>
                    <p className="card-subtitle">Selecione o Tipo de Imóvel</p>
                    
                    <div className="selection-grid">
                      <div onClick={() => setTipoImovel('CASA')} className={`selection-btn ${tipoImovel === 'CASA' ? 'active' : ''}`}>
                        <Home size={28}/> Casa
                      </div>
                      <div onClick={() => setTipoImovel('PREDIO')} className={`selection-btn ${tipoImovel === 'PREDIO' ? 'active' : ''}`}>
                        <Building2 size={28}/> Prédio / Apto
                      </div>
                      <div onClick={() => setTipoImovel('GALPAO')} className={`selection-btn ${tipoImovel === 'GALPAO' ? 'active' : ''}`}>
                        <Warehouse size={28}/> Galpão
                      </div>
                      <div onClick={() => setTipoImovel('COMERCIO')} className={`selection-btn ${tipoImovel === 'COMERCIO' ? 'active' : ''}`}>
                        <Store size={28}/> Comércio / Loja
                      </div>
                    </div>

                    <div className="nav-buttons">
                      <button type="button" onClick={voltarEtapa} className="btn-back"><ArrowLeft size={18}/> Voltar</button>
                      <button type="submit" className="btn-check">Avançar <ArrowRight size={18}/></button>
                    </div>
                  </form>
                )}

                {/* ETAPA 3: PERFIL DE USO */}
                {etapaAtual === 3 && (
                  <form onSubmit={avancarEtapa} style={{ animation: 'fadeIn 0.3s ease' }}>
                    <h1 className="card-title">Passo 3 de 4</h1>
                    <p className="card-subtitle">Para que a internet será mais utilizada?</p>
                    
                    <div className="selection-grid">
                      <div onClick={() => setPerfilUso('FAMILIA')} className={`selection-btn ${perfilUso === 'FAMILIA' ? 'active' : ''}`}>
                        <Users size={28}/> Com Família
                      </div>
                      <div onClick={() => setPerfilUso('SOLO')} className={`selection-btn ${perfilUso === 'SOLO' ? 'active' : ''}`}>
                        <User size={28}/> Uso Solo
                      </div>
                      <div onClick={() => setPerfilUso('GAMER')} className={`selection-btn ${perfilUso === 'GAMER' ? 'active' : ''}`}>
                        <Gamepad2 size={28}/> Gamer / Jogos
                      </div>
                      <div onClick={() => setPerfilUso('TRABALHO')} className={`selection-btn ${perfilUso === 'TRABALHO' ? 'active' : ''}`}>
                        <Briefcase size={28}/> Home Office
                      </div>
                    </div>

                    <div className="nav-buttons">
                      <button type="button" onClick={voltarEtapa} className="btn-back"><ArrowLeft size={18}/> Voltar</button>
                      <button type="submit" className="btn-check">Avançar <ArrowRight size={18}/></button>
                    </div>
                  </form>
                )}

                {/* ETAPA 4: LOCALIZAÇÃO E MAPA */}
                {etapaAtual === 4 && (
                  <form onSubmit={processarViabilidade} style={{ animation: 'fadeIn 0.3s ease' }}>
                    <h1 className="card-title">Passo 4 de 4</h1>
                    <p className="card-subtitle">Localização exata para o cálculo de fibra</p>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">CEP</label>
                        <input type="text" className="form-input" value={cep} onChange={handleCepChange} placeholder="00000-000" maxLength={9} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Nº / Quadra / Lote</label>
                        <input type="text" className="form-input" value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ex: Qd 10 Lote 05" required />
                      </div>
                    </div>

                    <div className="form-group" style={{ height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', marginTop: '0.5rem', position: 'relative' }}>
                      <MapWithNoSSR posicaoPin={posicaoPin} setPosicaoPin={setPosicaoPin} />
                      <div style={{ position: 'absolute', bottom: '5px', left: '10px', zIndex: 400, background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', color: 'var(--success-green)', fontFamily: 'var(--font-mono)' }}>satellite hd: Posicione o pino verde sobre o telhado</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <label className="checkbox-label" style={{ marginBottom: '10px', marginTop: '0' }}>
                        <input type="checkbox" className="checkbox-input" required checked={aceiteIdade} onChange={e => setAceiteIdade(e.target.checked)} />
                        Confirmo ter mais de 18 anos de idade e capacidade civil para contratação.
                      </label>
                      <label className="checkbox-label" style={{ marginBottom: '0', marginTop: '0' }}>
                        <input type="checkbox" className="checkbox-input" required checked={aceiteLgpd} onChange={e => setAceiteLgpd(e.target.checked)} />
                        Aceito os termos da LGPD para processamento da viabilidade.
                      </label>
                    </div>

                    <div className="nav-buttons">
                      <button type="button" onClick={voltarEtapa} className="btn-back"><ArrowLeft size={18}/> Voltar</button>
                      <button type="submit" className="btn-check"><Search size={18}/> Verificar Viabilidade</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ===================== TELA DE CARREGAMENTO ===================== */}
            {telaAtiva === 'LOADER' && (
              <div id="loader-screen" className="loader-overlay">
                <div className="city-fiber-animation">
                  <div className="skyline">
                    <div className="building b1"></div><div className="building b2"></div><div className="building b3"><div className="antenna"></div></div>
                    <div className="building b4"></div><div className="building b5"></div><div className="building b6"><div className="antenna"></div></div><div className="building b7"></div>
                  </div>
                  <div className="ground"></div>
                  <div className="underground">
                    <div className="fiber-line"></div><div className="light-pulse"></div>
                    <div className="node n1"></div><div className="node n2"></div><div className="node n3"></div>
                  </div>
                </div>
                <div className="loader-status-container">
                  <div className="loader-text-highlight">{loaderText}</div>
                  <div className="loader-subtext">Criptografia ponto a ponto ativada</div>
                </div>
              </div>
            )}

            {/* ===================== TELA DE SUCESSO ===================== */}
            {telaAtiva === 'SUCCESS' && (
              <div id="result-success" className="result-screen" style={{display: 'block'}}>
                <div className="result-badge badge-success">✓ 100% Fibra Óptica Ativa</div>
                <h2 className="result-title"><span style={{color: 'var(--success-green)'}}>Ótima Notícia!</span> Temos Cobertura no Seu Endereço.</h2>
                <p className="result-desc">A malha de altíssima performance da V5 Internet já está pronta para ser instalada na sua residência.</p>
                <div className="address-box">
                  <strong>Endereço Confirmado:</strong><br/>{cep}, Nº {numero}
                </div>
                
                <div className="bonus-box">
                  <div className="bonus-header">
                    <span className="bonus-title">🔓 Benefícios Liberados</span>
                    <span className="timer-badge">{timerText}</span>
                  </div>
                  <div className="bonus-item"><span className="bonus-item-icon">✓</span><div><strong>Taxa de Instalação:</strong> <span className="price-strike">R$ 250,00</span> <span className="price-free">R$ 0,00</span></div></div>
                  <div className="bonus-item"><span className="bonus-item-icon">✓</span><div><strong>Roteador Gigabit:</strong> <span className="price-strike">R$ 400,00</span> <span className="price-free">Grátis</span></div></div>
                  <div className="bonus-item"><span className="bonus-item-icon">✓</span><div><strong>Status Fura-Fila:</strong> Instalação prioritária garantida.</div></div>
                </div>
                <a href={`https://api.whatsapp.com/send/?phone=556194193617&text=${encodeURIComponent(`Olá! Fiz o teste de viabilidade para o CEP ${cep} e garanti meus bônus (Instalação e Roteador Grátis). Quero ver os planos!`)}`} target="_blank" className="btn-whatsapp">Resgatar Bônus pelo WhatsApp</a>
                <div><button className="btn-reset" onClick={resetForm}>Fazer Nova Consulta</button></div>
              </div>
            )}

            {/* ===================== TELA DE EXPANSÃO ===================== */}
            {telaAtiva === 'EXPANSION' && (
              <div id="result-expansion" className="result-screen" style={{display: 'block'}}>
                <div className="result-badge badge-expansion">⚠ Endereço Fora da Malha Atual</div>
                <h2 className="result-title">Sua Região Está na Lista de Expansão!</h2>
                <p className="result-desc">Infelizmente nossa fibra ainda não atende este endereço exato. Registramos sua demanda no nosso mapa de prioridade.</p>
                <div className="address-box">
                  <strong>Endereço Registado:</strong><br/>{cep}, Nº {numero}
                </div>
                <a href={`https://api.whatsapp.com/send/?phone=556194193617&text=${encodeURIComponent(`Olá! Fiz o teste no CEP ${cep} e vi que minha região está na lista de expansão. Quero ser avisado quando chegar!`)}`} target="_blank" className="btn-whatsapp btn-expansion-color">Acompanhar Expansão (WhatsApp)</a>
                <div><button className="btn-reset" onClick={resetForm}>Fazer Nova Consulta</button></div>
              </div>
            )}

          </div>
        </div>

        {/* SECÇÃO DE PLANOS (APARECE APENAS SE HOUVER SUCESSO) */}
        {telaAtiva === 'SUCCESS' && (
          <div className="v5-pricing-section">
            <div className="v5-pricing-header">
              <h2 className="v5-pricing-title">Planos de Ultra Velocidade</h2>
              <p className="v5-pricing-desc">Escolha a conexão ideal para o seu perfil. Todos os planos contam com fibra óptica pura.</p>
            </div>

            <div className="v5-pricing-grid">
              <div className="v5-pricing-card">
                <div className="v5-card-content">
                  <span className="v5-plan-name">400 MEGAS</span>
                  <div className="v5-plan-price"><span className="v5-currency">R$</span><span className="v5-amount">100</span><span className="v5-cents">,99</span><span className="v5-period">/ mês</span></div>
                  <p className="v5-plan-sub">Ideal para assistir séries e estudar</p>
                  <ul className="v5-feature-list">
                    <li><span className="v5-check">✓</span> Download 400 Mbps</li><li><span className="v5-check">✓</span> Upload simétrico</li><li><span className="v5-check">✓</span> Wi-Fi de alta performance</li>
                  </ul>
                  <hr className="v5-divider"/>
                  <a href={`https://api.whatsapp.com/send/?phone=556194193617&text=${encodeURIComponent(`Quero o plano de 400 Megas! Meu CEP é ${cep}.`)}`} target="_blank" className="v5-btn v5-btn-outline">Contratar Agora</a>
                </div>
              </div>

              <div className="v5-pricing-card v5-popular">
                <div className="v5-popular-badge">Mais Vendido</div>
                <div className="v5-card-content">
                  <span className="v5-plan-name">600 MEGAS</span>
                  <div className="v5-plan-price"><span className="v5-currency">R$</span><span className="v5-amount">130</span><span className="v5-cents">,99</span><span className="v5-period">/ mês</span></div>
                  <p className="v5-plan-sub">Para gamers, 4K e família conectada</p>
                  <ul className="v5-feature-list">
                    <li><span className="v5-check">✓</span> Download 600 Mbps</li><li><span className="v5-check">✓</span> Prioridade na rede</li><li><span className="v5-check">✓</span> Wi-Fi 6 incluído</li>
                  </ul>
                  <hr className="v5-divider"/>
                  <a href={`https://api.whatsapp.com/send/?phone=556194193617&text=${encodeURIComponent(`Quero o plano de 600 Megas (Mais Vendido)! Meu CEP é ${cep}.`)}`} target="_blank" className="v5-btn v5-btn-primary">Contratar Agora</a>
                </div>
              </div>

              <div className="v5-pricing-card">
                <div className="v5-card-content">
                  <span className="v5-plan-name">CORPORATIVO</span>
                  <div className="v5-plan-price" style={{ fontSize: '2.2rem', fontWeight: 800, margin: '1.5rem 0', color: '#09A05C' }}>Sob Consulta</div>
                  <p className="v5-plan-sub">A conexão que sua empresa precisa</p>
                  <ul className="v5-feature-list">
                    <li><span className="v5-check">✓</span> Atendimento dedicado</li><li><span className="v5-check">✓</span> SLA garantido em contrato</li><li><span className="v5-check">✓</span> IP Fixo Opcional</li>
                  </ul>
                  <hr className="v5-divider"/>
                  <a href={`https://api.whatsapp.com/send/?phone=556194193617&text=${encodeURIComponent(`Gostaria de um orçamento Corporativo. Meu CNPJ fica no CEP ${cep}.`)}`} target="_blank" className="v5-btn v5-btn-outline">Solicitar Orçamento</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}