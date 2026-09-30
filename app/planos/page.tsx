"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { Rocket, ShieldCheck, Map, Users, Zap, ArrowRight, BarChart3, Lock, Wifi, Layers, Monitor, Building2, Check, X, Loader2 } from 'lucide-react';
import MovingGrid from "@/components/ui/hyper-grid";

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [carregandoPlano, setCarregandoPlano] = useState<string | null>(null);

  const handleAssinar = async (chavePlano: string, nomePlano: string, precoCentavos: number) => {
    setCarregandoPlano(chavePlano);

    try {
      let empresaId = '';
      let emailEmpresa = '';

      if (typeof window !== 'undefined') {
        const dadosPendentesStr = localStorage.getItem('v5_dados_cadastro_pendente');
        if (dadosPendentesStr) {
          try {
            const dadosPendentes = JSON.parse(dadosPendentesStr);
            dadosPendentes.plano = chavePlano;
            localStorage.setItem('v5_dados_cadastro_pendente', JSON.stringify(dadosPendentes));
            emailEmpresa = dadosPendentes.email || '';
          } catch (e) {
            console.error("Erro ao atualizar plano nos dados pendentes", e);
          }
        }

        const localData = localStorage.getItem('v5_empresa_criada') || localStorage.getItem('v5_operador');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            empresaId = parsed.empresaId || parsed.id || parsed.empresa_id || '';
            if (!emailEmpresa) emailEmpresa = parsed.email || '';
          } catch (e) {
            console.error("Erro ao ler dados locais", e);
          }
        }
      }

      const rotaSucessoRetorno = empresaId ? `${window.location.origin}/dashboard?mudanca_plano=${chavePlano}` : undefined;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chavePlano,
          nomePlano,
          precoCentavos,
          intervalo: isAnnual ? 'year' : 'month',
          empresaId,
          email: emailEmpresa,
          successUrl: rotaSucessoRetorno
        })
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erro ao gerar sessão de pagamento.');
        setCarregandoPlano(null);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao processar pagamento.');
      setCarregandoPlano(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#021708] text-zinc-50 font-sans tracking-normal selection:bg-emerald-500/35 relative">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-[#021708]/85 backdrop-blur-md border-b border-[#1e3b29] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Wifi className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">V5 CLOUD</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Já tenho conta
            </Link>
            <Link 
              href="/cadastro" 
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold tracking-wide rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2"
            >
              Criar Conta <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* MOVING GRID ENVOLVENDO O HERO E O MAPA */}
      <MovingGrid className="pt-32 pb-24">
        
        {/* HERO SECTION */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-8">
            ◉ PLATAFORMA DE VENDAS E VIABILIDADE PARA PROVEDORES
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white font-mono tracking-wider uppercase leading-tight mb-6">
            MENOS PROCESSOS.<br />
            MAIS OPORTUNIDADES.
          </h1>
          
          <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mb-10 leading-relaxed font-normal">
            O V5 Cloud permite que o cliente consulte a disponibilidade sozinho e entrega ao vendedor um lead completo, com endereço, plano, viabilidade e CTO mais próxima.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/cadastro" 
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold tracking-wide rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
            >
              Começar Agora <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="#recursos" 
              className="px-8 py-4 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-semibold tracking-wide rounded-xl backdrop-blur-md transition-all flex items-center justify-center"
            >
              Conhecer Recursos
            </Link>
          </div>
        </section>

        {/* MAPA INTERATIVO / SIMULADOR DE VIABILIDADE */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-20">
          <div className="bg-[#121418]/90 backdrop-blur-xl border border-gray-800/80 rounded-xl overflow-hidden shadow-2xl relative">
            
            {/* Barra superior da janela estilo software */}
            <div className="bg-[#181b20] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="bg-[#121418] px-4 py-1 rounded-md text-[11px] text-gray-400 border border-gray-800 font-mono tracking-wide flex items-center gap-2">
                <Map className="w-3.5 h-3.5 text-emerald-500" />
                v5fibra.com.br/viabilidade-mapa
              </div>
              <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1 rounded font-semibold uppercase tracking-wider">
                Plano Pro
              </div>
            </div>

            {/* Área do Mapa de Ruas e Conexões */}
            <div className="relative h-[480px] w-full bg-[#0e1013]/90 overflow-hidden flex items-center justify-center">
              
              {/* Grid técnico interno */}
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(#252a32 1px, transparent 1px), linear-gradient(90deg, #252a32 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>

              {/* SVG com as Ruas e as Linhas perfeitamente conectadas */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" preserveAspectRatio="none">
                <path d="M 0 100 L 1000 100" stroke="#1c2128" strokeWidth="16" />
                <path d="M 0 250 L 1000 250" stroke="#1c2128" strokeWidth="16" />
                <path d="M 0 400 L 1000 400" stroke="#1c2128" strokeWidth="16" />
                <path d="M 200 0 L 200 500" stroke="#1c2128" strokeWidth="16" />
                <path d="M 500 0 L 500 500" stroke="#1c2128" strokeWidth="16" />
                <path d="M 800 0 L 800 500" stroke="#1c2128" strokeWidth="16" />

                {/* Linhas de Conexão */}
                <path d="M 500 250 L 800 250" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray="6,4" className="animate-pulse" />
                <path d="M 500 250 L 500 100 L 200 100" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray="6,4" />
                <path d="M 500 250 L 500 400 L 800 400" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray="6,4" />
                <path d="M 500 250 L 500 100 L 800 100" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeDasharray="6,4" />
              </svg>

              {/* CAIXA CTO */}
              <div className="absolute" style={{ top: '250px', left: '500px', transform: 'translate(-50%, -50%)' }}>
                <div className="relative group cursor-pointer bg-[#161920] border-2 border-blue-600 rounded-lg px-3 py-2.5 shadow-2xl flex items-center gap-2">
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm"></div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm"></div>
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm"></div>
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm"></div>

                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-[9px] font-bold text-white">CTO</div>
                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-white tracking-wide">Caixa CTO-04</div>
                  </div>
                </div>
              </div>

              {/* LEAD 1 (Direita) */}
              <div className="absolute" style={{ top: '250px', left: '800px', transform: 'translate(-50%, -50%)' }}>
                <div className="relative group cursor-pointer bg-[#161920] border border-emerald-500/60 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute -left-1"></div>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
                  <div>
                    <div className="text-[10px] font-semibold text-white">João Silva</div>
                    <div className="text-[9px] text-emerald-400 font-mono">95m • Viável</div>
                  </div>
                </div>
              </div>

              {/* LEAD 2 (Esquerda/Cima) */}
              <div className="absolute" style={{ top: '100px', left: '200px', transform: 'translate(-50%, -50%)' }}>
                <div className="relative group cursor-pointer bg-[#161920] border border-emerald-500/60 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
                  <div>
                    <div className="text-[10px] font-semibold text-white">Maria Oliveira</div>
                    <div className="text-[9px] text-emerald-400 font-mono">140m • Viável</div>
                  </div>
                </div>
              </div>

              {/* LEAD 3 (Baixo/Direita) */}
              <div className="absolute" style={{ top: '400px', left: '800px', transform: 'translate(-50%, -50%)' }}>
                <div className="relative group cursor-pointer bg-[#161920] border border-emerald-500/60 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
                  <div>
                    <div className="text-[10px] font-semibold text-white">Carlos Souza</div>
                    <div className="text-[9px] text-emerald-400 font-mono">180m • Viável</div>
                  </div>
                </div>
              </div>

              {/* LEAD 4 (Cima/Direita) */}
              <div className="absolute" style={{ top: '100px', left: '800px', transform: 'translate(-50%, -50%)' }}>
                <div className="relative group cursor-pointer bg-[#161920] border border-emerald-500/60 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
                  <div>
                    <div className="text-[10px] font-semibold text-white">Ana Paula</div>
                    <div className="text-[9px] text-emerald-400 font-mono">110m • Viável</div>
                  </div>
                </div>
              </div>

              {/* Widgets Flutuantes */}
              <div className="absolute top-4 right-4 bg-[#161920]/90 backdrop-blur border border-gray-700/60 px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-lg text-[10px] text-gray-300 font-mono">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Motor Vetorial Ativo</span>
              </div>

              <div className="absolute bottom-4 left-4 bg-[#161920]/90 backdrop-blur border border-gray-700/60 px-3.5 py-2 rounded-lg shadow-lg text-[10px] text-cyan-400 font-mono tracking-wide">
                ⚡ 4 Conexões Ativas Mapeadas na Região
              </div>

            </div>
          </div>
        </section>

      </MovingGrid>

      {/* RECURSOS / FEATURES COM FONTE SERIFADA DE ALTO PADRÃO */}
      <section id="recursos" className="py-24 bg-black/60 border-y border-[#1e3b29] relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide uppercase mb-4">FEITO SOB MEDIDA PARA VOCÊ VENDER MAIS NO SEU PROVEDOR</h2>
            <p className="text-zinc-300 text-base sm:text-lg font-serif italic">Soluções específicas para o comercial, o campo e a diretoria trabalharem em perfeita sincronia.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0a0a0a] border border-[#1e3b29] p-8 rounded-2xl hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3 tracking-wide">CRM para Atendentes</h3>
              <p className="text-zinc-300 text-base leading-relaxed font-sans">
                Recepção de leads, consulta de viabilidade técnica em segundos e funil de vendas otimizado. Os seus atendentes focam em fechar contratos, sem acesso a dados sensíveis de infraestrutura.
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-[#1e3b29] p-8 rounded-2xl hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3 tracking-wide">Geolocalização para Técnicos</h3>
              <p className="text-zinc-300 text-base leading-relaxed font-sans">
                O seu técnico de rua recebe a rota exata da CTO mais próxima, atualiza o status da instalação no local e trabalha de forma focada, reduzindo o tempo médio de ativação de clientes.
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-[#1e3b29] p-8 rounded-2xl hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white mb-3 tracking-wide">Blindagem LGPD (Gerentes)</h3>
              <p className="text-zinc-300 text-base leading-relaxed font-sans">
                Termos de confidencialidade obrigatórios, logs de auditoria de cada ação da equipe e retenção de registros conforme o Marco Civil da Internet. O seu provedor protegido judicialmente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE PREÇOS E PLANOS INTEGRADA */}
      <section className="py-24 px-4 md:px-8 bg-[#021708] relative z-20">
        <div className="max-w-7xl mx-auto text-center">
          
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">Preços Simples e Transparentes</h2>
          <p className="text-[#94a3b8] font-mono mb-8 tracking-widest">------------------------</p>

          <div className="flex items-center justify-center gap-3 mb-12">
            <label htmlFor="billing-toggle" className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="billing-toggle" 
                className="sr-only peer"
                checked={isAnnual}
                onChange={(e) => setIsAnnual(e.target.checked)}
              />
              <div className="w-11 h-6 bg-[#1e3b29] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f8fafc] peer-checked:after:bg-[#021708]"></div>
              <span className="ml-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[#94a3b8] select-none">
                Pague anualmente e economize 20%
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            
            {/* ESSENCIAL */}
            <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#0a0a0a] p-6 transition-all hover:shadow-md hover:border-[#f8fafc]/30">
              <div className="flex flex-col items-center text-center mb-6 pt-2">
                <Layers className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Essencial</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para pequenos provedores dando o primeiro passo digital.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-4xl font-mono font-black mb-1 transition-all duration-300 text-white">
                  R$ {isAnnual ? '970' : '97'}
                </div>
                <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                
                <button 
                  onClick={() => handleAssinar('essencial', 'Plano Essencial V5 Cloud', isAnnual ? 97000 : 9700)}
                  disabled={carregandoPlano !== null}
                  className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] transition-colors text-[#f8fafc] cursor-pointer"
                >
                  {carregandoPlano === 'essencial' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Começar Agora'}
                </button>
                
                <div className="text-left text-sm mt-auto">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ 1 Usuário de vendas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 300 caixas CTO cadastradas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 100 Leads validados por mês</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Até 2 Técnico em campo</p>
                  
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Widget de Viabilidade</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>CRM Básico (Kanban)</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]/40 line-through"><X className="w-4 h-4 text-[#94a3b8] shrink-0" /> <span>Integrações (Webhooks)</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]/40 line-through"><X className="w-4 h-4 text-[#94a3b8] shrink-0" /> <span>Suporte prioritário</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* PRO */}
            <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#0a0a0a] p-6 transition-all hover:shadow-md hover:border-[#f8fafc]/30">
              <div className="flex flex-col items-center text-center mb-6 pt-2">
                <Monitor className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Pro</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para provedores em expansão que precisam de velocidade.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-4xl font-mono font-black mb-1 transition-all duration-300 text-white">
                  R$ {isAnnual ? '2470' : '247'}
                </div>
                <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                
                <button 
                  onClick={() => handleAssinar('pro', 'Plano Pro V5 Cloud', isAnnual ? 247000 : 24700)}
                  disabled={carregandoPlano !== null}
                  className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] transition-colors text-[#f8fafc] cursor-pointer"
                >
                  {carregandoPlano === 'pro' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Começar Agora'}
                </button>
                
                <div className="text-left text-sm mt-auto">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 3 Usuários de vendas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 1.500 Caixas CTO cadastradas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 500 leads validados por mês</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Até 10 Técnico em campo</p>
                  
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Tudo do Essencial</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Webhooks Liberados (n8n)</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Relatórios de conversão</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]/40 line-through"><X className="w-4 h-4 text-[#94a3b8] shrink-0" /> <span>Setup assistido de automação</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* SCALE (Recomendado) */}
            <div className="relative flex flex-col border border-[#f8fafc] ring-1 ring-[#f8fafc]/30 scale-[1.03] rounded-xl bg-[#0a0a0a] p-6 transition-all shadow-md z-10">
              <div className="absolute -top-3 left-0 right-0 mx-auto w-fit bg-[#f8fafc] text-[#021708] font-mono text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full font-bold shadow-sm">
                Recomendado
              </div>
              <div className="flex flex-col items-center text-center mb-6 pt-4">
                <Rocket className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Scale</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para equipes comerciais estruturadas e focadas em conversão.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-4xl font-mono font-black mb-1 transition-all duration-300 text-white">
                  R$ {isAnnual ? '4970' : '497'}
                </div>
                <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                
                <button 
                  onClick={() => handleAssinar('scale', 'Plano Scale V5 Cloud', isAnnual ? 497000 : 49700)}
                  disabled={carregandoPlano !== null}
                  className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 bg-[#f8fafc] text-[#021708] hover:bg-[#f8fafc]/90 transition-colors shadow-[0_0_15px_rgba(248,250,252,0.15)] cursor-pointer"
                >
                  {carregandoPlano === 'scale' ? <Loader2 className="w-4 h-4 animate-spin text-[#021708]" /> : 'Assinar Scale'}
                </button>
                
                <div className="text-left text-sm mt-auto">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 10 Usuários de vendas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 5.000 caixas CTO cadastradas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 1.500 leads validados por mês</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Até 30 Técnico em campo</p>
                  
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Tudo do Pro</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Roleta de Leads automática</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Analytics Avançado</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Suporte VIP WhatsApp</span></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ENTERPRISE */}
            <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#0a0a0a] p-6 transition-all hover:shadow-md hover:border-[#f8fafc]/30">
              <div className="flex flex-col items-center text-center mb-6 pt-2">
                <Building2 className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Enterprise</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para grandes operações que exigem automação.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-2xl font-mono font-black mb-1 transition-all duration-300 text-white pt-2 pb-2">
                  PERSONALIZADO
                </div>
                <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest"></p>
                
                <a 
                  href="https://api.whatsapp.com/send/?phone=556194193617&text=Olá,%20tenho%20interesse%20em%20entender%20melhor%20o%20plano%20Enterprise%20do%20SaaS%20V5."
                  target="_blank"
                  rel="noreferrer"
                  className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] transition-colors text-[#f8fafc]"
                >
                  Falar com Vendas
                </a>
                
                <div className="text-left text-sm mt-auto">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Limite de usuários personalizados</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Áreas de cobertura Personalizadas</p>
                  
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Setup VIP (n8n e WhatsApp)</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>White-label (Sem marca V5)</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Gerente de sucesso dedicado</span></li>
                    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>Treinamento da equipe</span></li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ESTATÍSTICAS / TRUST */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-[#1e3b29]">
          <div className="p-4">
            <BarChart3 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-serif font-extrabold text-white mb-1">+40%</div>
            <div className="text-xs text-zinc-400 tracking-wider uppercase font-bold">Conversão de Leads</div>
          </div>
          <div className="p-4">
            <Zap className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-serif font-extrabold text-white mb-1">-2h</div>
            <div className="text-xs text-zinc-400 tracking-wider uppercase font-bold">Tempo de Instalação</div>
          </div>
          <div className="p-4">
            <Lock className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-serif font-extrabold text-white mb-1">100%</div>
            <div className="text-xs text-zinc-400 tracking-wider uppercase font-bold">Conformidade LGPD</div>
          </div>
          <div className="p-4">
            <Users className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-serif font-extrabold text-white mb-1">Ilimitado</div>
            <div className="text-xs text-zinc-400 tracking-wider uppercase font-bold">Contas de Colaboradores</div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#0a0a0a] to-[#021708] border border-emerald-500/30 rounded-3xl p-10 md:p-16 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
          
          <h2 className="text-2xl sm:text-4xl font-serif font-extrabold text-white mb-6">Pronto para profissionalizar a sua provedora?</h2>
          <p className="text-zinc-300 text-base mb-10 max-w-2xl mx-auto leading-relaxed font-sans">
            Abandone as planilhas desorganizadas e as mensagens soltas de WhatsApp. Crie a sua conta agora, aceite os termos de contratação e escolha o plano ideal para a sua infraestrutura.
          </p>
          <Link 
            href="/cadastro" 
            className="inline-flex px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold tracking-wide rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all items-center gap-3"
          >
            Criar Conta V5 Cloud <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-10 border-t border-[#1e3b29] text-center relative z-20">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-emerald-400" />
          <span className="text-base font-bold tracking-wider text-white">V5 CLOUD</span>
        </div>
        <p className="text-xs text-zinc-500 font-mono">
          © {new Date().getFullYear()} V5 Cloud Enterprise. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}