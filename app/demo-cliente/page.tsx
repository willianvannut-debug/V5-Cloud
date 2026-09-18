"use client"
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

// 🚀 O SEGREDO ESTÁ AQUI: Importamos o ficheiro novo de forma estritamente dinâmica.
// A Vercel vai ignorá-lo no build estático.
const MapaDinamico = dynamic(() => import('./MapaLeaflet'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#121318] text-[#62c073] font-mono text-xs">
      Carregando imagens de satélite...
    </div>
  )
});

import { useApp, AppProvider } from '@/context/AppContext'; 
import { useSettings, SettingsProvider } from '@/context/SettingsContext'; 

const calcularDistanciaEmMetros = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

function DemoClienteContent() {
  const { adicionarLead } = useApp(); 
  const settings = useSettings(); 
  const ctos = settings?.ctos || [];

  const [isMounted, setIsMounted] = useState(false);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [enderecoPreview, setEnderecoPreview] = useState('');
  const [dadosEndereco, setDadosEndereco] = useState<any>({ logradouro: '', bairro: '', localidade: '', uf: '' });
  
  const [tela, setTela] = useState<'form' | 'loader' | 'sucesso' | 'expansao'>('form');
  const [loaderText, setLoaderText] = useState('Iniciando varredura na rede V5...');
  const [timer, setTimer] = useState(15 * 60);

  const [coordsPin, setCoordsPin] = useState<[number, number]>([-15.7641, -48.2743]);
  const [pinDefinido, setPinDefinido] = useState(false);
  const [modoMapaAberto, setModoMapaAberto] = useState(false);

  const [distanciaDrop, setDistanciaDrop] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (tela !== 'sucesso') return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tela]);

  const formatarCep = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5, 8);
    setCep(v);
    if (v.replace(/\D/g, '').length === 8) {
      buscarCEP(v.replace(/\D/g, ''));
    }
  };

  const formatarWhatsapp = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 6) v = `(${v.substring(0,2)}) ${v.substring(2,7)}-${v.substring(7)}`;
    else if (v.length > 2) v = `(${v.substring(0,2)}) ${v.substring(2)}`;
    setWhatsapp(v);
  };

  const buscarCEP = async (cepLimpo: string) => {
    setEnderecoPreview('Buscando endereço e geolocalização...');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setEnderecoPreview('CEP não encontrado.');
        return;
      }
      setDadosEndereco(data);
      setEnderecoPreview(`${data.logradouro ? data.logradouro + ', ' : ''}${data.bairro} - ${data.localidade}/${data.uf}`);

      const queryGeo = encodeURIComponent(`${data.logradouro || data.bairro}, ${data.localidade} - ${data.uf}, Brasil`);
      const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryGeo}&limit=1`);
      const dataGeo = await resGeo.json();
      
      if (dataGeo && dataGeo.length > 0) {
        setCoordsPin([parseFloat(dataGeo[0].lat), parseFloat(dataGeo[0].lon)]);
      }
    } catch (e) {
      setEnderecoPreview('Erro ao buscar dados do endereço.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinDefinido) {
      alert('Por favor, clique em "Marcar Localização Exata no Mapa" e confirme o pin exatamente em cima da sua casa para continuar.');
      setModoMapaAberto(true);
      return;
    }

    setTela('loader');
    const etapas = ['Localizando CTO mais próxima...', 'Calculando rota do cabo pelos postes...', 'Sincronizando viabilidade...'];
    let index = 0;
    const interval = setInterval(() => {
      if (index < etapas.length) {
        setLoaderText(etapas[index]);
        index++;
      } else {
        clearInterval(interval);
        finalizarAnaliseReal();
      }
    }, 1200);
  };

  const finalizarAnaliseReal = async () => {
    let temCobertura = false;
    let ctoMaisProximaNome = 'Sem Infraestrutura Próxima';
    let menorDistanciaMetros = Infinity;

    if (ctos && ctos.length > 0) {
      ctos.forEach((cto: any) => {
        if (cto.lat !== undefined && cto.lon !== undefined) {
          const distanciaReta = calcularDistanciaEmMetros(coordsPin[0], coordsPin[1], cto.lat, cto.lon);
          const distanciaCaboDrop = distanciaReta * 1.4;

          if (distanciaCaboDrop < menorDistanciaMetros) {
            menorDistanciaMetros = distanciaCaboDrop;
            ctoMaisProximaNome = cto.identificacao || 'CTO da Rua';
          }
        }
      });

      if (menorDistanciaMetros <= 250) {
        temCobertura = true;
      }
    }

    setDistanciaDrop(menorDistanciaMetros);

    const enderecoFormatado = `${dadosEndereco.logradouro || ''}, Nº ${numero} - ${dadosEndereco.bairro || ''}`;
    
    await adicionarLead({
      nome: nome,
      telefone: whatsapp,
      cep: cep,
      endereco: enderecoFormatado,
      status: temCobertura ? 'COM COBERTURA' : 'SEM COBERTURA',
      cto: temCobertura ? ctoMaisProximaNome : 'Não Alcançada',
      plano: 'Não definido',
      data: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      lat: coordsPin[0],
      lon: coordsPin[1],
    });

    if (temCobertura) {
      setTela('sucesso');
    } else {
      setTela('expansao');
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans flex flex-col items-center p-4 lg:p-12 relative overflow-x-hidden">
      
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 50% 10%, rgba(98, 192, 115, 0.08) 0%, transparent 50%), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 40px 40px, 40px 40px'
      }}></div>

      <div className="w-full max-w-[700px] z-10">
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-[#62c073]/10 border border-[#62c073]/30 px-4 py-1.5 rounded-full font-mono text-xs text-[#62c073] uppercase tracking-widest">
            <span className="w-2 h-2 bg-[#62c073] rounded-full shadow-[0_0_10px_#62c073] animate-pulse"></span>
            Verificação de Malha de Fibra V5
          </div>
        </div>

        <div className="bg-[#121318] border border-white/10 rounded-2xl p-6 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
          
          {tela === 'form' && (
            <div>
              <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tight mb-2 text-white">Testar Cobertura</h1>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                Informe seu CEP, dados e posicione o pin exatamente em cima da sua casa na imagem de satélite para consultar a disponibilidade da ultravelocidade V5.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">Nome Completo</label>
                    <input 
                      type="text" 
                      value={nome} 
                      onChange={e => setNome(e.target.value)}
                      placeholder="Seu nome" 
                      required 
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#62c073] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">WhatsApp</label>
                    <input 
                      type="tel" 
                      value={whatsapp} 
                      onChange={e => formatarWhatsapp(e.target.value)}
                      placeholder="(61) 99999-9999" 
                      required 
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#62c073] transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">CEP</label>
                    <input 
                      type="text" 
                      value={cep} 
                      onChange={e => formatarCep(e.target.value)}
                      placeholder="72910-000" 
                      maxLength={9} 
                      required 
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#62c073] transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">Número da Residência</label>
                    <input 
                      type="text" 
                      value={numero} 
                      onChange={e => setNumero(e.target.value)}
                      placeholder="Ex: Qd 10 Lote 05" 
                      required 
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#62c073] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">Endereço Detectado</label>
                  <input 
                    type="text" 
                    value={enderecoPreview} 
                    placeholder="Digite o CEP acima..." 
                    readOnly 
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white/70 text-sm opacity-70 cursor-not-allowed font-mono"
                  />
                </div>

                <div className="pt-2">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">Localização Exata na Imagem (Obrigatório)</label>
                  <button 
                    type="button"
                    onClick={() => setModoMapaAberto(true)}
                    className={`w-full font-mono font-bold text-xs py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      pinDefinido 
                        ? 'bg-[#62c073]/20 border-[#62c073] text-[#62c073]' 
                        : 'bg-zinc-900 hover:bg-zinc-800 border-red-500/60 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    }`}
                  >
                    <MapPin className="w-4 h-4" /> 
                    {pinDefinido ? '✓ Pin Posicionado no Satélite (Clique para ajustar)' : '⚠️ Marcar Casa Exata na Imagem de Satélite'}
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#62c073] hover:bg-white text-black font-black py-4 px-6 rounded-lg uppercase tracking-wider text-sm transition-all shadow-[0_10px_25px_rgba(98,192,115,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  Consultar Disponibilidade ➔
                </button>
              </form>
            </div>
          )}

          {tela === 'loader' && (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="relative w-full max-w-[300px] h-[100px] mb-6 flex items-end justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#62c073]/20 border-t-[#62c073] rounded-full animate-spin"></div>
                </div>
              </div>
              <div className="font-mono text-sm font-extrabold text-[#62c073] uppercase tracking-wider mb-2">
                {loaderText}
              </div>
              <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest animate-pulse">
                Cálculo georreferenciado em andamento
              </p>
            </div>
          )}

          {tela === 'sucesso' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="inline-block bg-[#62c073]/15 border border-[#62c073] text-[#62c073] font-mono text-xs font-extrabold px-3.5 py-1.5 rounded uppercase tracking-wider">
                ✓ 100% Fibra Óptica Ativa
              </div>

              <h2 className="text-2xl lg:text-3xl font-black uppercase text-white leading-tight">
                <span className="text-[#62c073]">Ótima Notícia!</span> Temos Cobertura no Seu Endereço.
              </h2>

              <p className="text-zinc-400 text-sm leading-relaxed">
                A malha da V5 Internet está pronta para ser instalada. Nossa CTO mais próxima tem rota viável até a sua residência.
              </p>

              <div className="bg-black/40 border border-white/10 border-l-4 border-l-[#62c073] p-4 rounded-lg font-mono text-xs space-y-1.5 text-zinc-300">
                <p><strong>Endereço:</strong> {dadosEndereco.logradouro || 'Endereço informado'}, Nº {numero}</p>
                <p><strong>Bairro:</strong> {dadosEndereco.bairro || 'N/A'}</p>
                <p className="text-[#62c073] font-bold mt-2 pt-2 border-t border-white/10">
                  ⚡ Previsão de Cabo Drop: {distanciaDrop.toFixed(0)} metros
                </p>
              </div>

              <a 
                href={`https://api.whatsapp.com/send/?phone=556194193617&text=${encodeURIComponent(`Olá! Fiz o teste no site e garanti meus bônus.\n\nNome: ${nome}\nEndereço: ${dadosEndereco.logradouro}, Nº ${numero} - ${dadosEndereco.bairro} (${dadosEndereco.localidade}/${dadosEndereco.uf})\nMetragem Calculada:${distanciaDrop.toFixed(0)}m\n\nGostaria de usar meu benefício Fura-Fila!`)}`} 
                target="_blank" 
                rel="noreferrer"
                className="w-full bg-[#62c073] hover:bg-white text-black font-black py-4 px-6 rounded-lg uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(98,192,115,0.3)] text-center cursor-pointer"
              >
                RESGATAR BÔNUS PELO WHATSAPP ➔
              </a>

              <button 
                onClick={() => setTela('form')} 
                className="w-full bg-transparent text-zinc-400 hover:text-white font-mono text-xs uppercase tracking-widest underline pt-2 cursor-pointer border-none"
              >
                Nova Consulta
              </button>
            </div>
          )}

          {tela === 'expansao' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="inline-block bg-orange-500/15 border border-orange-500 text-orange-400 font-mono text-xs font-extrabold px-3.5 py-1.5 rounded uppercase tracking-wider">
                ⚠ Fora da Área de Atendimento
              </div>

              <h2 className="text-2xl font-black uppercase text-white leading-tight">
                Sua Região Está Cadastrada na Lista de Expansão!
              </h2>

              <p className="text-zinc-400 text-sm leading-relaxed">
                Infelizmente nossa rede não alcança sua casa ainda. A rota exige mais cabo do que o limite permitido ({distanciaDrop === Infinity ? 'Sem Caixas na Infra' : distanciaDrop.toFixed(0) + ' metros'}).
              </p>

              <div className="bg-black/40 border border-white/10 p-4 rounded-lg font-mono text-xs space-y-1 text-zinc-300">
                <p><strong>CEP:</strong> {cep}</p>
                <p><strong>Cidade:</strong> {dadosEndereco.localidade || 'N/A'} - {dadosEndereco.uf || ''}</p>
              </div>

              <a 
                href={`https://api.whatsapp.com/send/?phone=556194193617&text=${encodeURIComponent(`Olá! Fiz o teste no site e vi que minha região (${dadosEndereco.bairro}/${dadosEndereco.localidade}) está na lista de expansão.\n\nNome: ${nome}\nCEP:${cep}\n\nGostaria de avisar meu interesse quando a rede chegar no meu bairro!`)}`} 
                target="_blank" 
                rel="noreferrer"
                className="w-full bg-orange-500 hover:bg-orange-400 text-black font-black py-4 px-6 rounded-lg uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
              >
                Acompanhar Expansão pelo WhatsApp
              </a>

              <button 
                onClick={() => setTela('form')} 
                className="w-full bg-transparent text-zinc-400 hover:text-white font-mono text-xs uppercase tracking-widest underline pt-2 cursor-pointer border-none"
              >
                Nova Consulta
              </button>
            </div>
          )}

        </div>
      </div>

      {modoMapaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121318] border border-white/25 w-full max-w-4xl h-[600px] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 bg-zinc-900 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="text-[#62c073] w-5 h-5 animate-bounce" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  {dadosEndereco.localidade ? `${dadosEndereco.localidade} — Clique exatamente no telhado da sua casa` : 'Clique exatamente no telhado da sua casa'}
                </span>
              </div>
              <button 
                onClick={() => {
                  setPinDefinido(true);
                  setModoMapaAberto(false);
                }}
                className="bg-[#62c073] hover:bg-white text-black font-mono font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer transition-all shadow-lg"
              >
                Confirmar Localização ✓
              </button>
            </div>
            
            <div className="flex-1 relative">
              <MapaDinamico coords={coordsPin} setCoords={setCoordsPin} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DemoClientePage() {
  return (
    <SettingsProvider>
      <AppProvider>
        <DemoClienteContent />
      </AppProvider>
    </SettingsProvider>
  );
}