"use client"
import React, { useState } from 'react';
import { Layers, Monitor, Rocket, Building2, Check, X } from 'lucide-react';

export default function PlanosPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  // 🚀 Links oficiais do Stripe inseridos aqui
  const linkEssencialMensal = "https://buy.stripe.com/test_14A5kFdiN66v0bq6sm1oI00";
  const linkProMensal = "https://buy.stripe.com/test_bJe7sN92xamLf6k4ke1oI01";
  const linkScaleMensal = "https://buy.stripe.com/test_5kQdRb0w1dyX2jy3ga1oI02";

  // Se no futuro você criar links anuais, basta trocar o '#' pelo link correto.
  const linkEssencialAnual = "#";
  const linkProAnual = "#";
  const linkScaleAnual = "#";

  return (
    <div className="min-h-screen bg-[#021708] text-[#f8fafc] font-sans antialiased">
      <main className="w-full py-20 px-4 md:px-8">
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
            <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#021708] p-6 transition-all hover:shadow-md hover:border-[#f8fafc]/30">
              <div className="flex flex-col items-center text-center mb-6 pt-2">
                <Layers className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Essencial</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para pequenos provedores dando o primeiro passo digital.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-4xl font-mono font-black mb-1 transition-all duration-300">
                  R$ {isAnnual ? '970' : '97'}
                </div>
                <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                
                <a 
                  href={isAnnual ? linkEssencialAnual : linkEssencialMensal}
                  className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] transition-colors text-[#f8fafc]"
                >
                  Começar Agora
                </a>
                
                <div className="text-left text-sm mt-auto">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ 1 Usuário de vendas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 300 caixas CTO cadastradas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 100 Leads validados por mês</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Até 2 Tecnico em campo</p>
                  
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
            <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#021708] p-6 transition-all hover:shadow-md hover:border-[#f8fafc]/30">
              <div className="flex flex-col items-center text-center mb-6 pt-2">
                <Monitor className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Pro</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para provedores em expansão que precisam de velocidade.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-4xl font-mono font-black mb-1 transition-all duration-300">
                  R$ {isAnnual ? '2470' : '247'}
                </div>
                <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                
                <a 
                  href={isAnnual ? linkProAnual : linkProMensal}
                  className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] transition-colors text-[#f8fafc]"
                >
                  Começar Agora
                </a>
                
                <div className="text-left text-sm mt-auto">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 3 Usuários de vendas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 1.500 Caixas CTO cadastradas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 500 leads validados por mês</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Até 10 Tecnico em campo</p>
                  
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
            <div className="relative flex flex-col border border-[#f8fafc] ring-1 ring-[#f8fafc]/30 scale-[1.03] rounded-xl bg-[#021708] p-6 transition-all shadow-md z-10">
              <div className="absolute -top-3 left-0 right-0 mx-auto w-fit bg-[#f8fafc] text-[#021708] font-mono text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full font-bold shadow-sm">
                Recomendado
              </div>
              <div className="flex flex-col items-center text-center mb-6 pt-4">
                <Rocket className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Scale</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para equipes comerciais estruturadas e focadas em conversão.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-4xl font-mono font-black mb-1 transition-all duration-300">
                  R$ {isAnnual ? '4970' : '497'}
                </div>
                <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">/ {isAnnual ? 'ano' : 'mês'}</p>
                
                <a 
                  href={isAnnual ? linkScaleAnual : linkScaleMensal}
                  className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 bg-[#f8fafc] text-[#021708] hover:bg-[#f8fafc]/90 transition-colors shadow-[0_0_15px_rgba(248,250,252,0.15)]"
                >
                  Assinar Scale
                </a>
                
                <div className="text-left text-sm mt-auto">
                  <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 10 Usuários de vendas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 5.000 caixas CTO cadastradas</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Até 1.500 leads validados por mês</p>
                  <p className="font-mono text-xs text-[#94a3b8] mb-5">✓ Até 30 Tecnico em campo</p>
                  
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
            <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#021708] p-6 transition-all hover:shadow-md hover:border-[#f8fafc]/30">
              <div className="flex flex-col items-center text-center mb-6 pt-2">
                <Building2 className="w-8 h-8 text-[#f8fafc] mb-4" />
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Enterprise</h3>
                <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para grandes operações que exigem automação.</p>
              </div>
              <div className="text-center flex-grow flex flex-col">
                <div className="text-2xl font-mono font-black mb-1 transition-all duration-300">
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
                  <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ Limite de usuarios personalizados</p>
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
      </main>
    </div>
  );
}