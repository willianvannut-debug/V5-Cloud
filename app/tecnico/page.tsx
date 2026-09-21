// ================================================================================
// 📋 ROTA DO TÉCNICO (PRINCIPAL) - V5 CLOUD
// app/tecnico/page.tsx
// ================================================================================

"use client"
import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Wrench, RefreshCw, X, AlertTriangle, CheckCircle2, XCircle, Navigation } from 'lucide-react';
import { useSettings, SettingsProvider } from '@/context/SettingsContext';
import { useApp, AppProvider } from '@/context/AppContext';
import { lerOperacional, salvarOperacional } from '@/lib/operacional';

const Mapa = dynamic(() => import('./Mapa'), { 
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#10b981', fontFamily: 'monospace', fontSize: '12px' }}>
      Sincronizando coordenadas da rede...
    </div>
  )
});

function PainelTecnicoMobile() {
  const settings = useSettings() as any;
  const { leads, recarregarLeads } = useApp() as any;
  
  const [ctosFinais, setCtosFinais] = useState<any[]>([]);
  const [leadsFinais, setLeadsFinais] = useState<any[]>([]);
  
  const [isMounted, setIsMounted] = useState(false);
  const [centroMapa, setCentroMapa] = useState<[number, number] | null>(null);
  const [mapaPronto, setMapaPronto] = useState(false);

  const [mostrarAlertaTecnico, setMostrarAlertaTecnico] = useState(false);
  const totalLeadsAnteriorRef = useRef<number>(0);
  const isInitialMount = useRef<boolean>(true);

  const [instalacaoAtiva, setInstalacaoAtiva] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const carregarDados = async () => {
    const ctosNuvem = settings?.ctos;
    const leadsNuvem = leads;

    let ctosParaUsar = [];
    let leadsParaUsar = [];

    if (ctosNuvem && ctosNuvem.length >= 0) { 
      ctosParaUsar = ctosNuvem;
      try { localStorage.setItem('v5_cache_ctos', JSON.stringify(ctosNuvem)); } catch(e) {}
    } else {
      try {
        const cacheCtos = localStorage.getItem('v5_cache_ctos');
        if (cacheCtos) ctosParaUsar = JSON.parse(cacheCtos);
      } catch(e) {}
    }

    if (leadsNuvem && leadsNuvem.length >= 0) {
      leadsParaUsar = leadsNuvem;
      try { localStorage.setItem('v5_cache_leads', JSON.stringify(leadsNuvem)); } catch(e) {}
    } else {
      try {
        const cacheLeads = localStorage.getItem('v5_cache_leads');
        if (cacheLeads) leadsParaUsar = JSON.parse(cacheLeads);
      } catch(e) {}
    }

    let salvosOperacionais = [];
    try {
      salvosOperacionais = await lerOperacional();
    } catch (e) {}

    const listaLeads = (leadsParaUsar || []).map((l: any) => {
      const encontrado = salvosOperacionais.find((p: any) => p.id === l.id);
      // 🚀 CORREÇÃO CRÍTICA: Mescla apenas status operacionais, nunca sobreescreve a etapa do PC!
      if (encontrado) {
        return {
          ...l,
          statusOperacional: encontrado.statusOperacional || l.statusOperacional,
          status_instalacao: encontrado.status_instalacao || l.status_instalacao,
          motivo_pendencia: encontrado.motivo_pendencia || l.motivo_pendencia
        };
      }
      return l;
    });

    const apenasAtivosParaInstalacao = listaLeads.filter((item: any) => {
      if (!item || !item.lat || !item.lon) return false;
      
      const jaConcluido = item.status_instalacao === 'CONCLUIDA' || item.statusOperacional === 'CONCLUIDA';
      const naoConvertido = String(item.etapa_funil).toUpperCase() === 'NAO CONVERTIDO' || String(item.etapa_funil).toUpperCase() === 'NÃO CONVERTIDO';

      return !jaConcluido && !naoConvertido;
    });

    const idSalvoNaMemoria = localStorage.getItem('v5_instalacao_em_progresso');
    if (idSalvoNaMemoria) {
      const leadTravado = apenasAtivosParaInstalacao.find((l: any) => l.id === idSalvoNaMemoria);
      if (leadTravado) {
        setInstalacaoAtiva(leadTravado); 
      }
    }

    if (isInitialMount.current) {
      totalLeadsAnteriorRef.current = apenasAtivosParaInstalacao.length;
      isInitialMount.current = false;
    } else if (apenasAtivosParaInstalacao.length > totalLeadsAnteriorRef.current) {
      setMostrarAlertaTecnico(true);
    }
    totalLeadsAnteriorRef.current = apenasAtivosParaInstalacao.length;

    setCtosFinais(ctosParaUsar);
    setLeadsFinais(apenasAtivosParaInstalacao);
  };

  useEffect(() => {
    if (!isMounted) return; 

    carregarDados();

    const intervaloAutomatico = setInterval(async () => {
      if (typeof recarregarLeads === 'function') {
        try {
          await recarregarLeads(); 
        } catch (err) {}
      }
      carregarDados();
    }, 4000); 

    return () => clearInterval(intervaloAutomatico);
  }, [settings?.ctos, leads, recarregarLeads, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const timer = setTimeout(() => {
      setMapaPronto(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    let lat = -15.7641; 
    let lon = -48.2743;

    if (leadsFinais.length > 0 && leadsFinais[0].lat && leadsFinais[0].lon) {
      lat = Number(leadsFinais[0].lat);
      lon = Number(leadsFinais[0].lon);
    } else if (ctosFinais.length > 0 && ctosFinais[0].lat && ctosFinais[0].lon) {
      lat = Number(ctosFinais[0].lat);
      lon = Number(ctosFinais[0].lon);
    }

    setCentroMapa([lat, lon]);
  }, [isMounted, leadsFinais, ctosFinais]);

  const finalizarInstalacao = async (statusFinal: 'CONCLUIDA' | 'PENDENTE') => {
    let motivo = '';
    if (statusFinal === 'PENDENTE') {
      motivo = window.prompt('Qual o motivo de não ter feito a instalação?') || '';
      if (!motivo.trim()) return;
    }

    if (instalacaoAtiva?.id) {
      await salvarOperacional(instalacaoAtiva.id, {
        status_instalacao: statusFinal === 'CONCLUIDA' ? 'CONCLUIDA' : 'PENDENTE',
        statusOperacional: statusFinal === 'CONCLUIDA' ? 'CONCLUIDA' : 'PENDENTE',
        motivo_pendencia: motivo,
      });
    }

    localStorage.removeItem('v5_instalacao_em_progresso');
    setInstalacaoAtiva(null);
    carregarDados();
  };

  if (!isMounted) return null; 

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
      
      {/* TELA DE BLOQUEIO DE PROGRESSO */}
      {instalacaoAtiva && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#09090b', zIndex: 9999999, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '16px' }}>
              <AlertTriangle size={24} />
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', margin: 0 }}>INSTALAÇÃO EM PROGRESSO</h2>
            </div>
            
            <p style={{ color: '#a1a1aa', fontSize: '14px', fontFamily: 'sans-serif', marginBottom: '24px', lineHeight: '1.5' }}>
              Você recarregou a página ou fechou o app, mas o atendimento de <strong style={{ color: '#fff' }}>{instalacaoAtiva.nome || 'Cliente'}</strong> ainda está rolando. Finalize o serviço abaixo para liberar o mapa.
            </p>

            <div style={{ backgroundColor: '#18181b', border: '1px solid #27272a', padding: '16px', borderRadius: '12px', marginBottom: '32px' }}>
              <p style={{ color: '#fff', margin: '0 0 8px 0', fontFamily: 'monospace', fontSize: '13px' }}><strong>Endereço:</strong> {instalacaoAtiva.endereco || 'Não informado'}</p>
              <p style={{ color: '#fff', margin: 0, fontFamily: 'monospace', fontSize: '13px' }}><strong>Contato:</strong> {instalacaoAtiva.telefone || 'Não informado'}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button 
                onClick={() => finalizarInstalacao('CONCLUIDA')}
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '14px', cursor: 'pointer' }}>
                <CheckCircle2 size={20} /> INSTALAÇÃO CONCLUÍDA
              </button>

              <button 
                onClick={() => finalizarInstalacao('PENDENTE')}
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '14px', cursor: 'pointer' }}>
                <XCircle size={20} /> NÃO FOI POSSÍVEL INSTALAR
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AVISO FLUTUANTE */}
      {mostrarAlertaTecnico && !instalacaoAtiva && (
        <div style={{ position: 'absolute', top: '60px', right: '16px', zIndex: 999999, maxWidth: '320px', backgroundColor: '#09090b', border: '1px solid rgba(16, 185, 129, 0.8)', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 0 25px rgba(16,185,129,0.3)', color: '#f4f4f5', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Wrench size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#34d399', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Aviso de Campo</span>
                <button onClick={() => setMostrarAlertaTecnico(false)} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 0 }}>
                  <X size={14} />
                </button>
              </div>
              <h4 style={{ fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff', margin: '2px 0 0 0' }}>Nova Instalação Disponível!</h4>
              <p style={{ fontSize: '10px', color: '#a1a1aa', fontFamily: 'monospace', margin: '2px 0 0 0' }}>Um novo cliente foi cadastrado para atendimento.</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SIMPLES */}
      <div style={{ height: '50px', backgroundColor: '#000', borderBottom: '1px solid #27272a', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={16} color="#10b981" />
          <h1 style={{ fontSize: '10px', fontWeight: 'bold', color: '#fff', margin: 0, fontFamily: 'monospace', textTransform: 'uppercase' }}>
            V5 Técnico - Campo (API Synced)
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', fontFamily: 'monospace', backgroundColor: '#18181b', border: '1px solid #27272a', padding: '4px 6px', borderRadius: '6px', color: '#60a5fa', fontWeight: 'bold' }}>
            {ctosFinais.length} CTO
          </span>
          <span style={{ fontSize: '9px', fontFamily: 'monospace', backgroundColor: '#18181b', border: '1px solid #27272a', padding: '4px 6px', borderRadius: '6px', color: '#10b981', fontWeight: 'bold' }}>
            {leadsFinais.filter((l: any) => String(l.etapa_funil).toUpperCase() === 'MANDAR PARA INSTALAÇÃO').length} Instalações
          </span>
          <button 
            onClick={carregarDados}
            style={{ background: '#27272a', border: 'none', borderRadius: '6px', padding: '6px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Atualizar dados"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* MAPA OCUPANDO 100% DA TELA */}
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%) !important; }
        `}} />
        
        {mapaPronto && centroMapa ? (
          <Mapa centroMapa={centroMapa} ctos={ctosFinais} leads={leadsFinais} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#10b981', fontFamily: 'monospace', fontSize: '12px' }}>
            Montando mapa tático offline...
          </div>
        )}

      </div>
    </div>
  );
}

export default function TecnicoPageWrapper() {
  return (
    <SettingsProvider>
      <AppProvider>
        <PainelTecnicoMobile />
      </AppProvider>
    </SettingsProvider>
  );
}