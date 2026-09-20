//app/dashboard/equipe/page.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShieldCheck, 
  UserPlus, 
  RefreshCw, 
  Edit3, 
  Check, 
  X,
  Award,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Rocket,
  Headset,
  Wrench
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';
import { PLANOS } from '@/lib/planLimites';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default function EquipePage() {
  const { funcionarios } = useSettings();
  const { leads } = useApp();
  const { operador, empresa } = useAuth();

  // 🚀 PLANO DIRETO DA SESSÃO / SUPABASE: Pega com segurança o plano da empresa logada
  const [planoAtual, setPlanoAtual] = useState<string>('');

  useEffect(() => {
    async function sincronizarPlanoReal() {
      // Se o contexto já tiver o plano da empresa, usa ele direto sem query cega!
      const planoDoContexto = empresa?.plano || operador?.empresa?.plano;
      if (planoDoContexto) {
        setPlanoAtual(String(planoDoContexto).toLowerCase().trim());
        return;
      }

      if (!supabase) return;
      try {
        const idDaEmpresa = operador?.empresaId || operador?.empresa_id;
        if (!idDaEmpresa) {
          setPlanoAtual('ERRO');
          return;
        }

        const { data, error } = await supabase
          .from('empresas')
          .select('plano')
          .eq('id', idDaEmpresa)
          .maybeSingle();

        if (!error && data && data.plano) {
          const planoLimpo = String(data.plano).toLowerCase().trim();
          setPlanoAtual(planoLimpo);
        } else {
          setPlanoAtual('ERRO');
        }
      } catch (err) {
        console.error("Erro ao buscar plano na equipe:", err);
        setPlanoAtual('ERRO');
      }
    }
    sincronizarPlanoReal();
  }, [operador, empresa]);

  // Contagem flexível contemplando Vendedores, Atendentes e Técnicos vindos do Supabase
  const totalVendedores = funcionarios ? funcionarios.filter(f => {
    const cargo = f.cargo?.toLowerCase() || '';
    return cargo.includes('vendedor') || cargo.includes('vendas') || cargo.includes('comercial') || cargo.includes('atendente');
  }).length : 0;

  const totalTecnicos = funcionarios ? funcionarios.filter(f => {
    const cargo = f.cargo?.toLowerCase() || '';
    return cargo.includes('tecnico') || cargo.includes('técnico') || cargo.includes('campo');
  }).length : 0;

  // 🚀 CRUZAMENTO COM PLANLIMITES: Sem números chumbados. Se falhar, retorna "ERRO".
  const configPlanoAtual = PLANOS[planoAtual];
  const limiteVendedores = configPlanoAtual ? configPlanoAtual.max_vendedores : "ERRO"; 
  const limiteTecnicos = configPlanoAtual ? configPlanoAtual.max_tecnicos : "ERRO";

  const bateuLimiteVendedores = typeof limiteVendedores === 'number' ? totalVendedores >= limiteVendedores : false;
  const bateuLimiteTecnicos = typeof limiteTecnicos === 'number' ? totalTecnicos >= limiteTecnicos : false;
  const bateuLimiteGeral = bateuLimiteVendedores && bateuLimiteTecnicos;

  const [metaGlobal, setMetaGlobal] = useState(10000);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [inputMeta, setInputMeta] = useState('10.000,00');

  // Estados dinâmicos vindos do banco de dados
  const [codigoConvite, setCodigoConvite] = useState('CARREGANDO...');
  const [empresaNome, setEmpresaNome] = useState('Carregando...');
  
  const [copiado, setCopiado] = useState(false);
  const [codigoVisivel, setCodigoVisivel] = useState(false);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [metaBatidaDisparada, setMetaBatidaDisparada] = useState(false);

  // 🌐 BUSCA DINÂMICA DIRETO DA API E DO SUPABASE
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const metaSalva = localStorage.getItem('v5_meta_global');
      if (metaSalva) {
        const val = parseFloat(metaSalva);
        setMetaGlobal(val);
        setInputMeta(formatarMoeda(val.toString()));
      } else {
        setInputMeta(formatarMoeda('10000'));
      }
    }

    async function carregarDadosEmpresaDoBanco() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        if (res.ok) {
          const empresaObj = data.empresa || data.operador?.empresa;
          
          if (empresaObj) {
            setEmpresaNome(empresaObj.nomeEmpresa || empresaObj.nome_empresa || 'Minha Empresa');
            setCodigoConvite(empresaObj.codigoConvite || empresaObj.codigo_convite || 'SEM-CODIGO');
          } else {
            setEmpresaNome('Minha Empresa');
            setCodigoConvite('SEM-CODIGO');
          }
        } else {
          setEmpresaNome('Sessão Expirada');
          setCodigoConvite('ERRO');
        }
      } catch (err) {
        console.error("Erro ao buscar dados da empresa:", err);
        setEmpresaNome('Erro de Conexão');
        setCodigoConvite('ERRO');
      }
    }

    carregarDadosEmpresaDoBanco();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (codigoVisivel && tempoRestante !== null && tempoRestante > 0) {
      timer = setInterval(() => {
        setTempoRestante(prev => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (tempoRestante === 0) {
      setCodigoVisivel(false);
      setTempoRestante(null);
    }
    return () => clearInterval(timer);
  }, [codigoVisivel, tempoRestante]);

  const toggleMostrarCodigo = () => {
    if (!codigoVisivel) {
      setCodigoVisivel(true);
      setTempoRestante(300);
    } else {
      setCodigoVisivel(false);
      setTempoRestante(null);
    }
  };

  const formatarTempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatarMoeda = (valorStr: string) => {
    const apenasDigitos = valorStr.replace(/\D/g, '');
    if (!apenasDigitos) return '0,00';
    const numero = parseInt(apenasDigitos, 10) / 100;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleMudancaInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarMoeda(e.target.value);
    setInputMeta(formatado);
  };

  const salvarMeta = () => {
    const apenasDigitos = inputMeta.replace(/\D/g, '');
    const novoValor = apenasDigitos ? parseInt(apenasDigitos, 10) / 100 : 0;
    
    setMetaGlobal(novoValor);
    localStorage.setItem('v5_meta_global', novoValor.toString());
    setEditandoMeta(false);
    setMetaBatidaDisparada(false);
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoConvite);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const totalInstalacoesFeitas = leads.filter(l => l.etapa_funil === 'INSTALACAO_FEITA').length;
  const faturamentoAtual = totalInstalacoesFeitas * 99.90;
  const porcentagemNumerica = metaGlobal > 0 ? Math.min(100, (faturamentoAtual / metaGlobal) * 100) : 0;
  const porcentagemConcluida = porcentagemNumerica.toFixed(1);

  useEffect(() => {
    if (metaGlobal > 0 && faturamentoAtual >= metaGlobal && !metaBatidaDisparada) {
      setMetaBatidaDisparada(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#ffffff', '#059669']
      });
    }
  }, [faturamentoAtual, metaGlobal, metaBatidaDisparada]);

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans w-full">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> Gestão de Equipe & Faturamento
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Métricas de atendimento, conversão de vendas, metas e receita por colaborador.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <UserPlus className="w-4 h-4" /> Distribuir Leads Novos
          </button>
          <button className="p-2.5 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUADRADOS DE LICENÇAS DINÂMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Quadrado: Vendedores / Atendentes */}
        <Card className={`border backdrop-blur transition-all ${bateuLimiteVendedores ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-900/60'}`}>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px]">
            <span className="text-zinc-400 font-mono text-xs uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Headset className="w-4 h-4 text-emerald-400" /> Vendedores & Atendentes (CRM) (Plano {planoAtual ? planoAtual.toUpperCase() : 'CARREGANDO...'})
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className={`text-4xl font-black font-mono ${bateuLimiteVendedores ? 'text-red-400' : 'text-emerald-400'}`}>
                {totalVendedores}
              </h2>
              <span className="text-2xl text-zinc-600 font-black font-mono">/ {limiteVendedores}</span>
            </div>
            {bateuLimiteVendedores && (
              <p className="text-red-400 text-[10px] uppercase font-bold mt-2">Limite Atingido</p>
            )}
          </CardContent>
        </Card>

        {/* Quadrado: Técnicos */}
        <Card className={`border backdrop-blur transition-all ${bateuLimiteTecnicos ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-900/60'}`}>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[140px]">
            <span className="text-zinc-400 font-mono text-xs uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Wrench className="w-4 h-4 text-emerald-400" /> Técnicos (Campo) (Plano {planoAtual ? planoAtual.toUpperCase() : 'CARREGANDO...'})
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className={`text-4xl font-black font-mono ${bateuLimiteTecnicos ? 'text-red-400' : 'text-emerald-400'}`}>
                {totalTecnicos}
              </h2>
              <span className="text-2xl text-zinc-600 font-black font-mono">/ {limiteTecnicos}</span>
            </div>
            {bateuLimiteTecnicos && (
              <p className="text-red-400 text-[10px] uppercase font-bold mt-2">Limite Atingido</p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* BLOCO DE CÓDIGO DE CONVITE */}
      <Card className={`border backdrop-blur relative overflow-hidden transition-all ${bateuLimiteGeral ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        
        {bateuLimiteGeral && (
          <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
            <Lock className="w-8 h-8 text-red-400 mb-3" />
            <h3 className="text-white font-bold text-lg font-mono mb-1">Limite Total Atingido</h3>
            <p className="text-zinc-400 text-xs mb-4 max-w-md">Seu plano atual não permite adicionar novos Vendedores ou Técnicos. Faça um upgrade para liberar novos convites.</p>
            <button className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 cursor-pointer">
              <Rocket className="w-4 h-4" /> Fazer Upgrade de Plano
            </button>
          </div>
        )}

        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <KeyRound className="w-3.5 h-3.5" /> Workspace: {empresaNome}
              </span>
              <h3 className="text-base font-bold font-mono text-white mt-0.5">
                Código de Convite da Empresa
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5 max-w-xl leading-relaxed">
                Atenção: Este código é único e exclusivo para a sua empresa. Nunca compartilhe com pessoas desconhecidas ou fora do quadro de colaboradores autorizados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="bg-black/60 border border-emerald-500/50 px-4 py-2.5 rounded-xl font-mono text-base font-black text-emerald-400 tracking-widest shadow-inner text-center flex-1 md:flex-none min-w-[160px]">
                {codigoVisivel ? codigoConvite : '••••••••'}
              </div>

              <button
                type="button"
                onClick={toggleMostrarCodigo}
                disabled={bateuLimiteGeral}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold uppercase text-xs font-mono rounded-xl border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {codigoVisivel ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                {codigoVisivel && tempoRestante !== null ? `(${formatarTempo(tempoRestante)})` : 'Mostrar'}
              </button>

              <button
                type="button"
                onClick={copiarCodigo}
                disabled={bateuLimiteGeral}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {copiado ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD DE META DA EQUIPE */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Meta de Faturamento da Equipe (Mês Atual)</span>
              <div className="flex items-baseline gap-3 mt-1">
                <h3 className="text-2xl font-black font-mono text-white">
                  Atual: R$ {faturamentoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center justify-end gap-1">
                  {porcentagemConcluida}% Concluído
                  {porcentagemNumerica >= 100 && <span className="text-xs">🎉</span>}
                </span>
                <div className="text-xs font-mono text-zinc-400 flex items-center justify-end gap-1.5 mt-1">
                  <span>Meta Global:</span>
                  {editandoMeta ? (
                    <div className="inline-flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">R$</span>
                      <input 
                        type="text"
                        value={inputMeta}
                        onChange={handleMudancaInput}
                        placeholder="0,00"
                        autoFocus
                        className="w-32 bg-black border border-emerald-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      />
                      <button onClick={salvarMeta} className="p-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer transition-all" title="Salvar">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditandoMeta(false)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer transition-all" title="Cancelar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-white font-bold font-mono">
                      R$ {metaGlobal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {!editandoMeta && (
                <button 
                  onClick={() => { setInputMeta(formatarMoeda((metaGlobal * 100).toString())); setEditandoMeta(true); }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono uppercase font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" /> Editar
                </button>
              )}
            </div>
          </div>

          <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(16,185,129,0.6)]" 
              style={{ width: `${porcentagemNumerica}%` }} 
            />
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE COLABORADORES */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" /> Desempenho dos Colaboradores Cadastrados
          </h3>

          {(!funcionarios || funcionarios.length === 0) ? (
            <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-xl">
              Nenhum funcionário cadastrado. Vá em <strong className="text-emerald-400">Configurações</strong> para adicionar sua equipe.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {funcionarios.map(func => {
                const leadsAtribuidos = leads.filter(l => l.atendente === func.nome);
                const instalacoesFunc = leadsAtribuidos.filter(l => l.etapa_funil === 'INSTALACAO_FEITA').length;
                const receitaFunc = instalacoesFunc * 99.90;

                return (
                  <div key={func.id} className="p-4 bg-black/40 border border-zinc-900 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-white">{func.nome}</h4>
                        <span className="text-[11px] text-emerald-400 font-mono">{func.cargo}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                        {leadsAtribuidos.length} leads atribuídos
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900 text-xs font-mono">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase">Instalações Feitas</span>
                        <div className="font-bold text-white mt-0.5">{instalacoesFunc} concluídas</div>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-500 text-[10px] uppercase">Receita Gerada</span>
                        <div className="font-bold text-emerald-400 mt-0.5">R$ {receitaFunc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}