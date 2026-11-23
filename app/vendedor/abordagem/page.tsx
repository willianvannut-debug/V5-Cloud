'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  User,
  Phone,
  Hash,
  Save,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Navigation,
  AlertCircle,
} from 'lucide-react';
import { painelApi } from '@/lib/painel-api';

export default function NovaAbordagemPage() {
  const router = useRouter();

  // Campos alinhados exatamente com a sua tabela public.leads
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [statusAbordagem, setStatusAbordagem] = useState<'interessado' | 'sem_viabilidade' | 'ausente'>('interessado');

  // Coordenadas GPS (lat / lon)
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [erroGps, setErroGps] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Botão explícito para pegar Latitude e Longitude atual (com fallback seguro)
  const pegarLocalizacaoAtual = () => {
    setBuscandoGps(true);
    setErroGps('');

    if (!navigator.geolocation) {
      setErroGps('GPS não suportado neste celular/navegador.');
      setBuscandoGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setBuscandoGps(false);
      },
      (err) => {
        console.warn('Aviso de GPS:', err);
        setErroGps('GPS bloqueado pelo navegador/HTTPS. Usando modo manual ou sem coordenadas.');
        setBuscandoGps(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  // Envia para o Supabase nas colunas exatas da tabela public.leads
  const salvarAbordagem = async (irParaFechamento: boolean) => {
    if (!nome.trim() || !whatsapp.trim()) {
      alert('Preencha pelo menos o Nome e o WhatsApp do cliente.');
      return;
    }

    if (!coords) {
      const confirmarSemGps = confirm(
        'Você ainda não pegou a localização GPS desta casa (ela não aparecerá no mapa do sistema). Deseja salvar mesmo assim?'
      );
      if (!confirmarSemGps) return;
    }

    setSalvando(true);
    try {
      let data: any = null;
      try {
        const r = await painelApi<{ lead: any }>('leads-abordagem', { body: {
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          cep: cep.trim() || null,
          numero: numero.trim() || null,
          status: irParaFechamento ? 'em_fechamento' : statusAbordagem,
          lat: coords?.lat || null,
          lon: coords?.lon || null,
          motivo_perda: statusAbordagem !== 'interessado' ? motivoPerda.trim() || statusAbordagem : null,
        } });
        data = r.lead;
      } catch (e: any) {
        alert(`Erro ao salvar lead: ${e.message}`);
        setSalvando(false);
        return;
      }

      if (irParaFechamento && data?.id) {
        router.push(`/vendedor/fechamento?leadId=${data.id}`);
      } else {
        router.push('/vendedor');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado ao registrar abordagem.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-white leading-tight">Nova Abordagem PAP</h2>
          <p className="text-xs text-slate-400">Marque o pino no mapa e salve o lead</p>
        </div>
      </div>

      {/* BOTÃO DE CAPTURA DE LATITUDE E LONGITUDE PARA O MAPA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <button
          type="button"
          onClick={pegarLocalizacaoAtual}
          disabled={buscandoGps}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] ${
            coords
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20'
          }`}
        >
          {buscandoGps ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Pegando Latitude e Longitude...
            </>
          ) : coords ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Localização Capturada (Atualizar)
            </>
          ) : (
            <>
              <Navigation className="h-5 w-5" />
              Pegar Localização Atual (GPS)
            </>
          )}
        </button>

        {/* Exibição das coordenadas que irão para o mapa do sistema */}
        {coords && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
              <span className="text-[10px] uppercase text-slate-500 block">Latitude (lat)</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{coords.lat.toFixed(6)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
              <span className="text-[10px] uppercase text-slate-500 block">Longitude (lon)</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{coords.lon.toFixed(6)}</span>
            </div>
          </div>
        )}

        {erroGps && (
          <p className="text-xs text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erroGps}
          </p>
        )}
      </div>

      {/* Formulário Rápido */}
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* Nome */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-emerald-400" />
            Nome do Cliente *
          </label>
          <input
            type="text"
            placeholder="Ex: Maria Oliveira"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition"
          />
        </div>

        {/* WhatsApp */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-emerald-400" />
            WhatsApp *
          </label>
          <input
            type="tel"
            placeholder="(61) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition"
          />
        </div>

        {/* CEP e Número da Casa lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              CEP
            </label>
            <input
              type="text"
              placeholder="72910-000"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-emerald-400" />
              Número / Lote
            </label>
            <input
              type="text"
              placeholder="Ex: Casa 14"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition"
            />
          </div>
        </div>

        {/* Resultado da Abordagem */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Situação na Porta</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatusAbordagem('interessado')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition ${
                statusAbordagem === 'interessado'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Interessado
            </button>
            <button
              type="button"
              onClick={() => setStatusAbordagem('ausente')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition ${
                statusAbordagem === 'ausente'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Não Estava
            </button>
            <button
              type="button"
              onClick={() => setStatusAbordagem('sem_viabilidade')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition ${
                statusAbordagem === 'sem_viabilidade'
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Sem Porta
            </button>
          </div>
        </div>

        {/* Campo condicional de Motivo (aparece se não fechou na hora) */}
        {statusAbordagem !== 'interessado' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Motivo / Observação (vai para motivo_perda)
            </label>
            <input
              type="text"
              placeholder="Ex: Casa fechada, retornar à tarde..."
              value={motivoPerda}
              onChange={(e) => setMotivoPerda(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition"
            />
          </div>
        )}

        {/* Botões Finais */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            disabled={salvando}
            onClick={() => salvarAbordagem(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 transition"
          >
            {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Fechar Plano Agora
          </button>

          <button
            type="button"
            disabled={salvando}
            onClick={() => salvarAbordagem(false)}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold py-3 px-4 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <Save className="h-4 w-4" />
            Salvar apenas como Lead
          </button>
        </div>
      </form>
    </div>
  );
}