// ================================================================================
// 📋 CONFIGURAÇÕES DO TÉCNICO - V5 CLOUD (COM POPUP VISUAL DE MÃO DOMINANTE)
// app/tecnico/config/page.tsx
// ================================================================================

"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, ArrowLeft, MapPin, Bell, RefreshCw, LogOut, Smartphone, Check, Hand, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function TecnicoConfigPage() {
  const router = useRouter();
  
  // 🚀 Puxa os dados dinâmicos diretamente do banco de dados/sessão
  const { operador, carregando } = useAuth() as any;

  // Estados locais para preferências
  const [gpsApp, setGpsApp] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('v5_pref_gps') || 'google';
    return 'google';
  });
  
  const [somAlertas, setSomAlertas] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('v5_pref_som') !== 'false';
    return true;
  });

  // Estados: Mão Dominante e Mão Única
  const [maoDominante, setMaoDominante] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('v5_pref_mao') || 'direita';
    return 'direita';
  });

  const [modoMaoUnica, setModoMaoUnica] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('v5_pref_mao_unica') === 'true';
    return false;
  });

  const [salvoFeedback, setSalvoFeedback] = useState(false);
  const [modalMaoAberto, setModalMaoAberto] = useState(false); // Estado para controlar o popup visual

  const salvarPreferencia = (chave: string, valor: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(chave, String(valor));
    }
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 2000);
  };

  const limparCacheLocal = () => {
    const confirmar = window.confirm("Deseja limpar o cache offline e ressincronizar com a nuvem?");
    if (!confirmar) return;
    
    localStorage.removeItem('v5_cache_ctos');
    localStorage.removeItem('v5_cache_leads');
    localStorage.removeItem('v5_leads_notificados_campo');
    alert("Cache limpo com sucesso! Retorne ao mapa para ressincronizar.");
    router.push('/tecnico');
  };

  const fazerLogout = async () => {
    const confirmou = window.confirm("Deseja realmente sair da conta?");
    if (!confirmou) return;

    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
      window.location.href = '/login';
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-zinc-100 flex flex-col font-sans overflow-y-auto z-[99999]">
      
      {/* HEADER DA PÁGINA */}
      <div className="h-14 bg-black border-b border-zinc-900 px-4 flex items-center justify-between sticky top-0 z-50">
        <button 
          onClick={() => router.push('/tecnico')}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 p-2 rounded-xl flex items-center gap-2 hover:border-emerald-500 transition-colors cursor-pointer text-xs font-mono font-bold"
        >
          <ArrowLeft size={16} /> Voltar ao Mapa
        </button>

        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-emerald-400" />
          <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Configurações</h1>
        </div>

        {salvoFeedback ? (
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
            <Check size={12} /> Salvo
          </span>
        ) : (
          <div className="w-16"></div>
        )}
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 max-w-xl w-full mx-auto p-4 space-y-6 pb-12">

        {/* PERFIL DO TÉCNICO LOGADO */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4 backdrop-blur">
          {carregando ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse"></div>
                <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse"></div>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-black text-lg">
                {operador?.nome ? operador.nome.charAt(0).toUpperCase() : 'T'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-white truncate">{operador?.nome}</h3>
                <p className="text-[11px] font-mono text-zinc-400 truncate">{operador?.email}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold uppercase">
                {operador?.role === 'tecnico' ? 'Técnico' : 'Ativo'}
              </span>
            </>
          )}
        </div>

        {/* INTERFACE & ACESSIBILIDADE */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold px-1">Interface & Acessibilidade</h2>
          
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
            
            {/* MÃO DOMINANTE COM BOTÃO PARA POPUP VISUAL */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Hand size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white">Mão Dominante</h4>
                  <p className="text-[11px] text-zinc-400">Inverte os botões de lado na tela.</p>
                </div>
              </div>

              <button
                onClick={() => setModalMaoAberto(true)}
                className="bg-black border border-zinc-700 hover:border-purple-500 text-purple-400 font-mono text-xs font-bold uppercase px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                {maoDominante === 'esquerda' ? 'Esquerda' : 'Direita'}
              </button>
            </div>

            <div className="h-[1px] bg-zinc-800/50 w-full my-1"></div>

            {/* MÃO ÚNICA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white">Modo Mão Única</h4>
                  <p className="text-[11px] text-zinc-400">Aproxima os botões para facilitar o clique.</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={modoMaoUnica}
                onChange={(e) => {
                  setModoMaoUnica(e.target.checked);
                  salvarPreferencia('v5_pref_mao_unica', e.target.checked);
                }}
                className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* PREFERÊNCIAS DE NAVEGAÇÃO E GPS */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold px-1">Navegação e GPS</h2>
          
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white">Aplicativo de GPS Padrão</h4>
                  <p className="text-[11px] text-zinc-400">Escolha o serviço para traçar rotas.</p>
                </div>
              </div>

              <select
                value={gpsApp}
                onChange={(e) => {
                  setGpsApp(e.target.value);
                  salvarPreferencia('v5_pref_gps', e.target.value);
                }}
                className="bg-black border border-zinc-700 text-xs font-mono text-blue-400 rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="google">Google Maps</option>
                <option value="waze">Waze</option>
              </select>
            </div>
          </div>
        </div>

        {/* NOTIFICAÇÕES E ALERTAS */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold px-1">Operacional & Alertas</h2>
          
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold text-white">Avisos de Novas Instalações</h4>
                  <p className="text-[11px] text-zinc-400">Notificar na tela quando houver novos leads.</p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={somAlertas}
                onChange={(e) => {
                  setSomAlertas(e.target.checked);
                  salvarPreferencia('v5_pref_som', e.target.checked);
                }}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* MANUTENÇÃO E CACHE */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold px-1">Sistema & Dados</h2>
          
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
            <button
              onClick={limparCacheLocal}
              className="w-full bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs font-bold uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} className="text-emerald-400" /> Sincronizar / Limpar Cache Offline
            </button>
          </div>
        </div>

        {/* BOTÃO DE SAIR DA CONTA */}
        <div className="pt-4">
          <button
            onClick={fazerLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-xs font-bold uppercase py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          >
            <LogOut size={16} /> Sair da Conta (Logout)
          </button>
        </div>

        <div className="text-center pt-2">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            V5 Telecom Cloud • Tático v2.6
          </span>
        </div>

      </div>

      {/* 🔴 MODAL POPUP VISUAL: ESCOLHA DA MÃO DOMINANTE */}
      {modalMaoAberto && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-6">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider font-mono">Lado Principal</h3>
              <button onClick={() => setModalMaoAberto(false)} className="text-zinc-500 hover:text-white p-1 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex w-full gap-4">
              {/* Opção Esquerda */}
              <button
                onClick={() => {
                  setMaoDominante('esquerda');
                  salvarPreferencia('v5_pref_mao', 'esquerda');
                  setModalMaoAberto(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  maoDominante === 'esquerda' 
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                  : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {/* O transform scale-x-[-1] espelha o ícone para parecer a mão esquerda */}
                <Hand size={40} className="scale-x-[-1]" />
                <span className="font-bold font-mono text-xs uppercase">Esquerda</span>
              </button>

              {/* Opção Direita */}
              <button
                onClick={() => {
                  setMaoDominante('direita');
                  salvarPreferencia('v5_pref_mao', 'direita');
                  setModalMaoAberto(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  maoDominante === 'direita' 
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                  : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <Hand size={40} />
                <span className="font-bold font-mono text-xs uppercase">Direita</span>
              </button>
            </div>

            <p className="text-[10px] text-zinc-500 mt-6 text-center font-mono uppercase">
              Isso mudará os botões do mapa de lado para facilitar a navegação.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}