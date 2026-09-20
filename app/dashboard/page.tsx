//app/dashboard/page.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Search, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Phone, 
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserPlus,
  Lock,
  Rocket
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PLANOS } from '@/lib/planLimites';

export default function DashboardPage() {
  const router = useRouter();
  const { operador, empresa, carregando: carregandoAuth } = useAuth();
  const { leads = [], carregarLeads } = useApp() || {};

  // 🛡️ Proteção de Rota: Atendente não pode ver a Visão Geral de Gerente
  useEffect(() => {
    if (!carregandoAuth && operador && operador.role === 'atendente') {
      router.push('/dashboard/leads');
    }
  }, [operador, carregandoAuth, router]);

  // 🚀 BUSCA REAL DO PLANO NO SUPABASE (Sem adivinhação)
  const [planoAtual, setPlanoAtual] = useState<string>('essencial');

  useEffect(() => {
    async function sincronizarPlanoReal() {
      const planoDoContexto = empresa?.plano || operador?.empresa?.plano;
      if (planoDoContexto) {
        setPlanoAtual(String(planoDoContexto).toLowerCase().trim());
        return;
      }

      if (!supabase) return;
      try {
        const idDaEmpresa = operador?.empresaId || operador?.empresa_id;
        if (!idDaEmpresa) return;

        const { data, error } = await supabase
          .from('empresas')
          .select('plano')
          .eq('id', idDaEmpresa)
          .maybeSingle();

        if (!error && data && data.plano) {
          setPlanoAtual(String(data.plano).toLowerCase().trim());
        }
      } catch (err) {
        console.error("Erro ao buscar plano na visão geral:", err);
      }
    }
    sincronizarPlanoReal();
  }, [operador, empresa]);

  const [busca, setBusca] = useState('');
  
  // Estados para seleção em lote e atribuição
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Lista de funcionários padrão para atribuição
  const funcionarios = [
    { id: '1', nome: 'Vannut Santos', cargo: 'Admin' },
    { id: '2', nome: 'Suporte Técnico 01', cargo: 'Operador' },
    { id: '3', nome: 'Comercial V5', cargo: 'Atendimento' }
  ];

  if (carregandoAuth || (operador && operador.role === 'atendente')) {
    return null;
  }

  // --- 🚀 REGRAS DE NEGÓCIO E LIMITES OFICIAIS DO PLANO (BASEADO NO PLANLIMITES) ---
  const configPlanoAtual = PLANOS[planoAtual] || PLANOS['essencial'];
  const limiteLeadsMensal = configPlanoAtual?.max_leads || 100;
  
  const totalLeadsCadastrados = Array.isArray(leads) ? leads.length : 0;
  const bateuLimiteLeads = totalLeadsCadastrados >= limiteLeadsMensal;
  const porcentagemUsoLeads = Math.min((totalLeadsCadastrados / limiteLeadsMensal) * 100, 100);

  // Datas de referência (Hoje e Mês Atual)
  const dataHojeObj = new Date();
  const diaHojeStr = String(dataHojeObj.getDate()).padStart(2, '0');
  const mesAtualStr = String(dataHojeObj.getMonth() + 1).padStart(2, '0');
  const anoAtualStr = String(dataHojeObj.getFullYear());
  
  const formatoBrDia = `${diaHojeStr}/${mesAtualStr}/${anoAtualStr}`;
  const formatoIsoDia = `${anoAtualStr}-${mesAtualStr}-${diaHojeStr}`;
  const formatoMesAno = `${mesAtualStr}/${anoAtualStr}`;

  // 1. Total de Leads do Mês Todo
  const totalLeadsMes = Array.isArray(leads) ? leads.filter(l => {
    const dataReg = l?.created_at || l?.data || '';
    return dataReg.includes(formatoMesAno) || dataReg.includes(`${anoAtualStr}-${mesAtualStr}`) || !dataReg;
  }).length : 0;
  const totalLeadsGeral = totalLeadsMes > 0 ? totalLeadsMes : totalLeadsCadastrados;

  // 2. Leads Novos do Dia Atual
  const leadsNovosHoje = Array.isArray(leads) ? leads.filter(l => {
    const dataReg = l?.created_at || l?.data || '';
    const ehHoje = dataReg.includes(formatoBrDia) || dataReg.includes(formatoIsoDia) || (!l?.status || l?.status === 'NOVO');
    return ehHoje;
  }).length : 0;

  // 3. Em Atendimento
  const emAtendimento = Array.isArray(leads) ? leads.filter(l => 
    l?.status === 'EM ATENDIMENTO' || l?.status === 'AGENDADO' || l?.etapa_funil === 'EM CONTATO'
  ).length : 0;

  // 4. Convertidos do Mês Todo
  const convertidosMes = Array.isArray(leads) ? leads.filter(l => {
    const dataReg = l?.created_at || l?.data || '';
    const ehConvertido = l?.status === 'CONVERTIDO' || l?.etapa_funil === 'CONVERTIDO' || l?.status_instalacao === 'CONCLUIDA';
    return ehConvertido && (dataReg.includes(formatoMesAno) || dataReg.includes(`${anoAtualStr}-${mesAtualStr}`) || !dataReg);
  }).length : 0;

  // 📊 DADOS REAIS PARA O GRÁFICO (Agrupamento real por dia da semana com base nos leads do Supabase)
  const contagemDias: Record<string, number> = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
  const diasSemanaMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (Array.isArray(leads)) {
    leads.forEach(l => {
      const dataStr = l?.created_at || l?.data;
      if (dataStr) {
        // Tenta interpretar a data para extrair o dia da semana real
        const d = new Date(dataStr);
        if (!isNaN(d.getTime())) {
          const diaNome = diasSemanaMap[d.getDay()];
          if (contagemDias[diaNome] !== undefined) {
            contagemDias[diaNome] += 1;
          }
        }
      }
    });
  }

  const chartData = [
    { date: 'Seg', leads: contagemDias['Seg'] },
    { date: 'Ter', leads: contagemDias['Ter'] },
    { date: 'Qua', leads: contagemDias['Qua'] },
    { date: 'Qui', leads: contagemDias['Qui'] },
    { date: 'Sex', leads: contagemDias['Sex'] },
    { date: 'Sáb', leads: contagemDias['Sáb'] },
    { date: 'Dom', leads: contagemDias['Dom'] },
  ];

  const leadsFiltrados = Array.isArray(leads) ? leads.filter(l => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      (l?.nome && l.nome.toLowerCase().includes(termo)) ||
      (l?.whatsapp && l.whatsapp.includes(termo)) ||
      (l?.cep && l.cep.includes(termo))
    );
  }) : [];

  const handleSelecionarTodos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelecionados(leadsFiltrados.map(r => r.id));
    } else {
      setSelecionados([]);
    }
  };

  const handleSelecionarLead = (id: string) => {
    if (selecionados.includes(id)) {
      setSelecionados(selecionados.filter(item => item !== id));
    } else {
      setSelecionados([...selecionados, id]);
    }
  };

  const handleAtribuirFuncionario = async () => {
    if (!funcionarioSelecionado || selecionados.length === 0 || !supabase) return;

    try {
      for (const id of selecionados) {
        await supabase
          .from('leads')
          .update({ status: 'EM ATENDIMENTO' })
          .eq('id', id);
      }
      
      setMensagemSucesso(`${selecionados.length} lead(s) atribuído(s) com sucesso para ${funcionarioSelecionado}!`);
      setSelecionados([]);
      setFuncionarioSelecionado('');
      if (carregarLeads) carregarLeads();
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error("Erro ao atualizar atendente no Supabase:", err);
    }
  };

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
            Visão Geral da Operação
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Gestão tática, triagem em massa, busca rápida e histórico da rede.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400 font-bold uppercase flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Leads 24h ({totalLeadsGeral})
          </span>
          <button 
            onClick={() => carregarLeads && carregarLeads()}
            className="p-2.5 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {mensagemSucesso}
        </div>
      )}

      {/* 🚀 CARD DE CONSUMO DA FRANQUIA DE LEADS (DINÂMICO CONFORME O SUPABASE) */}
      <Card className={`border backdrop-blur transition-all ${bateuLimiteLeads ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-900 bg-zinc-900/40'}`}>
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-zinc-300 font-mono uppercase tracking-widest text-xs flex items-center gap-2">
               Franquia de Leads (Plano {planoAtual.toUpperCase()})
            </span>
            <span className={bateuLimiteLeads ? "text-red-400 font-mono" : "text-emerald-400 font-mono"}>
              {totalLeadsCadastrados} / {limiteLeadsMensal} Leads Registrados
            </span>
          </div>
          
          <div className="w-full bg-black rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${bateuLimiteLeads ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} 
              style={{ width: `${porcentagemUsoLeads}%` }}
            ></div>
          </div>
          {bateuLimiteLeads && (
            <p className="text-red-400 text-[11px] font-mono uppercase font-bold pt-1">
              ⚠️ O limite de leads do seu plano foi atingido. Novas consultas estão bloqueadas até um upgrade.
            </p>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO LADO A LADO: 4 QUADRADOS + GRÁFICO REAL */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* LADO ESQUERDO: 4 QUADRADOS EM GRID 2x2 */}
        <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur flex flex-col justify-between">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-xs font-mono uppercase tracking-wider">Total de Leads (Mês)</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono text-white">{totalLeadsGeral}</h3>
                <span className="text-[11px] text-zinc-500 font-mono">Convertidos e não convertidos no mês</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur flex flex-col justify-between">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-xs font-mono uppercase tracking-wider">Leads Novos (Hoje)</span>
                <UserPlus className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono text-white">{leadsNovosHoje}</h3>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">Reiniciado diariamente</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur flex flex-col justify-between">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-xs font-mono uppercase tracking-wider">Em Atendimento</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono text-white">{emAtendimento}</h3>
                <span className="text-[11px] text-amber-400 font-mono font-bold">Negociação em andamento</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur flex flex-col justify-between">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-xs font-mono uppercase tracking-wider">Convertidos (Mês)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black font-mono text-white">{convertidosMes}</h3>
                <span className="text-[11px] text-zinc-500 font-mono">Contratos fechados no mês</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LADO DIREITO: GRÁFICO COM DADOS REAIS DO SUPABASE */}
        <div className="xl:col-span-5">
          <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur h-full flex flex-col">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
              <div>
                <h3 className="text-xs uppercase font-mono tracking-wide text-zinc-300 font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Fluxo de Chegada de Leads
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Volume semanal real baseado nas consultas</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
                Ciclo Atual
              </span>
            </div>
            <CardContent className="p-5 flex-1 flex items-center justify-center min-h-[220px]">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* BARRA DE AÇÃO EM LOTE */}
      {selecionados.length > 0 && (
        <div className="p-4 bg-zinc-900 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-mono text-emerald-400 font-bold">
            {selecionados.length} lead(s) selecionado(s)
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={funcionarioSelecionado}
              onChange={(e) => setFuncionarioSelecionado(e.target.value)}
              className="bg-black border border-zinc-800 text-white rounded-xl px-3.5 py-2 text-xs font-mono uppercase focus:outline-none focus:border-emerald-500 cursor-pointer flex-1 sm:w-64"
            >
              <option value="">Selecione o Funcionário...</option>
              {funcionarios.map(f => (
                <option key={f.id} value={f.nome}>{f.nome} ({f.cargo})</option>
              ))}
            </select>

            <button
              onClick={handleAtribuirFuncionario}
              disabled={!funcionarioSelecionado}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold uppercase text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Atribuir
            </button>
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3 flex-1 w-full backdrop-blur">
          <Search className="w-4 h-4 text-zinc-500 ml-2" />
          <input 
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por telefone, CEP ou nome..."
            className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* TABELA DE REGISTROS DA OPERAÇÃO COM CAMADA DE BLOQUEIO */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur relative overflow-hidden">
        
        {bateuLimiteLeads && (
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Lock className="w-10 h-10 text-red-400 mb-3 animate-pulse" />
            <h3 className="text-white font-bold text-lg font-mono mb-1">Franquia de Leads Esgotada</h3>
            <p className="text-zinc-400 text-xs mb-5 max-w-md font-mono leading-relaxed">
              Você atingiu o limite de leads do seu plano atual ({limiteLeadsMensal} registros). Faça um upgrade para liberar novas consultas e expandir sua base.
            </p>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase text-xs font-mono rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 cursor-pointer">
              <Rocket className="w-4 h-4" /> Fazer Upgrade de Plano
            </button>
          </div>
        )}

        <div className="p-4 border-b border-zinc-900 text-xs font-mono text-zinc-400 uppercase tracking-wider flex justify-between items-center">
          <span>Registros da Operação ({leadsFiltrados.length})</span>
          {selecionados.length > 0 && (
            <span className="text-emerald-400 font-bold">{selecionados.length} selecionado(s)</span>
          )}
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
                  <th className="p-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={leadsFiltrados.length > 0 && selecionados.length === leadsFiltrados.length}
                      onChange={handleSelecionarTodos}
                      className="rounded bg-zinc-900 border-zinc-800 cursor-pointer accent-emerald-500" 
                    />
                  </th>
                  <th className="p-4">Cliente / Contato</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Atendente</th>
                  <th className="p-4">Tag Operacional</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {leadsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-500">
                      Nenhum registro encontrado no Supabase.
                    </td>
                  </tr>
                ) : (
                  leadsFiltrados.map((reg) => {
                    const isSelected = selecionados.includes(reg.id);

                    return (
                      <tr key={reg.id} className={`hover:bg-zinc-900/35 transition-colors ${isSelected ? 'bg-emerald-500/5' : ''}`}>
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleSelecionarLead(reg.id)}
                            className="rounded bg-zinc-900 border-zinc-800 cursor-pointer accent-emerald-500" 
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-bold font-sans text-sm text-white">{reg.nome || 'Sem nome'}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-zinc-600" /> {reg.whatsapp || reg.telefone || 'Sem telefone'} • CEP {reg.cep || 'S/N'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                            {reg.perfil || 'Gamer / Streaming'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold">
                            {reg.status || reg.etapa_funil || 'NOVO'}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-300 font-bold">
                          <span className="text-emerald-400">{reg.atendente || 'Atribuído'}</span>
                        </td>
                        <td className="p-4 text-zinc-500">🔥 ❄️ ✓</td>
                        <td className="p-4 text-right">
                          <button className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold uppercase text-[11px] transition-all cursor-pointer">
                            Preencher Tel
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}