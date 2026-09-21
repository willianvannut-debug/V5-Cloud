import React from 'react';
import Link from 'next/link';
import { Rocket, ShieldCheck, Map, Users, Zap, ArrowRight, BarChart3, Lock, Wifi } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#021708] text-zinc-50 font-sans selection:bg-emerald-500/30">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-[#021708]/80 backdrop-blur-md border-b border-[#1e3b29] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Wifi className="w-6 h-6" />
            </div>
            <span className="text-xl font-black uppercase tracking-widest text-white">V5 Cloud</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Já tenho conta
            </Link>
            <Link 
              href="/cadastro" 
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all flex items-center gap-2"
            >
              Criar Conta <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Rocket className="w-4 h-4" /> O Sistema Definitivo para Provedores
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Controle a sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Provedora</span><br />
          de Ponta a Ponta.
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 leading-relaxed">
          Gestão de leads, mapeamento exato de CTOs, aplicativo para técnicos de campo e total conformidade com a LGPD. Escale a sua rede de fibra óptica com segurança de nível empresarial.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <Link 
            href="/cadastro" 
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
          >
            Começar Agora <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="#recursos" 
            className="px-8 py-4 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center"
          >
            Conhecer Recursos
          </Link>
        </div>
      </section>

      {/* RECURSOS / FEATURES */}
      <section id="recursos" className="py-24 bg-black/50 border-y border-[#1e3b29]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wider mb-4">Arquitetura de Alta Performance</h2>
            <p className="text-zinc-400">Tudo o que o seu provedor precisa, separado por níveis de acesso hierárquico.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-[#0a0a0a] border border-[#1e3b29] p-8 rounded-2xl hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">CRM para Atendentes</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Recepção de leads, consulta de viabilidade técnica em segundos e funil de vendas otimizado. Os seus atendentes focam em fechar contratos, sem acesso a dados sensíveis de infraestrutura.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#0a0a0a] border border-[#1e3b29] p-8 rounded-2xl hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Geolocalização para Técnicos</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                O seu técnico de rua recebe a rota exata da CTO mais próxima, atualiza o status da instalação no local e trabalha de forma focada, reduzindo o tempo médio de ativação de clientes.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#0a0a0a] border border-[#1e3b29] p-8 rounded-2xl hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Blindagem LGPD (Gerentes)</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Termos de confidencialidade obrigatórios, logs de auditoria de cada ação da equipe e retenção de registros conforme o Marco Civil da Internet. O seu provedor protegido judicialmente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ESTATÍSTICAS / TRUST */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-[#1e3b29]">
          <div className="p-4">
            <BarChart3 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">+40%</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Conversão de Leads</div>
          </div>
          <div className="p-4">
            <Zap className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">-2h</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Tempo de Instalação</div>
          </div>
          <div className="p-4">
            <Lock className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">100%</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Conformidade LGPD</div>
          </div>
          <div className="p-4">
            <Users className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <div className="text-3xl font-black text-white mb-1">Ilimitado</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Contas de Colaboradores</div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#0a0a0a] to-[#021708] border border-emerald-500/30 rounded-3xl p-10 md:p-16 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Pronto para profissionalizar a sua provedora?</h2>
          <p className="text-zinc-400 mb-10 max-w-2xl mx-auto">
            Abandone as planilhas desorganizadas e as mensagens soltas de WhatsApp. Crie a sua conta agora, aceite os termos de contratação e escolha o plano ideal para a sua infraestrutura.
          </p>
          <Link 
            href="/cadastro" 
            className="inline-flex px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all items-center gap-3"
          >
            Criar Conta V5 Cloud <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-10 border-t border-[#1e3b29] text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-emerald-400" />
          <span className="text-lg font-black uppercase tracking-widest text-white">V5 Cloud</span>
        </div>
        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} V5 Cloud Enterprise. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}