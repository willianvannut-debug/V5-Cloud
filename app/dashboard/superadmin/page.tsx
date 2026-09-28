// ================================================================================
// 📋 ROOT MASTER - VISÃO ANALÍTICA GLOBAL SAAS (DADOS 100% REAIS DO SUPABASE)
// app/dashboard/superadmin/page.tsx
// ================================================================================

"use client"
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Building2, Search, Users, MapPin, Crosshair, ShieldAlert, CheckCircle2, 
  XCircle, Activity, DollarSign, TrendingUp, AlertTriangle, PieChart as PieChartIcon, 
  BarChart3, Calendar, Zap, Maximize2, X, Network, Wrench
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

const PRECOS_BASE: Record<string, number> = { 'essencial': 97, 'pro': 197, 'scale': 297, 'ultra': 497 };
const CORES_PLANOS = { 'essencial': '#3b82f6', 'pro': '#8b5cf6', 'scale': '#10b981', 'ultra': '#f59e0b' };
const CORES_STATUS = { 'ativa': '#10b981', 'inadimplente': '#ef4444', 'cancelada': '#71717a', 'trial': '#3b82f6' };

const USAR_DADOS_FALSOS = false;

export default function RootMasterSaaS() {
  const router = useRouter();
  const { operador, carregando: carregandoAuth } = useAuth();
  
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [busca, setBusca] = useState('');
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null);

  const [modalTabelaAberto, setModalTabelaAberto] = useState(false);
  const [buscaModalTabela, setBuscaModalTabela] = useState('');
  
  const [modalLeadsAberto, setModalLeadsAberto] = useState(false);
  const [buscaModalLeads, setBuscaModalLeads] = useState('');

  const [modalCtosAberto, setModalCtosAberto] = useState(false);
  const [buscaModalCtos, setBuscaModalCtos] = useState('');

  // Estados para o Modal de Equipe Completa
  const [modalEquipeAberto, setModalEquipeAberto] = useState(false);
  const [buscaModalEquipe, setBuscaModalEquipe] = useState('');

  const [dadosPlanos, setDadosPlanos] = useState<any[]>([]);
  const [dadosStatus, setDadosStatus] = useState<any[]>([]);
  const [dadosCrescimento, setDadosCrescimento] = useState<any[]>([]);
  const [dadosTopConsumidores, setDadosTopConsumidores] = useState<any[]>([]);
  const [dadosFaturamentoDiario, setDadosFaturamentoDiario] = useState<any[]>([]);
  
  const [mrrEstimado, setMrrEstimado] = useState(0);
  const [taxaInadimplencia, setTaxaInadimplencia] = useState(0);

  // Estados para métricas de Equipe por Empresa
  const [listaEquipeEmpresas, setListaEquipeEmpresas] = useState<any[]>([]);

  useEffect(() => {
    if (carregandoAuth) return;
    if (!operador || (operador.role !== 'superadmin' && operador.role !== 'root')) {
      router.replace('/dashboard');
    }
  }, [operador, carregandoAuth, router]);

  useEffect(() => {
    async function carregarConsumoSaaS() {
      setCarregandoDados(true);
      setErroSincronizacao(null);

      try {
        const resposta = await fetch('/api/superadmin/consumo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: operador?.role })
        });

        const resultado = await resposta.json();
        if (!resultado.sucesso) {
          throw new Error(resultado.erro || 'Falha ao buscar dados na API.');
        }

        const empresasComConsumo = resultado.dados;

        let totalReceita = 0;
        let inadimplentes = 0;
        const equipePorEmpresa: any[] = [];

        const contagemPlanos: Record<string, number> = {};
        const contagemStatus: Record<string, number> = {};
        const timelineCrescimento: Record<string, number> = {};
        
        const faturamentoDiario = Array.from({ length: 31 }, (_, i) => ({
          dia: String(i + 1).padStart(2, '0'), valor: 0
        }));

        empresasComConsumo.forEach((emp: any) => {
          const planoStr = emp.plano?.toLowerCase() || 'essencial';
          const statusStr = emp.status_assinatura?.toLowerCase() || 'ativa';

          contagemPlanos[planoStr] = (contagemPlanos[planoStr] || 0) + 1;
          contagemStatus[statusStr] = (contagemStatus[statusStr] || 0) + 1;
          
          if (statusStr === 'inadimplente') inadimplentes++;

          // Extração dos dados reais de operadores por empresa vindos da API
          const totalAtend = emp.consumo?.atendentes || 0;
          const totalTec = emp.consumo?.tecnicos || 0;
          const equipeCount = emp.consumo?.equipe || (totalAtend + totalTec) || 1;

          equipePorEmpresa.push({
            id: emp.id,
            nome: emp.nome_empresa || 'Instância Anônima',
            atendentes: totalAtend,
            tecnicos: totalTec,
            total: equipeCount
          });
          
          if (statusStr !== 'cancelada') {
            const valorPlano = PRECOS_BASE[planoStr] || 97;
            totalReceita += valorPlano;

            if (emp.criado_em) {
              const dataCriacao = new Date(emp.criado_em);
              const diaVencimento = dataCriacao.getDate(); 
              if (diaVencimento >= 1 && diaVencimento <= 31) {
                faturamentoDiario[diaVencimento - 1].valor += valorPlano;
              }
            }
          }

          if (emp.criado_em) {
            const dataCriacao = new Date(emp.criado_em);
            const mesAno = `${dataCriacao.getFullYear()}-${String(dataCriacao.getMonth() + 1).padStart(2, '0')}`;
            timelineCrescimento[mesAno] = (timelineCrescimento[mesAno] || 0) + 1;
          }
        });

        const chartPlanos = Object.entries(contagemPlanos).map(([name, value]) => ({
          name: name.toUpperCase(), value, color: CORES_PLANOS[name as keyof typeof CORES_PLANOS] || '#71717a'
        }));

        const chartStatus = Object.entries(contagemStatus).map(([name, value]) => ({
          name: name.toUpperCase(), value, color: CORES_STATUS[name as keyof typeof CORES_STATUS] || '#71717a'
        }));

        let acumulado = 0;
        const chartTimeline = Object.entries(timelineCrescimento)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => {
            acumulado += count;
            return { date, novas: count, total: acumulado };
          });

        const todosConsumidoresRankeados = [...empresasComConsumo]
          .sort((a, b) => (b.consumo.leads || 0) - (a.consumo.leads || 0))
          .map(emp => ({
            name: emp.nome_empresa || 'Instância Anônima', 
            leads: emp.consumo.leads || 0,
            ctos: emp.consumo.ctos || 0,
            instalados: emp.consumo.instalados || 0,
            pendentes: (emp.consumo.leads || 0) - (emp.consumo.instalados || 0)
          }));

        const empresasOrdenadas = [...empresasComConsumo].sort((a, b) => 
          new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
        );

        setEmpresas(empresasOrdenadas);
        setMrrEstimado(totalReceita);
        setTaxaInadimplencia(empresasComConsumo.length > 0 ? (inadimplentes / empresasComConsumo.length) * 100 : 0);
        setDadosPlanos(chartPlanos);
        setDadosStatus(chartStatus);
        setDadosCrescimento(chartTimeline);
        setDadosTopConsumidores(todosConsumidoresRankeados);
        setDadosFaturamentoDiario(faturamentoDiario);
        setListaEquipeEmpresas(equipePorEmpresa);

      } catch (error: any) {
        console.error("Erro no processamento do Root Master:", error);
        setErroSincronizacao(error.message || "Falha de conexão com a API.");
      } finally {
        setCarregandoDados(false);
      }
    }

    if (operador && (operador.role === 'superadmin' || operador.role === 'root')) {
      carregarConsumoSaaS();
    }
  }, [operador]);

  const empresasFiltradasMain = empresas.filter(emp => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (emp.nome_empresa && emp.nome_empresa.toLowerCase().includes(termo)) || (emp.cnpj && emp.cnpj.includes(termo));
  });

  const empresasFiltradasTabela = empresas.filter(emp => {
    if (!buscaModalTabela) return true;
    const termo = buscaModalTabela.toLowerCase();
    return (
      (emp.nome_empresa && emp.nome_empresa.toLowerCase().includes(termo)) ||
      (emp.cnpj && emp.cnpj.includes(termo)) ||
      (emp.plano && emp.plano.toLowerCase().includes(termo)) ||
      (emp.status_assinatura && emp.status_assinatura.toLowerCase().includes(termo))
    );
  });

  const consumidoresFiltradosLeads = dadosTopConsumidores.filter(emp => {
    if (!buscaModalLeads) return true;
    return emp.name.toLowerCase().includes(buscaModalLeads.toLowerCase());
  });

  const consumidoresFiltradosCtos = [...dadosTopConsumidores]
    .sort((a, b) => b.ctos - a.ctos)
    .filter(emp => {
      if (!buscaModalCtos) return true;
      return emp.name.toLowerCase().includes(buscaModalCtos.toLowerCase());
    });

  const equipeFiltradaModal = listaEquipeEmpresas.filter(item => {
    if (!buscaModalEquipe) return true;
    return item.nome.toLowerCase().includes(buscaModalEquipe.toLowerCase());
  });

  const totalLeadsSaaS = empresas.reduce((acc, emp) => acc + (emp.consumo?.leads || 0), 0);
  const totalCtosSaaS = empresas.reduce((acc, emp) => acc + (emp.consumo?.ctos || 0), 0);
  const totalUsuariosSaaS = empresas.reduce((acc, emp) => acc + (emp.consumo?.equipe || 0), 0);
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const renderLinhaEmpresa = (emp: any) => (
    <tr key={emp.id} className="hover:bg-zinc-900/50 transition-colors group cursor-default">
      <td className="p-4">
        <div className="font-bold font-sans text-sm text-white group-hover:text-emerald-400 transition-colors">{emp.nome_empresa || 'Instância Anônima'}</div>
        <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">ID: {emp.id.split('-')[0]}... | CNPJ: {emp.cnpj || 'N/A'}</div>
      </td>
      <td className="p-4">
        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-wider">{emp.plano || 'ESSENCIAL'}</span>
      </td>
      <td className="p-4 text-[10px] font-bold tracking-wider">
        {(() => {
          const status = emp.status_assinatura?.toLowerCase() || 'ativa';
          if (status === 'ativa') return <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> ATIVA</span>;
          if (status === 'inadimplente') return <span className="text-red-400 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> INADIMPLENTE</span>;
          if (status === 'cancelada') return <span className="text-zinc-500 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> CANCELADA</span>;
          if (status === 'trial') return <span className="text-blue-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> TRIAL</span>;
          return <span className="text-zinc-400">DESCONHECIDO</span>;
        })()}
      </td>
      <td className="p-4 text-center border-l border-zinc-900/50"><span className="font-black text-white text-sm">{emp.consumo.leads}</span></td>
      <td className="p-4 text-center"><span className="font-black text-white text-sm">{emp.consumo.ctos}</span></td>
      <td className="p-4 text-center border-r border-zinc-900/50"><span className="font-black text-white text-sm">{emp.consumo.equipe}</span></td>
      <td className="p-4 text-right text-zinc-500 text-[10px]">{emp.criado_em ? new Date(emp.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : 'N/A'}</td>
    </tr>
  );

  if (carregandoAuth || !operador || (operador.role !== 'superadmin' && operador.role !== 'root')) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-emerald-400 font-mono text-xs">Acessando Core da Infraestrutura...</div>;
  }

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative overflow-x-hidden">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold rounded-lg">Acesso Nível 5 (Root)</span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-emerald-500" /> Core Analytics SaaS
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Monitorização em tempo real de instâncias, faturamento, consumo de infraestrutura e saúde da rede.</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 w-full md:w-96 backdrop-blur">
          <Search className="w-5 h-5 text-zinc-400 ml-2" />
          <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou CNPJ..." className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"/>
        </div>
      </div>

      {erroSincronizacao && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 font-mono text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {erroSincronizacao}
        </div>
      )}

      {/* KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-zinc-900 bg-black/40 backdrop-blur shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all"><CardContent className="p-5 flex flex-col justify-between h-full"><div className="flex justify-between items-center text-zinc-400 mb-4"><span className="text-[10px] font-mono uppercase tracking-widest font-bold">MRR Estimado</span><DollarSign className="w-4 h-4 text-emerald-400" /></div><div><h3 className="text-3xl font-black font-mono text-white">{formatCurrency(mrrEstimado)}</h3><span className="text-[10px] text-zinc-500 font-mono mt-1 block">Receita mensal base</span></div></CardContent></Card>
        <Card className="border border-zinc-900 bg-black/40 backdrop-blur shadow-xl"><CardContent className="p-5 flex flex-col justify-between h-full"><div className="flex justify-between items-center text-zinc-400 mb-4"><span className="text-[10px] font-mono uppercase tracking-widest font-bold">Empresas (Instâncias)</span><Building2 className="w-4 h-4 text-blue-400" /></div><div><h3 className="text-3xl font-black font-mono text-white">{empresas.length}</h3><span className="text-[10px] text-zinc-500 font-mono mt-1 block">Clientes no SaaS</span></div></CardContent></Card>
        <Card className="border border-zinc-900 bg-black/40 backdrop-blur shadow-xl relative overflow-hidden group hover:border-red-500/30 transition-all"><CardContent className="p-5 flex flex-col justify-between h-full"><div className="flex justify-between items-center text-zinc-400 mb-4"><span className="text-[10px] font-mono uppercase tracking-widest font-bold">Inadimplência</span><AlertTriangle className="w-4 h-4 text-red-400" /></div><div><h3 className="text-3xl font-black font-mono text-white">{taxaInadimplencia.toFixed(1)}%</h3><span className="text-[10px] text-zinc-500 font-mono mt-1 block">Taxa global de atrasos</span></div></CardContent></Card>
        <Card className="border border-zinc-900 bg-black/40 backdrop-blur shadow-xl"><CardContent className="p-5 flex flex-col justify-between h-full"><div className="flex justify-between items-center text-zinc-400 mb-4"><span className="text-[10px] font-mono uppercase tracking-widest font-bold">Volume Global Leads</span><Users className="w-4 h-4 text-purple-400" /></div><div><h3 className="text-3xl font-black font-mono text-white">{totalLeadsSaaS}</h3><span className="text-[10px] text-zinc-500 font-mono mt-1 block">Processados</span></div></CardContent></Card>
        <Card className="border border-zinc-900 bg-black/40 backdrop-blur shadow-xl"><CardContent className="p-5 flex flex-col justify-between h-full"><div className="flex justify-between items-center text-zinc-400 mb-4"><span className="text-[10px] font-mono uppercase tracking-widest font-bold">CTOs / Usuários</span><MapPin className="w-4 h-4 text-amber-400" /></div><div><h3 className="text-3xl font-black font-mono text-white">{totalCtosSaaS} <span className="text-lg text-zinc-600">/</span> {totalUsuariosSaaS}</h3><span className="text-[10px] text-zinc-500 font-mono mt-1 block">Caixas / Equipes</span></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CURVA DE ADOÇÃO */}
        <Card className="col-span-1 lg:col-span-2 border border-zinc-900 bg-zinc-900/20 backdrop-blur h-full flex flex-col">
          <div className="p-5 border-b border-zinc-900 flex justify-between items-center"><h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Curva de Adoção SaaS</h3></div>
          <CardContent className="p-5 flex-1 flex items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={dadosCrescimento} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} /><XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} /><YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} /><Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} /><Area type="monotone" dataKey="total" name="Total Empresas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" /></AreaChart></ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MARKET SHARE */}
        <Card className="border border-zinc-900 bg-zinc-900/20 backdrop-blur h-full flex flex-col">
          <div className="p-5 border-b border-zinc-900"><h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-purple-400" /> Market Share</h3></div>
          <CardContent className="p-0 flex-1 flex items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dadosPlanos} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">{dadosPlanos.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} /><Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}/></PieChart></ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SAÚDE FINANCEIRA */}
        <Card className="border border-zinc-900 bg-zinc-900/20 backdrop-blur h-full flex flex-col">
          <div className="p-5 border-b border-zinc-900"><h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-amber-400" /> Saúde Financeira</h3></div>
          <CardContent className="p-0 flex-1 flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dadosStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">{dadosStatus.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} /><Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}/></PieChart></ResponsiveContainer>
          </CardContent>
        </Card>

        {/* FATURAMENTO */}
        <Card className="col-span-1 lg:col-span-2 border border-zinc-900 bg-zinc-900/20 backdrop-blur h-full flex flex-col">
          <div className="p-5 border-b border-zinc-900 flex justify-between items-center"><h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-400" /> Previsão de Faturamento</h3></div>
          <CardContent className="p-5 flex-1 flex items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={dadosFaturamentoDiario} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} /><XAxis dataKey="dia" stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `Dia ${val}`} /><YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `R$ ${val}`} /><Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} formatter={(value: any) => [formatCurrency(value), 'Faturamento Projetado']} labelFormatter={(label) => `Vencimentos: Dia ${label}`} /><Bar dataKey="valor" name="Faturamento (MRR)" fill="#10b981" radius={[4, 4, 0, 0]}>{dadosFaturamentoDiario.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.valor > 0 ? '#10b981' : '#27272a'} />))}</Bar></BarChart></ResponsiveContainer>
          </CardContent>
        </Card>

        {/* GRÁFICO 1: TOP 10 CONSUMIDORES DE LEADS */}
        <Card className="col-span-1 lg:col-span-3 border border-zinc-900 bg-zinc-900/20 backdrop-blur h-full flex flex-col mt-4 overflow-hidden relative">
          <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
            <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" /> Top 10 Consumidores de Database (Leads)
            </h3>
          </div>
          <CardContent className="p-5 flex-1 flex items-center justify-center min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosTopConsumidores.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} fontFamily="monospace" width={140} tickLine={false} />
                <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '10px' }}/>
                
                <Bar dataKey="instalados" name="Instalados" stackId="a" fill="#10b981" />
                <Bar dataKey="pendentes" name="Pendentes / Outros" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <div 
            className="p-3 border-t border-zinc-900 bg-[#050505] hover:bg-zinc-900 transition-colors cursor-pointer flex justify-center items-center gap-2 text-blue-400 font-mono text-[11px] uppercase font-bold"
            onClick={() => setModalLeadsAberto(true)}
          >
            <Maximize2 className="w-3.5 h-3.5" /> Expandir Ranking de Leads Completo
          </div>
        </Card>

        {/* GRÁFICO 2: TOP 10 CONSUMIDORES DE CAIXAS CTOS */}
        <Card className="col-span-1 lg:col-span-3 border border-zinc-900 bg-zinc-900/20 backdrop-blur h-full flex flex-col mt-4 overflow-hidden relative">
          <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
            <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2">
              <Network className="w-4 h-4 text-amber-400" /> Top 10 Consumidores de Caixas CTOs (Infraestrutura)
            </h3>
          </div>
          <CardContent className="p-5 flex-1 flex items-center justify-center min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...dadosTopConsumidores].sort((a, b) => b.ctos - a.ctos).slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} fontFamily="monospace" width={140} tickLine={false} />
                <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '10px' }}/>
                
                <Bar dataKey="ctos" name="Caixas CTOs Ativas" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <div 
            className="p-3 border-t border-zinc-900 bg-[#050505] hover:bg-zinc-900 transition-colors cursor-pointer flex justify-center items-center gap-2 text-amber-400 font-mono text-[11px] uppercase font-bold"
            onClick={() => setModalCtosAberto(true)}
          >
            <Maximize2 className="w-3.5 h-3.5" /> Expandir Ranking de CTOs Completo
          </div>
        </Card>

      </div>

      {/* SECÇÃO DE EQUIPE: TOP 10 BARRAS DE PROGRESSO POR EMPRESA */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur shadow-xl mt-6 relative overflow-hidden">
        <div className="p-5 border-b border-zinc-900 flex justify-between items-center">
          <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Top 10 Distribuição da Equipe por Empresa (Atendentes vs Técnicos)
          </h3>
        </div>
        <CardContent className="p-6 space-y-6">
          {listaEquipeEmpresas.length === 0 ? (
            <p className="text-xs text-zinc-500 font-mono text-center py-4">Nenhuma equipe registrada nas instâncias.</p>
          ) : (
            listaEquipeEmpresas.slice(0, 10).map((item) => {
              const pctAtend = item.total > 0 ? (item.atendentes / item.total) * 100 : 0;
              const pctTec = item.total > 0 ? (item.tecnicos / item.total) * 100 : 0;

              return (
                <div key={item.id} className="space-y-2 bg-black/30 p-4 rounded-xl border border-zinc-800/80">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                    <span className="text-xs font-mono font-bold text-white uppercase">{item.nome}</span>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold">Atendentes: {item.atendentes} ({pctAtend.toFixed(0)}%)</span>
                      <span className="text-amber-400 font-bold">Técnicos: {item.tecnicos} ({pctTec.toFixed(0)}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-3.5 bg-black rounded-full overflow-hidden border border-zinc-800 flex p-0.5">
                    <div 
                      style={{ width: `${pctAtend}%` }} 
                      className="bg-emerald-500 h-full rounded-l-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                    <div 
                      style={{ width: `${pctTec}%` }} 
                      className="bg-amber-500 h-full rounded-r-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
        <div 
          className="p-3 border-t border-zinc-900 bg-[#050505] hover:bg-zinc-900 transition-colors cursor-pointer flex justify-center items-center gap-2 text-emerald-400 font-mono text-[11px] uppercase font-bold"
          onClick={() => setModalEquipeAberto(true)}
        >
          <Maximize2 className="w-3.5 h-3.5" /> Expandir Distribuição de Equipe Completa
        </div>
      </Card>

      {/* TABELA PRINCIPAL */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur relative mt-6 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-black/40">
          <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-300 font-bold flex items-center gap-2">
            Últimas Instâncias (Exibindo 10 de {empresasFiltradasMain.length})
          </h3>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-500 bg-[#09090b]">
                  <th className="p-4">ID Instância (Empresa)</th>
                  <th className="p-4">Plano Atual</th>
                  <th className="p-4">Status Financeiro</th>
                  <th className="p-4 text-center border-l border-zinc-900/50">Volume Leads</th>
                  <th className="p-4 text-center">CTOs Ativas</th>
                  <th className="p-4 text-center border-r border-zinc-900/50">Operadores</th>
                  <th className="p-4 text-right">Data de Deploy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {carregandoDados ? (
                  <tr><td colSpan={7} className="p-12 text-center text-emerald-500 animate-pulse font-bold tracking-widest uppercase">Sincronizando com Supabase...</td></tr>
                ) : empresasFiltradasMain.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-zinc-500">Nenhuma instância encontrada.</td></tr>
                ) : (
                  empresasFiltradasMain.slice(0, 10).map((emp) => renderLinhaEmpresa(emp))
                )}
              </tbody>
            </table>
          </div>
          <div 
            className="p-4 border-t border-zinc-900 bg-[#050505] hover:bg-zinc-900 transition-colors cursor-pointer flex justify-center items-center gap-2 text-emerald-500 font-mono text-xs uppercase font-bold"
            onClick={() => setModalTabelaAberto(true)}
          >
            <Maximize2 className="w-4 h-4" /> Expandir Auditoria Completa (Ver Todos)
          </div>
        </CardContent>
      </Card>

      {/* MODAL DA TABELA */}
      {modalTabelaAberto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-[#0a0a0a]">
            <div>
              <h2 className="text-2xl font-black font-mono text-white flex items-center gap-3"><Building2 className="text-emerald-400 w-6 h-6"/> AUDITORIA COMPLETA DE INSTÂNCIAS</h2>
              <p className="text-zinc-500 text-sm mt-1">Exibindo {empresasFiltradasTabela.length} de {empresas.length} instâncias mapeadas.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2 w-80">
                <Search className="w-4 h-4 text-zinc-400"/>
                <input type="text" value={buscaModalTabela} onChange={e => setBuscaModalTabela(e.target.value)} placeholder="Pesquisar empresa, CNPJ, status..." className="bg-transparent border-none outline-none text-sm text-white w-full font-mono" />
              </div>
              <button onClick={() => setModalTabelaAberto(false)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"><X className="w-5 h-5"/></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6 bg-[#050505]">
            <table className="w-full text-left border-collapse border border-zinc-900 rounded-xl overflow-hidden bg-[#0a0a0a]">
              <thead className="sticky top-0 z-10 bg-[#09090b] shadow-md border-b border-zinc-800">
                <tr className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  <th className="p-4">ID Instância (Empresa)</th>
                  <th className="p-4">Plano Atual</th>
                  <th className="p-4">Status Financeiro</th>
                  <th className="p-4 text-center border-l border-zinc-900/50">Volume Leads</th>
                  <th className="p-4 text-center">CTOs Ativas</th>
                  <th className="p-4 text-center border-r border-zinc-900/50">Operadores</th>
                  <th className="p-4 text-right">Data de Deploy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {empresasFiltradasTabela.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-zinc-500">Nenhuma instância encontrada na pesquisa.</td></tr>
                ) : (
                  empresasFiltradasTabela.map((emp) => renderLinhaEmpresa(emp))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DO GRÁFICO DE LEADS */}
      {modalLeadsAberto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-[#0a0a0a]">
            <div>
              <h2 className="text-2xl font-black font-mono text-white flex items-center gap-3"><BarChart3 className="text-blue-400 w-6 h-6"/> RANKING COMPLETO DE LEADS</h2>
              <p className="text-zinc-500 text-sm mt-1">Exibindo conversão de leads das {consumidoresFiltradosLeads.length} instâncias mapeadas.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2 w-80">
                <Search className="w-4 h-4 text-zinc-400"/>
                <input type="text" value={buscaModalLeads} onChange={e => setBuscaModalLeads(e.target.value)} placeholder="Pesquisar pelo nome da empresa..." className="bg-transparent border-none outline-none text-sm text-white w-full font-mono" />
              </div>
              <button onClick={() => setModalLeadsAberto(false)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"><X className="w-5 h-5"/></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-[#050505]">
            {consumidoresFiltradosLeads.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 font-mono">Nenhuma instância encontrada na pesquisa.</div>
            ) : (
              <div style={{ height: Math.max(600, consumidoresFiltradosLeads.length * 45), width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumidoresFiltradosLeads} layout="vertical" margin={{ top: 10, right: 50, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} fontFamily="monospace" width={200} tickLine={false} />
                    <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '10px' }}/>
                    
                    <Bar dataKey="instalados" name="Instalados" stackId="a" fill="#10b981" />
                    <Bar dataKey="pendentes" name="Pendentes / Outros" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DO GRÁFICO DE CAIXAS CTOS */}
      {modalCtosAberto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-[#0a0a0a]">
            <div>
              <h2 className="text-2xl font-black font-mono text-white flex items-center gap-3"><Network className="text-amber-400 w-6 h-6"/> RANKING COMPLETO DE CAIXAS CTOS</h2>
              <p className="text-zinc-500 text-sm mt-1">Exibindo infraestrutura das {consumidoresFiltradosCtos.length} instâncias mapeadas.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2 w-80">
                <Search className="w-4 h-4 text-zinc-400"/>
                <input type="text" value={buscaModalCtos} onChange={e => setBuscaModalCtos(e.target.value)} placeholder="Pesquisar pelo nome da empresa..." className="bg-transparent border-none outline-none text-sm text-white w-full font-mono" />
              </div>
              <button onClick={() => setModalCtosAberto(false)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"><X className="w-5 h-5"/></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-[#050505]">
            {consumidoresFiltradosCtos.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 font-mono">Nenhuma instância encontrada na pesquisa.</div>
            ) : (
              <div style={{ height: Math.max(600, consumidoresFiltradosCtos.length * 45), width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumidoresFiltradosCtos} layout="vertical" margin={{ top: 10, right: 50, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} fontFamily="monospace" width={200} tickLine={false} />
                    <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '10px' }}/>
                    
                    <Bar dataKey="ctos" name="Caixas CTOs Ativas" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE DISTRIBUIÇÃO DE EQUIPE COMPLETA */}
      {modalEquipeAberto && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-[#0a0a0a]">
            <div>
              <h2 className="text-2xl font-black font-mono text-white flex items-center gap-3"><Users className="text-emerald-400 w-6 h-6"/> DISTRIBUIÇÃO DE EQUIPE COMPLETA (TODAS AS EMPRESAS)</h2>
              <p className="text-zinc-500 text-sm mt-1">Exibindo o quadro de atendimento e técnico das {equipeFiltradaModal.length} instâncias mapeadas.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2 w-80">
                <Search className="w-4 h-4 text-zinc-400"/>
                <input type="text" value={buscaModalEquipe} onChange={e => setBuscaModalEquipe(e.target.value)} placeholder="Pesquisar pelo nome da empresa..." className="bg-transparent border-none outline-none text-sm text-white w-full font-mono" />
              </div>
              <button onClick={() => setModalEquipeAberto(false)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"><X className="w-5 h-5"/></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-[#050505] space-y-4">
            {equipeFiltradaModal.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 font-mono">Nenhuma instância encontrada na pesquisa.</div>
            ) : (
              equipeFiltradaModal.map((item) => {
                const pctAtend = item.total > 0 ? (item.atendentes / item.total) * 100 : 0;
                const pctTec = item.total > 0 ? (item.tecnicos / item.total) * 100 : 0;

                return (
                  <div key={item.id} className="space-y-2 bg-black/50 p-4 rounded-xl border border-zinc-800">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                      <span className="text-xs font-mono font-bold text-white uppercase">{item.nome}</span>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold">Atendentes: {item.atendentes} ({pctAtend.toFixed(0)}%)</span>
                        <span className="text-amber-400 font-bold">Técnicos: {item.tecnicos} ({pctTec.toFixed(0)}%)</span>
                      </div>
                    </div>

                    <div className="w-full h-3.5 bg-black rounded-full overflow-hidden border border-zinc-800 flex p-0.5">
                      <div 
                        style={{ width: `${pctAtend}%` }} 
                        className="bg-emerald-500 h-full rounded-l-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      />
                      <div 
                        style={{ width: `${pctTec}%` }} 
                        className="bg-amber-500 h-full rounded-r-full transition-all duration-700 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}