//app/dashboard/help/page.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  Network, 
  ShieldCheck, 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  LayoutDashboard,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Filter,
  Navigation,
  Plus,
  BarChart3,
  MessageSquarePlus,
  Send
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const CATEGORIAS_TICKET = [
  { valor: 'tecnico', label: 'Suporte Técnico' },
  { valor: 'financeiro', label: 'Financeiro' },
  { valor: 'comercial_leads', label: 'Comercial / Leads' },
  { valor: 'duvida', label: 'Dúvida Geral' },
  { valor: 'sugestao', label: 'Sugestão de Melhoria' },
  { valor: 'bug', label: 'Erro / Bug no Sistema' },
  { valor: 'outro', label: 'Outro' }
];

export default function HelpPage() {
  const { operador } = useAuth();

  const [termoBusca, setTermoBusca] = useState('');
  const [faqAberto, setFaqAberto] = useState<number | null>(null);

  // Estados dos Tickets
  const [assuntoTicket, setAssuntoTicket] = useState('');
  const [mensagemTicket, setMensagemTicket] = useState('');
  const [categoriaTicket, setCategoriaTicket] = useState('tecnico');
  const [enviandoTicket, setEnviandoTicket] = useState(false);
  const [sucessoTicket, setSucessoTicket] = useState(false);
  const [erroTicket, setErroTicket] = useState('');
  const [meusTickets, setMeusTickets] = useState<any[]>([]);

  useEffect(() => {
    async function carregarMeusTickets() {
      try {
        if (!operador?.id) return;

        const res = await fetch('/api/tickets');
        const data = await res.json();

        if (data.sucesso) {
          setMeusTickets(data.tickets || []);
        }
      } catch (err) {
        console.error("Erro ao carregar tickets:", err);
      }
    }
    carregarMeusTickets();
  }, [operador, sucessoTicket]);

  const enviarNovoTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviandoTicket(true);
    setSucessoTicket(false);
    setErroTicket('');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assunto: assuntoTicket,
          mensagem: mensagemTicket,
          categoria: categoriaTicket
        })
      });

      const data = await res.json();

      if (!data.sucesso) {
        setErroTicket(data.mensagem || 'Erro ao enviar ticket.');
        setEnviandoTicket(false);
        return;
      }

      setSucessoTicket(true);
      setAssuntoTicket('');
      setMensagemTicket('');
      setCategoriaTicket('tecnico');
    } catch (err: any) {
      setErroTicket('Erro ao enviar: ' + err.message);
    } finally {
      setEnviandoTicket(false);
    }
  };

  const toggleFaq = (index: number) => {
    setFaqAberto(faqAberto === index ? null : index);
  };

  const labelCategoria = (valor: string) => {
    return CATEGORIAS_TICKET.find(c => c.valor === valor)?.label || 'Outro';
  };

  return (
    <div className="p-8 space-y-8 bg-[#0a0a0a] min-h-screen text-white font-sans">
      
      {/* TOPO: BANNER DE BOAS-VINDAS E BUSCA */}
      <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-emerald-950/30 border border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col items-center text-center space-y-4">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <HelpCircle className="w-64 h-64 text-emerald-400" />
        </div>

        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight font-mono text-white">
          Central de Ajuda
        </h1>
        <p className="text-zinc-400 text-xs md:text-sm max-w-xl font-mono">
          Documentação completa de operação, infraestrutura de CTOs, viabilidade, leads e diretrizes da rede.
        </p>

        <div className="w-full max-w-2xl relative mt-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Busque por artigos, CTOs, postes, viabilidade ou mapa geral..."
            className="w-full bg-black/70 border border-zinc-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold px-1">
            Módulos do Sistema & Operação
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 space-y-3 cursor-pointer group md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase font-mono text-white group-hover:text-amber-400 transition-colors">
                Relatórios & Desempenho (Análise Financeira)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Acompanhe a análise financeira avançada, histórico consolidado e a eficiência da rede baseada em instalações concluídas:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Faturamento & Vendas</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Calcula a receita total (R$) gerada e o número total de clientes, baseando-se estritamente nas instalações efetivadas.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Eficiência & Ticket Médio</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Apresenta a média de valor obtido por cada instalação realizada, medindo a eficiência de vendas da equipe.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-purple-400 font-bold flex items-center gap-1.5"><Network className="w-3.5 h-3.5" /> Preferência de Planos na Rede</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Sincronizado com os planos cadastrados nas Configurações, exibe visualmente quais são os pacotes mais populares entre os clientes.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-blue-400 font-bold flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Relatório Consolidado (Exportar)</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Tabela detalhada de instalações e ocorrências. Permite filtrar o período por datas e utilizar o botão 'Baixar' para exportar os dados.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 space-y-3 cursor-pointer group md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase font-mono text-white group-hover:text-purple-400 transition-colors">
                Gestão de Equipe & Faturamento
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Métricas de atendimento, conversão de vendas, metas e receita por colaborador. Veja como gerenciar seu time e faturamento:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-purple-400 font-bold flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5" /> Código de Convite da Empresa</span>
                  <p className="text-[11px] text-zinc-400 font-sans">O código único do Workspace (V5 Fibra Enterprise). Use para cadastrar novos colaboradores autorizados nas Configurações.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Meta de Faturamento</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Defina e edite a meta global do mês atual. O sistema calcula a % concluída baseada no desempenho de vendas da equipe.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1 sm:col-span-2">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Desempenho e Distribuição de Leads</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Acompanhe os colaboradores cadastrados e use o botão <strong>Distribuir Leads Novos</strong> para repassar atendimentos de forma organizada para a sua equipe de vendas.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 space-y-3 cursor-pointer group md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase font-mono text-white group-hover:text-emerald-400 transition-colors">
                Gestão de Caixas CTO (Rede Óptica & Infraestrutura)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Esta seção gerencia a infraestrutura física de postes e caixas de atendimento da sua rede de fibra óptica. Veja como funciona e como configurá-la:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Adicionar e Posicionar Caixa</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Ao clicar em "Adicionar Caixa CTO", o sistema herda automaticamente as coordenadas da sede da sua empresa. Use o botão de PIN para arrastar o quadrado neon verde até o poste exato.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Mapa Geral de Cobertura</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Exibe o mapa geral em modo escuro (Dark Mode com inversão de cores) contendo todas as caixas cadastradas e seus respectivos raios de atendimento (padrão de 300 metros).</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 space-y-3 cursor-pointer group md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Navigation className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase font-mono text-white group-hover:text-emerald-400 transition-colors">
                Central de Viabilidade Assistida (Guia Operacional)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                A aba de Viabilidade é a ferramenta principal do atendente para testar a cobertura de rede e calcular a distância real de cabo até a casa do cliente. Veja abaixo como ela funciona, o que fazer e como configurar:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> O que Fazer & Como Funciona</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Preencha o nome, WhatsApp, CEP e o número/lote da casa. O sistema usa a API do OSRM para medir a metragem real pelas ruas até a caixa CTO mais próxima cadastrada.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Como Usar o PIN no Mapa</span>
                  <p className="text-[11px] text-zinc-400 font-sans">O preenchimento do PIN é obrigatório. Clique em "Posicionar PIN da Casa no Mapa" e arraste o quadrado neon verde exatamente em cima da residência do cliente.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1 sm:col-span-2">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Histórico de Consultas Assistidas & Configuração</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Abaixo do formulário, o <em>Histórico de Consultas Assistidas</em> registra todas as simulações feitas na sessão atual, exibindo data, contato, endereço, status final (Com ou Sem Cobertura) e a metragem exata de cabo gasta. As configurações de raio padrão (300m) e localização da base são herdadas diretamente das caixas CTO cadastradas.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 space-y-3 cursor-pointer group md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase font-mono text-white group-hover:text-emerald-400 transition-colors">
                Visão Geral da Operação (Painel de Gestão Tática)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                O painel principal serve para a triagem em massa, busca rápida de clientes e acompanhamento do volume de consultas em tempo real:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Total de Leads (Mês)</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Soma de todos os clientes consultados no mês (convertidos e não convertidos).</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Leads Novos (Hoje)</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Consultas realizadas no dia atual. O contador é reiniciado diariamente.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Em Atendimento</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Leads cujas negociações e testes de viabilidade estão ativos e em andamento.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Convertidos (Mês)</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Contratos de fibra fechados com sucesso e instalados no mês vigente.</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-900 hover:border-emerald-500/40 rounded-2xl transition-all duration-200 space-y-3 cursor-pointer group md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase font-mono text-white group-hover:text-blue-400 transition-colors">
                Histórico de Consultas & Leads (Funil Comercial)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Centraliza todas as consultas de viabilidade feitas pelos atendentes, mapeando a base de clientes geograficamente:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Mapa de Calor & Cobertura</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Exibe visualmente em dark mode onde estão concentradas as consultas e residências dos clientes mapeados com PINs coloridos por status.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Filtros Rápidos & Abas</span>
                  <p className="text-[11px] text-zinc-400 font-sans">Permite alternar a visualização entre 'Todos', 'Com Cobertura' e 'Sem Cobertura' para focar na triagem de vendas.</p>
                </div>

                <div className="p-3 bg-black/50 border border-zinc-800 rounded-xl space-y-1 sm:col-span-2">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Como Configurar e Mudar os Status do Funil</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Cada lead gerado na aba de <em>Viabilidade</em> cai automaticamente nesta tabela. Para atualizar o status operacional ou a etapa do funil, basta interagir com as opções diretamente na linha do registro ou gerenciar o fluxo comercial integrado ao Supabase.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="pt-4 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-bold px-1">
              Perguntas Frequentes da Operação
            </h2>

            <div className="space-y-3">
              {[
                { 
                  pergunta: "Como os dados do Relatório de Desempenho são alimentados e exportados?",
                  resposta: "Os valores de faturamento e total de clientes são computados automaticamente assim que um lead tem seu status marcado como 'Instalação Feita'. Na mesma página, você pode selecionar um período de datas no Relatório Consolidado e clicar em 'Baixar' para exportar a planilha."
                },
                {
                  pergunta: "Como funciona o Código de Convite e a adição de equipe?",
                  resposta: "O Código de Convite é exclusivo da sua empresa. Para adicionar alguém, o Gerente acessa as 'Configurações' e usa esse código para enviar o convite vinculando o novo colaborador ao workspace V5 Fibra."
                },
                {
                  pergunta: "Como defino a Meta de Faturamento e distribuo leads?",
                  resposta: "Na aba Gestão de Equipe, clique em 'Editar' na meta para estipular o valor do mês. Para os leads, use o botão verde 'Distribuir Leads Novos' no topo para repassar contatos pendentes aos atendentes."
                },
                {
                  pergunta: "Como cadastrar e posicionar uma nova caixa CTO?",
                  resposta: `Acesse a aba 'Caixas CTO', clique em 'Adicionar Caixa CTO'. A caixa vai nascer nas coordenadas da sua loja. Clique em 'Alterar PIN no Mapa' para arrastar o quadrado neon verde exatamente até o poste de distribuição.`
                },
                {
                  pergunta: "Para que serve o raio configurado na caixa CTO?",
                  resposta: "O raio (geralmente definido em 300 metros) serve como o limite máximo de distância em metros pelas ruas para que o sistema considere que o endereço possui viabilidade de instalação."
                },
                {
                  pergunta: "Como realizar um teste correto na Central de Viabilidade?",
                  resposta: "Preencha os dados do cliente, digite o CEP e o número/lote, clique em 'Posicionar PIN da Casa no Mapa' para arrastar o marcador verde exatamente até a residência, e depois clique em 'Calcular Viabilidade e Criar Lead'."
                },
                {
                  pergunta: "Onde ficam salvas as consultas de viabilidade?",
                  resposta: "Elas aparecem instantaneamente no Histórico de Consultas Assistidas logo abaixo do formulário de teste, além de serem enviadas automaticamente para a aba de Leads e Funil."
                },
                {
                  pergunta: "Como um novo lead é criado no sistema?",
                  resposta: "Sempre que um atendente realiza um teste bem-sucedido na aba 'Viabilidade' fixando o PIN na casa do cliente, o sistema gera automaticamente o registro com o status correspondente."
                },
                {
                  pergunta: "Como alterar o status de um lead no histórico?",
                  resposta: "Na tabela de registros de viabilidade e funil, você pode atualizar a etapa comercial do cliente de acordo com o andamento da negociação e fechar o contrato de fibra."
                },
                {
                  pergunta: "Como o painel de Visão Geral calcula os dados exibidos?",
                  resposta: "Os dados são sincronizados em tempo real diretamente do banco de dados Supabase, computando conversões, novos leads diários e o status das negociações de forma automatizada."
                }
              ].map((faq, idx) => (
                <div key={idx} className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-900/30">
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 text-left text-xs font-mono font-bold text-white flex justify-between items-center hover:bg-zinc-900/60 transition-colors cursor-pointer"
                  >
                    <span>{faq.pergunta}</span>
                    {faqAberto === idx ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </button>
                  {faqAberto === idx && (
                    <div className="p-4 pt-0 text-xs text-zinc-400 font-mono leading-relaxed border-t border-zinc-900/80">
                      {faq.resposta}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="lg:col-span-4 space-y-6">
          
          <div className="p-6 bg-zinc-900/60 border border-emerald-500/30 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
              <MessageSquarePlus className="w-4 h-4" /> Abrir Chamado / Ticket
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Precisa de suporte técnico ou comercial? Envie sua solicitação diretamente para a nossa equipe.
            </p>

            {sucessoTicket && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl text-xs font-mono">
                Ticket enviado com sucesso! Acompanhe o status abaixo.
              </div>
            )}

            {erroTicket && (
              <div className="bg-red-950/80 border border-red-500/50 text-red-300 p-3 rounded-xl text-xs font-mono">
                {erroTicket}
              </div>
            )}

            <form onSubmit={enviarNovoTicket} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Categoria</label>
                <select
                  value={categoriaTicket}
                  onChange={(e) => setCategoriaTicket(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIAS_TICKET.map((cat) => (
                    <option key={cat.valor} value={cat.valor}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Assunto</label>
                <input 
                  type="text" 
                  value={assuntoTicket} 
                  onChange={(e) => setAssuntoTicket(e.target.value)}
                  required
                  placeholder="Ex: Instabilidade na rede / Faturamento"
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Mensagem Detalhada</label>
                <textarea 
                  value={mensagemTicket} 
                  onChange={(e) => setMensagemTicket(e.target.value)}
                  required
                  rows={3}
                  placeholder="Descreva o problema..."
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={enviandoTicket}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> {enviandoTicket ? 'Enviando...' : 'Enviar Chamado'}
              </button>
            </form>
          </div>

          <div className="p-6 bg-zinc-900/50 border border-zinc-900 rounded-2xl space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-zinc-400 tracking-wider">
              Meus Chamados Recentes
            </h3>

            {meusTickets.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono">Nenhum ticket aberto no momento.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {meusTickets.map((t) => (
                  <div key={t.id} className="p-3 bg-black/40 border border-zinc-800 rounded-xl space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-white truncate max-w-[140px]">{t.assunto}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                        t.status === 'resolvido' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <span className="inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {labelCategoria(t.categoria)}
                    </span>

                    <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">{t.mensagem}</p>

                    {t.resposta && (
                      <div className="mt-2 bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-lg space-y-1">
                        <span className="text-[9px] font-mono uppercase font-bold text-emerald-400">Resposta do Suporte</span>
                        <p className="text-[11px] text-emerald-200 font-sans leading-relaxed">{t.resposta}</p>
                      </div>
                    )}

                    <span className="text-[10px] text-zinc-600 block pt-1">
                      {new Date(t.criado_at).toLocaleDateString()} às {new Date(t.criado_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-zinc-900/50 border border-zinc-900 rounded-2xl space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-zinc-400 tracking-wider">
              Tópicos Populares
            </h3>
            <ul className="space-y-2.5 text-xs font-mono text-zinc-300">
              <li>
                <a href="/dashboard/relatorios" className="hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Relatórios & Desempenho</span> ➔
                </a>
              </li>
              <li>
                <a href="/dashboard/caixa-cto" className="hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Gestão de Caixas CTO</span> ➔
                </a>
              </li>
              <li>
                <a href="/dashboard/viabilidade" className="hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Central de Viabilidade</span> ➔
                </a>
              </li>
              <li>
                <a href="/dashboard" className="hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Visão Geral da Operação</span> ➔
                </a>
              </li>
              <li>
                <a href="/dashboard/leads" className="hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Histórico de Leads & Funil</span> ➔
                </a>
              </li>
              <li>
                <a href="/dashboard/config" className="hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>Configurações da Loja</span> ➔
                </a>
              </li>
            </ul>
          </div>

          <div className="p-6 bg-zinc-900/50 border border-zinc-900 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
              <ShieldCheck className="w-4 h-4" /> Regulatório & LGPD
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Transparência e conformidade com a Lei Geral de Proteção de Dados e Contratos SCM.
            </p>
            <div className="space-y-2 pt-1">
              <a href="/dashboard/config" className="block text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors">
                • Política de Privacidade (LGPD)
              </a>
              <a href="/dashboard/config" className="block text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors">
                • Condições Gerais de Uso (SCM)
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}