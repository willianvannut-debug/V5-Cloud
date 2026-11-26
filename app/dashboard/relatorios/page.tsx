// ================================================================================
// 📊 RELATÓRIOS - DASHBOARD GERAL - V5 CLOUD
// app/dashboard/relatorios/page.tsx
// ================================================================================

"use client"
import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, DollarSign, Users, TrendingUp,
  MapPin, AlertTriangle, RefreshCw,
  WifiOff, UserCheck, UserX, Package
} from 'lucide-react';

const moeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const pct = (a: number, b: number) =>
  b === 0 ? 0 : Math.round((a / b) * 100);

function KpiCard({ icon: Icon, label, value, sub, color = 'emerald' }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  const cores: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red:     'text-red-400 bg-red-500/10 border-red-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
    cyan:    'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${cores[color] || cores.emerald}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest opacity-70">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="text-2xl font-black font-mono">{value}</div>
      {sub && <div className="text-[11px] opacity-60 font-mono">{sub}</div>}
    </div>
  );
}

function BarraPct({ label, valor, total, color = 'emerald' }: {
  label: string; valor: number; total: number; color?: string;
}) {
  const p = pct(valor, total);
  const cores: Record<string, string> = {
    emerald: 'bg-emerald-500', blue: 'bg-blue-500',
    red: 'bg-red-500', amber: 'bg-amber-500',
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-bold">{valor} <span className="text-zinc-500">({p}%)</span></span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${cores[color] || cores.emerald} rounded-full transition-all`}
          style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export default function RelatoriosDashboard() {
  const [clientes, setClientes]   = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [leads, setLeads]         = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState(new Date());
  const [abaSemCob, setAbaSemCob] = useState<'lista' | 'bairros'>('lista');

  const carregar = async () => {
    setCarregando(true);
    try {
      const [resC, resCt, resL] = await Promise.all([
        fetch('/api/clientes', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/contratos', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/leads',    { credentials: 'include', cache: 'no-store' }),
      ]);

      if (resC.ok) {
        const d = await resC.json();
        setClientes(Array.isArray(d) ? d : d.clientes || d.data || []);
      }
      if (resCt.ok) {
        const d = await resCt.json();
        setContratos(Array.isArray(d) ? d : d.contratos || d.data || []);
      }
      if (resL.ok) {
        const d = await resL.json();
        setLeads(Array.isArray(d) ? d : d.leads || d.data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar dados do relatório:', e);
    } finally {
      setCarregando(false);
      setAtualizadoEm(new Date());
    }
  };

  useEffect(() => { carregar(); }, []);

  // ── Métricas clientes ──────────────────────────────────────────────────────
  const totalClientes        = clientes.length;
  const clientesAtivos       = clientes.filter(c => ['ativo','active','ativa'].includes((c.status||'').toLowerCase())).length;
  const clientesInadimpl     = clientes.filter(c => ['inadimplente','bloqueado','suspenso'].includes((c.status||'').toLowerCase())).length;
  const clientesCancelados   = clientes.filter(c => ['cancelado','inativo'].includes((c.status||'').toLowerCase())).length;

  // ── Métricas contratos / receita ───────────────────────────────────────────
  const totalContratos = contratos.length;
  const receitaMensal  = contratos.reduce((acc, c) => {
    const v = parseFloat(c.valor || c.planoValor || c.mensalidade || 0);
    return acc + (isNaN(v) ? 0 : v);
  }, 0);

  // ── Métricas leads ─────────────────────────────────────────────────────────
  const totalLeads        = leads.length;
  const leadsConvertidos  = leads.filter(l => ['convertido','cliente','instalado','INSTALAÇÃO FEITA','INSTALACAO_FEITA'].includes((l.status || l.etapa_funil || ''))).length;
  const leadsEmNegoc      = leads.filter(l => ['EM CONTATO','AGENDADO','negociacao','proposta'].includes((l.status || l.etapa_funil || ''))).length;
  const leadsPerdidos     = leads.filter(l => ['NAO CONVERTIDO','perdido','sem interesse'].includes((l.status || l.etapa_funil || ''))).length;
  const taxaConversao     = pct(leadsConvertidos, totalLeads);

  // ── Viabilidade dos leads ──────────────────────────────────────────────────
  const leadsComViabilidade = leads.filter(l =>
    (l.status || '').toUpperCase() === 'COM COBERTURA' ||
    l.temCobertura === true || l.cobertura === true ||
    l.semCobertura === false || l.viabilidade?.temCobertura === true
  ).length;
  const leadsSemViabilidade = leads.filter(l =>
    (l.status || '').toUpperCase() === 'SEM COBERTURA' ||
    l.temCobertura === false || l.cobertura === false ||
    l.semCobertura === true || l.viabilidade?.temCobertura === false
  ).length;
  const leadsSemInfo = Math.max(0, totalLeads - leadsComViabilidade - leadsSemViabilidade);

  // ── Leads sem cobertura ────────────────────────────────────────────────────
  const leadsSemCob = useMemo(() => leads.filter(l =>
    l.semCobertura === true ||
    l.cobertura === false ||
    l.temCobertura === false ||
    (l.status || '').toUpperCase() === 'SEM COBERTURA' ||
    l.viabilidade?.temCobertura === false
  ), [leads]);

  const porBairro = useMemo(() => {
    const m: Record<string, number> = {};
    leadsSemCob.forEach(l => {
      const b = l.bairro || l.viabilidade?.bairro || l.endereco?.bairro || 'Não informado';
      m[b] = (m[b] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [leadsSemCob]);

  if (carregando) return (
    <div className="flex items-center justify-center min-h-[60vh] font-mono">
      <div className="text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <p className="text-zinc-500 text-sm">Carregando relatório...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto font-mono">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" /> Dashboard Geral
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Atualizado às {atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={carregar}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Users}      label="Clientes Ativos"  value={clientesAtivos}       sub={`de ${totalClientes} total`}         color="emerald" />
        <KpiCard icon={DollarSign} label="Receita Mensal"   value={moeda(receitaMensal)} sub={`${totalContratos} contratos`}       color="blue"    />
        <KpiCard icon={AlertTriangle} label="Inadimplentes" value={clientesInadimpl}     sub={`${pct(clientesInadimpl,totalClientes)}% da base`} color="red" />
        <KpiCard icon={TrendingUp} label="Conversão Leads"  value={`${taxaConversao}%`}  sub={`${leadsConvertidos} de ${totalLeads}`} color="purple" />
      </div>

      {/* Grid status clientes + funil leads */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Viabilidade dos Leads</h2>
          <div className="space-y-3">
            <BarraPct label="Com Cobertura"  valor={leadsComViabilidade} total={totalLeads} color="emerald" />
            <BarraPct label="Sem Cobertura"  valor={leadsSemViabilidade} total={totalLeads} color="red"     />
            <BarraPct label="Não Verificado" valor={Math.max(0, leadsSemInfo)} total={totalLeads} color="amber" />
          </div>
          <div className="pt-2 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center">
            {[['Com Cob.', leadsComViabilidade, 'text-emerald-400'],['Sem Cob.', leadsSemViabilidade, 'text-red-400'],['Sem Info', Math.max(0,leadsSemInfo), 'text-amber-400']].map(([l,v,cl]) => (
              <div key={String(l)}><div className={`text-lg font-black ${cl}`}>{v}</div><div className="text-[10px] text-zinc-500">{l}</div></div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Funil de Leads</h2>
          <div className="space-y-3">
            <BarraPct label="Em Negociação" valor={leadsEmNegoc}     total={totalLeads} color="blue"    />
            <BarraPct label="Convertidos"   valor={leadsConvertidos} total={totalLeads} color="emerald" />
            <BarraPct label="Perdidos"      valor={leadsPerdidos}    total={totalLeads} color="red"     />
          </div>
          <div className="pt-2 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center">
            {[['Total', totalLeads, 'text-white'],['Convertidos', leadsConvertidos, 'text-emerald-400'],['Perdidos', leadsPerdidos, 'text-red-400']].map(([l,v,cl]) => (
              <div key={String(l)}><div className={`text-lg font-black ${cl}`}>{v}</div><div className="text-[10px] text-zinc-500">{l}</div></div>
            ))}
          </div>
        </div>
      </div>

      {/* Leads sem cobertura */}
      <div className="bg-zinc-900/60 border border-amber-500/30 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Leads Sem Cobertura</h2>
            <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{leadsSemCob.length}</span>
          </div>
          <div className="flex gap-1">
            {(['lista','bairros'] as const).map(t => (
              <button key={t} onClick={() => setAbaSemCob(t)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors ${abaSemCob===t ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {t === 'lista' ? 'Lista' : 'Por Bairro'}
              </button>
            ))}
          </div>
        </div>

        {leadsSemCob.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhum lead sem cobertura registrado
          </div>
        ) : abaSemCob === 'lista' ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {leadsSemCob.slice(0, 50).map((l: any, i: number) => (
              <div key={l.id || i} className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-white font-bold truncate">{l.nome || l.name || 'Sem nome'}</div>
                    <div className="text-zinc-500 truncate">
                      {[l.endereco?.rua || l.rua, l.bairro || l.endereco?.bairro, l.cidade || l.endereco?.cidade].filter(Boolean).join(', ') || 'Endereço não informado'}
                    </div>
                  </div>
                </div>
                <div className="text-zinc-500 shrink-0 ml-2">{l.telefone || l.whatsapp || '—'}</div>
              </div>
            ))}
            {leadsSemCob.length > 50 && <div className="text-center text-xs text-zinc-500 py-2">+{leadsSemCob.length - 50} leads não exibidos</div>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">Regiões com maior demanda reprimida — oportunidades de expansão:</p>
            {porBairro.length === 0
              ? <div className="text-zinc-600 text-xs text-center py-4">Sem dados de bairro disponíveis</div>
              : porBairro.map(([bairro, qtd]) => (
                <div key={bairro}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300 flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-400" />{bairro}</span>
                    <span className="text-amber-400 font-bold">{qtd} leads</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct(qtd, leadsSemCob.length)}%` }} />
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {leadsSemCob.length > 0 && (
          <div className="pt-3 border-t border-zinc-800 bg-amber-500/5 rounded-lg p-3">
            <p className="text-[11px] text-amber-300">
              💡 <strong>{leadsSemCob.length} leads</strong> aguardam expansão da rede.
              {porBairro[0] && ` O bairro "${porBairro[0][0]}" tem a maior demanda (${porBairro[0][1]} leads).`}
            </p>
          </div>
        )}
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Package}  label="Total Contratos"    value={totalContratos}                          color="cyan"    />
        <KpiCard icon={UserCheck} label="Taxa Ativação"     value={`${pct(clientesAtivos,totalClientes)}%`} color="emerald" />
        <KpiCard icon={UserX}    label="Taxa Cancelamento"  value={`${pct(clientesCancelados,totalClientes)}%`} color="red" />
        <KpiCard icon={WifiOff}  label="Sem Cobertura"      value={leadsSemCob.length} sub="oportunidades"  color="amber"   />
      </div>

    </div>
  );
}
