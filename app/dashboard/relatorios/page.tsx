"use client"
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Download, 
  Calendar,
  RefreshCw,
  Tag,
  Lock
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';

export default function RelatoriosPage() {
  const { leads: leadsContexto } = useApp();
  const { planos, planoAtivo: planoAtivoSettings } = useSettings();
  const { operador, empresa } = useAuth();

  const [leads, setLeads] = useState<any[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Sincroniza com o localStorage operacional do técnico
  useEffect(() => {
    const carregarLeads = () => {
      if (typeof window !== 'undefined') {
        const salvos = localStorage.getItem('v5_leads_operacional');
        let parsedStorage = [];
        if (salvos) {
          try {
            parsedStorage = JSON.parse(salvos);
          } catch (e) {
            console.error("Erro ao carregar leads:", e);
          }
        }

        const atualizados = leadsContexto.map((l: any) => {
          const encontrado = parsedStorage.find((p: any) => p.id === l.id);
          return encontrado ? { ...l, ...encontrado } : l;
        });
        setLeads(atualizados);
      } else {
        setLeads(leadsContexto);
      }
    };

    carregarLeads();
    window.addEventListener('storage', carregarLeads);
    return () => window.removeEventListener('storage', carregarLeads);
  }, [leadsContexto]);

  // 🚀 VALIDAÇÃO DE PLANO REAL: Puxa o plano da empresa logada ou do contexto
  const planoDoContexto = empresa?.plano || operador?.empresa?.plano || planoAtivoSettings || 'essencial';
  const planoAtualFormatado = String(planoDoContexto).toLowerCase().trim();

  const isSuperAdmin = typeof window !== 'undefined' && localStorage.getItem('v5_role') === 'superadmin';
  
  // 🔒 REGRA: Plano Essencial NÃO tem acesso a relatórios. Liberado apenas para PRO, SCALE, ENTERPRISE ou Superadmin.
  const temAcessoRelatorios = isSuperAdmin || (planoAtualFormatado !== 'essencial');

  if (!temAcessoRelatorios) {
    return (
      <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] flex items-center justify-center font-sans w-full">
        <div className="max-w-md w-full border border-zinc-800 bg-zinc-900/60 p-8 rounded-2xl backdrop-blur text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          
          <h2 className="text-2xl font-black font-mono text-white uppercase tracking-tight">Recurso Indisponível no Plano Essencial</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Os relatórios de conversão e métricas avançadas estão disponíveis a partir do plano <strong className="text-emerald-400">PRO</strong>. 
            Faça um upgrade para elevar o nível da sua gestão e tomar decisões baseadas em dados!
          </p>
        </div>
      </div>
    );
  }

  // Se ele TIVER acesso (Pro, Scale, Enterprise ou Master), o painel renderiza normalmente!
  const relatorioItens = leads.filter(item => 
    item.statusOperacional === 'CONCLUIDA' || 
    item.statusOperacional === 'NAO_FEITA' || 
    item.status === 'SEM COBERTURA'
  );

  const totalVendas = leads.filter(l => l.statusOperacional === 'CONCLUIDA').length;
  const faturamentoGerado = totalVendas * 99.90; 
  const ticketMedio = totalVendas > 0 ? faturamentoGerado / totalVendas : 0;

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans w-full">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" /> Relatórios & Desempenho
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Análise financeira avançada, histórico consolidado e eficiência da rede.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400 font-bold uppercase flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" /> Plano {planoAtualFormatado.toUpperCase()} Ativo
          </span>
          <button className="p-2.5 rounded-xl border bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MÉTRICAS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-5 flex flex-col justify-between h-32">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Faturamento Gerado</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black font-mono text-white">
                R$ {faturamentoGerado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Baseado em instalações concluídas pelo técnico</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-5 flex flex-col justify-between h-32">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Total de Vendas</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black font-mono text-white">{totalVendas} clientes</h3>
              <span className="text-[11px] text-emerald-400 font-mono font-bold">Instalações efetivadas em campo</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-5 flex flex-col justify-between h-32">
            <div className="flex justify-between items-center text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Eficiência & Ticket Médio</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black font-mono text-white">
                R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Média por instalação realizada</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PREFERÊNCIA DE PLANOS NA REDE */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" /> Preferência de Planos na Rede (Sincronizado com Configurações)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          {(!planos || planos.length === 0) ? (
            <p className="text-xs font-mono text-zinc-500">Nenhum plano cadastrado nas configurações. Adicione planos para visualizar a preferência da rede.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {planos.map(p => (
                <div key={p.id} className="p-4 bg-black/40 border border-zinc-900 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{p.velocidade}</span>
                  <div className="font-bold font-sans text-sm text-white">{p.nome}</div>
                  <div className="text-xs font-mono text-emerald-400">{p.preco}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RELATÓRIO CONSOLIDADO */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" /> Relatório Consolidado (Instalações & Ocorrências)
          </CardTitle>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-black/40 border border-zinc-800 rounded-xl px-3 py-1.5">
              <span>Período:</span>
              <input 
                type="date" 
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs" 
              />
              <span>até</span>
              <input 
                type="date" 
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs" 
              />
            </div>

            <button className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 text-xs font-mono uppercase font-bold flex items-center gap-1.5 cursor-pointer">
              <Download className="w-3.5 h-3.5 text-emerald-400" /> Baixar
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
                  <th className="p-4">Cliente / Contato</th>
                  <th className="p-4">Plano Pretendido</th>
                  <th className="p-4">Status Operacional</th>
                  <th className="p-4">Data de Conclusão</th>
                  <th className="p-4 text-right">Atribuído</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {relatorioItens.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-zinc-500">
                      Nenhum registro consolidado no momento. Os dados aparecerão aqui assim que o técnico registrar <strong className="text-emerald-400">Instalação Feita</strong> ou <strong className="text-amber-400">Não Feita</strong>.
                    </td>
                  </tr>
                ) : (
                  relatorioItens.map((item) => {
                    let statusLabel = 'Novo';
                    let statusStyle = 'bg-zinc-800 text-zinc-300 border-zinc-700';

                    if (item.statusOperacional === 'CONCLUIDA') {
                      statusLabel = 'Instalação Feita';
                      statusStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                    } else if (item.statusOperacional === 'NAO_FEITA') {
                      statusLabel = 'Instalação Não Feita';
                      statusStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                    } else if (item.status === 'SEM COBERTURA') {
                      statusLabel = 'Sem Cobertura';
                      statusStyle = 'bg-red-500/10 text-red-400 border-red-500/30';
                    }

                    const exibirData = (item.status === 'SEM COBERTURA') ? '-' : (item.data || '-');

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4">
                          <div className="font-bold font-sans text-sm text-white">{item.nome}</div>
                          <div className="text-[11px] text-zinc-500">CEP {item.cep} • {item.endereco}</div>
                          {item.motivoPendencia && (
                            <div className="text-[10px] text-amber-400 mt-1">
                              <strong>Motivo:</strong> {item.motivoPendencia}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                            {item.plano || 'Fibra V5 - 600 Megas'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold border ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400">{exibirData}</td>
                        <td className="p-4 text-right font-bold text-emerald-400">{item.atendente || 'Técnico de Campo'}</td>
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