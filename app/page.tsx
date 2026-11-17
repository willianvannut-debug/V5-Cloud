// app/page.tsx — Página inicial do site (apresentação)
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Map, Users, ArrowRight, X, MousePointerClick, Database, TrendingUp, Navigation, Play,
  Receipt, Lock, Unlock, Wrench, MapPin, Monitor, Headphones, Copy, CheckCircle2, Clock, Wifi, Zap, Server,
} from 'lucide-react';
import MovingGrid from '@/components/ui/hyper-grid';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { WHATSAPP_DEMO } from '@/components/site/links';

/* =========================================================
   MINI TELAS (ilustrações do sistema dentro dos cards)
   ========================================================= */

function TelaFinanceiro() {
  const linhas = [
    { nome: 'Maria Souza', plano: '300 Mega', valor: 'R$ 99,90', st: 'Paga', cls: 'bg-emerald-500/15 text-emerald-400' },
    { nome: 'João Pereira', plano: '500 Mega', valor: 'R$ 129,90', st: 'Pendente', cls: 'bg-amber-500/15 text-amber-400' },
    { nome: 'Ana Lima', plano: '300 Mega', valor: 'R$ 99,90', st: 'Paga', cls: 'bg-emerald-500/15 text-emerald-400' },
    { nome: 'Pedro Rocha', plano: '1 Giga', valor: 'R$ 199,90', st: 'Vencida', cls: 'bg-red-500/15 text-red-400' },
  ];
  return (
    <div className="bg-[#0d1110] border border-[#1e3b29] rounded-xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-white">Faturas · Novembro</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">PIX + Boleto</span>
      </div>
      <div className="divide-y divide-[#1e3b29]">
        {linhas.map((l) => (
          <div key={l.nome} className="flex items-center justify-between py-2.5 text-sm">
            <div className="min-w-0">
              <div className="text-white truncate">{l.nome}</div>
              <div className="text-[11px] text-zinc-500 font-mono">{l.plano}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-zinc-300 text-xs">{l.valor}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l.cls}`}>{l.st}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
          <span>Recebido no mês</span><span className="text-emerald-400">75%</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full w-3/4 bg-emerald-500 rounded-full" /></div>
      </div>
    </div>
  );
}

function TelaMikrotik() {
  const linhas = [
    { user: 'maria-300m', ip: '100.64.1.21', on: true },
    { user: 'joao-500m', ip: '100.64.1.34', on: true },
    { user: 'ana-300m', ip: '100.64.1.47', on: true },
    { user: 'pedro-1g', ip: '—', on: false },
  ];
  return (
    <div className="bg-[#0d1110] border border-[#1e3b29] rounded-xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-white">Monitor Online</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 83 conectados
        </span>
      </div>
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.user} className="flex items-center justify-between rounded-lg bg-black/40 border border-[#1e3b29] px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Wifi className={`w-3.5 h-3.5 shrink-0 ${l.on ? 'text-emerald-400' : 'text-zinc-600'}`} />
              <span className="text-xs font-mono text-white truncate">{l.user}</span>
            </div>
            {l.on ? (
              <span className="text-[11px] font-mono text-emerald-400">{l.ip}</span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                <Lock className="w-3 h-3" /> Bloqueado
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
        <Unlock className="w-3.5 h-3.5" /> Pagamento confirmado · acesso liberado
      </div>
    </div>
  );
}

function TelaSuporte() {
  const colunas = [
    { titulo: 'Aberto', cor: 'bg-sky-400', itens: [['Sem conexão', 'Alta', 'text-red-400 bg-red-500/10'], ['Lentidão', 'Média', 'text-amber-400 bg-amber-500/10']] },
    { titulo: 'Em andamento', cor: 'bg-amber-400', itens: [['Troca de plano', 'Baixa', 'text-zinc-300 bg-zinc-500/15']] },
    { titulo: 'Resolvido', cor: 'bg-emerald-400', itens: [['2ª via de fatura', 'Baixa', 'text-zinc-300 bg-zinc-500/15'], ['Mudança de endereço', 'Média', 'text-amber-400 bg-amber-500/10']] },
  ];
  return (
    <div className="bg-[#0d1110] border border-[#1e3b29] rounded-xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Headphones className="w-5 h-5 text-emerald-400" />
        <span className="font-semibold text-white">Chamados</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {colunas.map((c) => (
          <div key={c.titulo} className="min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-2 h-2 rounded-full ${c.cor}`} />
              <span className="text-[11px] text-zinc-300 truncate">{c.titulo}</span>
            </div>
            <div className="space-y-2">
              {c.itens.map(([t, p, cls], i) => (
                <div key={t} className="rounded-lg bg-black/40 border border-[#1e3b29] p-2.5">
                  <div className="text-[11px] text-white leading-snug">{t}</div>
                  <div className="text-[9px] font-mono text-zinc-500 mt-1">#20261116-00{i + 1}</div>
                  <span className={`inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded ${cls}`}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelaCampo() {
  return (
    <div className="bg-[#0d1110] border border-[#1e3b29] rounded-xl overflow-hidden shadow-2xl">
      <div className="relative h-40 bg-[#0e1013]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(#252a32 1px, transparent 1px), linear-gradient(90deg, #252a32 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
          <path d="M 40 130 L 140 130 L 140 60 L 320 60" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="6,4" />
        </svg>
        <div className="absolute" style={{ left: '10%', top: '81%', transform: 'translate(-50%,-50%)' }}>
          <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg" />
        </div>
        <div className="absolute" style={{ left: '80%', top: '37%', transform: 'translate(-50%,-100%)' }}>
          <MapPin className="w-7 h-7 text-emerald-400 fill-emerald-500/30" />
        </div>
        <div className="absolute top-3 left-3 text-[10px] font-mono bg-black/60 border border-[#1e3b29] text-sky-300 px-2 py-1 rounded">Técnico a caminho · 8 min</div>
      </div>
      <div className="p-4 space-y-2">
        {[
          ['Instalação', 'Rua das Flores, 120', '09:00', 'Em deslocamento', 'text-sky-300 bg-sky-500/10'],
          ['Reparo de fibra', 'Av. Brasil, 455', '11:30', 'Agendada', 'text-zinc-300 bg-zinc-500/15'],
        ].map(([t, e, h, s, cls]) => (
          <div key={t} className="flex items-center justify-between rounded-lg bg-black/40 border border-[#1e3b29] px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs text-white">{t}</div>
              <div className="text-[10px] text-zinc-500 truncate">{e} · {h}</div>
            </div>
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cls}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Celular({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[230px] h-[460px] rounded-[38px] p-2.5 bg-gradient-to-b from-[#2b3a33] to-[#0b1410] shadow-[0_40px_80px_rgba(0,0,0,0.6)] ring-1 ring-white/10 shrink-0">
      <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-gradient-to-b from-[#0a2a1d] to-[#04150e] px-4 pt-10 pb-4 flex flex-col gap-3">
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-black" />
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   CARD GRANDE (estilo "IA onde a sua equipe trabalha")
   ========================================================= */
function CardGrande({ eyebrow, titulo, href, children }: { eyebrow: string; titulo: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group relative flex flex-col bg-[#0a0a0a] border border-[#1e3b29] rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-colors">
      <div className="p-7 flex items-start justify-between gap-4">
        <div>
          <span className="text-sm text-zinc-400">{eyebrow}</span>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold text-white leading-snug text-balance">{titulo}</h3>
        </div>
        <span className="shrink-0 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-emerald-400 transition-colors">
          <ArrowRight className="w-5 h-5" />
        </span>
      </div>
      <div className="px-7 pb-7 mt-auto">{children}</div>
    </Link>
  );
}

const FATOS = [
  { icon: Users, txt: 'App do Assinante e App do Técnico inclusos' },
  { icon: Receipt, txt: 'Boleto e PIX gerados automaticamente' },
  { icon: Server, txt: 'Integração nativa com MikroTik' },
  { icon: Map, txt: 'Viabilidade automática pelo mapa' },
  { icon: Zap, txt: '100% na nuvem, sem servidor local' },
  { icon: ShieldCheck, txt: 'Feito por quem tem provedor' },
];

/* =========================================================
   PÁGINA
   ========================================================= */
export default function LandingPage() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // Animações GSAP (título da seção comercial + bola de luz)
  useEffect(() => {
    let ctx: any = null;
    let cancelado = false;

    import('gsap').then((gsapModule) => {
      import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
        if (cancelado) return;
        const gsap = gsapModule.default;
        const ScrollTrigger = ScrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);

        ctx = gsap.context(() => {
          const heading = document.getElementById('heading-text');
          if (heading && !heading.dataset.split) {
            heading.dataset.split = 'true';
            const textHtml = heading.innerHTML;
            heading.innerHTML = '';
            const lines = textHtml.split('<br>');
            lines.forEach((line, lineIndex) => {
              line.trim().split(' ').forEach((word) => {
                if (word === '') return;
                const span = document.createElement('span');
                span.className = 'reveal-word inline-block transform-origin-left mr-1.5 will-change-transform';
                if (word.includes('Você') || word.includes('Vende!')) span.classList.add('text-[#09a05c]');
                span.innerHTML = word;
                heading.appendChild(span);
              });
              if (lineIndex < lines.length - 1) heading.appendChild(document.createElement('br'));
            });
          }

          const revealWords = document.querySelectorAll('.reveal-word');
          const tags = document.querySelectorAll('.tag-item');
          const benefitSection = document.getElementById('benefit-section');

          if (revealWords.length > 0 && benefitSection) {
            gsap.set(revealWords, { opacity: 0, rotation: 8, yPercent: 30 });
            gsap.set(tags, { opacity: 0, clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' });
            const revealTl = gsap.timeline({
              scrollTrigger: { trigger: benefitSection, start: 'top 80%', end: 'top 40%', scrub: 1.2 },
            });
            revealTl.to(revealWords, { stagger: 0.15, opacity: 1, rotation: 0, yPercent: 0, ease: 'power1.inOut' });
            revealTl.to(tags, { duration: 0.8, opacity: 1, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', ease: 'circ.out' }, '>-0.3');
          }

          gsap.to('#ambient-orb', {
            x: '60vw', y: '40vh', ease: 'none',
            scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true },
          });
        });
      });
    });

    return () => {
      cancelado = true;
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#021708] text-zinc-50 font-sans tracking-normal selection:bg-emerald-500/35 relative overflow-x-hidden">
      <style>{`
        @keyframes v5-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .v5-marquee { animation: v5-marquee 40s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .v5-marquee { animation: none; } }
      `}</style>

      {/* Bola de luz de fundo */}
      <div id="ambient-orb" className="fixed top-0 left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-[#09a05c] opacity-20 blur-[150px] pointer-events-none z-0 mix-blend-screen will-change-transform" />

      <SiteNav />

      {/* ================= TOPO + MAPA (mantidos) ================= */}
      <MovingGrid className="pt-32 pb-24">
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide uppercase mb-8">
            ◉ SISTEMA DE GESTÃO PARA PROVEDORES DE INTERNET
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white font-mono tracking-wider uppercase leading-tight mb-6">
            MENOS PROCESSOS.<br />
            MAIS OPORTUNIDADES.
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mb-10 leading-relaxed font-normal">
            Clientes, cobrança, MikroTik, suporte, técnicos e vendas em um só lugar. Do primeiro contato do lead até o boleto pago, o V5 Cloud cuida da operação do seu provedor.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/cadastro" className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold tracking-wide rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2">
              Começar Agora <ArrowRight className="w-5 h-5" />
            </Link>
            <button onClick={() => setIsVideoOpen(true)} className="px-8 py-4 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-semibold tracking-wide rounded-xl backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" /> Conhecer sistema (vídeo)
            </button>
          </div>
        </section>

        {/* MAPA INTERATIVO (mantido igual) */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-20">
          <div className="bg-[#121418]/90 backdrop-blur-xl border border-gray-800/80 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="bg-[#181b20] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="bg-[#121418] px-4 py-1 rounded-md text-[11px] text-gray-400 border border-gray-800 font-mono tracking-wide flex items-center gap-2">
                <Map className="w-3.5 h-3.5 text-emerald-500" />
                seu-site.com.br/viabilidade
              </div>
              <div className="hidden sm:block text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1 rounded font-semibold uppercase tracking-wider">
                Plano Escolhido
              </div>
            </div>

            <div className="relative h-[480px] w-full bg-[#0e1013]/90 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(#252a32 1px, transparent 1px), linear-gradient(90deg, #252a32 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" preserveAspectRatio="none">
                <path d="M 0 100 L 1000 100" stroke="#1c2128" strokeWidth="16" />
                <path d="M 0 250 L 1000 250" stroke="#1c2128" strokeWidth="16" />
                <path d="M 0 400 L 1000 400" stroke="#1c2128" strokeWidth="16" />
                <path d="M 200 0 L 200 500" stroke="#1c2128" strokeWidth="16" />
                <path d="M 500 0 L 500 500" stroke="#1c2128" strokeWidth="16" />
                <path d="M 800 0 L 800 500" stroke="#1c2128" strokeWidth="16" />
                <path d="M 500 250 L 800 250" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray="6,4" className="animate-pulse" />
                <path d="M 500 250 L 500 100 L 200 100" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray="6,4" />
                <path d="M 500 250 L 500 400 L 800 400" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray="6,4" />
                <path d="M 500 250 L 500 100 L 800 100" fill="none" stroke="#a855f7" strokeWidth="3.5" strokeDasharray="6,4" />
              </svg>

              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="relative group cursor-pointer bg-[#161920] border-2 border-blue-600 rounded-lg px-3 py-2.5 shadow-2xl flex items-center gap-2">
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm" />
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm" />
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm" />
                  <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm" />
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-[9px] font-bold text-white">CTO</div>
                  <div className="text-left"><div className="text-[11px] font-semibold text-white tracking-wide">Caixa CTO-04</div></div>
                </div>
              </div>

              {[
                { top: '50%', left: '80%', nome: 'João Silva', dist: '95m', ping: true },
                { top: '20%', left: '20%', nome: 'Maria Oliveira', dist: '140m' },
                { top: '80%', left: '80%', nome: 'Carlos Souza', dist: '180m' },
                { top: '20%', left: '80%', nome: 'Ana Paula', dist: '110m' },
              ].map((l) => (
                <div key={l.nome} className="absolute" style={{ top: l.top, left: l.left, transform: 'translate(-50%, -50%)' }}>
                  <div className="relative group cursor-pointer bg-[#161920] border border-emerald-500/60 rounded-lg px-3 py-1.5 shadow-xl flex items-center gap-2">
                    {l.ping && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute -left-1" />}
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative" />
                    <div>
                      <div className="text-[10px] font-semibold text-white">{l.nome}</div>
                      <div className="text-[9px] text-emerald-400 font-mono">{l.dist} • Viável</div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="absolute top-4 right-4 bg-[#161920]/90 backdrop-blur border border-gray-700/60 px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-lg text-[10px] text-gray-300 font-mono">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Motor Vetorial Ativo</span>
              </div>
              <div className="absolute bottom-4 left-4 bg-[#161920]/90 backdrop-blur border border-gray-700/60 px-3.5 py-2 rounded-lg shadow-lg text-[10px] text-cyan-400 font-mono tracking-wide">
                ⚡ Mapa com todos os leads
              </div>
            </div>
          </div>
        </section>
      </MovingGrid>

      {/* ================= FAIXA "INTEGRADO COM" ================= */}
      <section className="relative z-20 border-y border-[#1e3b29] bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center gap-5">
          <p className="text-sm text-zinc-400">Integrado ao que o seu provedor já usa</p>
          <div className="flex flex-wrap justify-center gap-x-8 sm:gap-x-10 gap-y-3 font-mono text-lg sm:text-xl font-bold tracking-wider text-zinc-300">
            <span>MikroTik</span><span className="hidden sm:inline text-zinc-700">·</span>
            <span>PPPoE</span><span className="hidden sm:inline text-zinc-700">·</span>
            <span>PIX</span><span className="hidden sm:inline text-zinc-700">·</span>
            <span>Boleto</span><span className="hidden sm:inline text-zinc-700">·</span>
            <span>WidePay</span><span className="hidden sm:inline text-zinc-700">·</span>
            <span>KMZ</span>
          </div>
        </div>
      </section>

      {/* ================= TUDO EM UM SÓ LUGAR (cards grandes) ================= */}
      <section className="relative z-20 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 text-balance">
            Seu provedor inteiro em um só lugar.
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mb-12">
            Chega de pular entre planilha, Winbox, sistema financeiro e WhatsApp. Cada área da operação conversa com as outras.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardGrande eyebrow="Financeiro" titulo="Cobrança que roda sozinha, todo mês." href="/funcionalidades#financeiro">
              <TelaFinanceiro />
            </CardGrande>
            <CardGrande eyebrow="MikroTik" titulo="Atrasou, bloqueia. Pagou, libera." href="/funcionalidades#mikrotik">
              <TelaMikrotik />
            </CardGrande>
          </div>

          {/* Card largo */}
          <Link href="/funcionalidades#suporte" className="group mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-[#0a0a0a] border border-[#1e3b29] rounded-2xl p-7 hover:border-emerald-500/50 transition-colors">
            <div className="space-y-5">
              <span className="text-sm text-zinc-400">Suporte</span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white leading-snug text-balance">
                Atendimento com protocolo, sem WhatsApp lotado.
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                O assinante abre o chamado pelo app, a equipe responde pelo painel e cada atendimento fica registrado, com prioridade e prazo.
              </p>
              <span className="inline-flex w-9 h-9 rounded-full bg-white text-black items-center justify-center group-hover:bg-emerald-400 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </span>
            </div>
            <TelaSuporte />
          </Link>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardGrande eyebrow="Equipe de campo" titulo="Ordens de serviço com rota até a porta do cliente." href="/funcionalidades#ordens">
              <TelaCampo />
            </CardGrande>

            {/* Card dos apps */}
            <Link href="/funcionalidades#apps" className="group relative flex flex-col bg-gradient-to-br from-emerald-500/15 to-[#0a0a0a] border border-emerald-500/30 rounded-2xl overflow-hidden hover:border-emerald-500/60 transition-colors">
              <div className="p-7 flex items-start justify-between gap-4">
                <div>
                  <span className="text-sm text-emerald-300">Inclusos em todos os planos</span>
                  <h3 className="mt-1 text-xl sm:text-2xl font-bold text-white leading-snug text-balance">App do Assinante e App do Técnico.</h3>
                  <p className="mt-3 text-sm text-zinc-300 max-w-sm">Em outros sistemas, só o app do assinante custa a partir de R$ 899. No V5 Cloud, os dois já vêm com o plano.</p>
                </div>
                <span className="shrink-0 w-9 h-9 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-emerald-400 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-auto flex justify-center gap-4 px-6 -mb-24 sm:-mb-20">
                <Celular>
                  <div className="text-white font-bold text-lg">Olá, Maria</div>
                  <div className="text-[11px] text-zinc-400 -mt-2">Plano 300 Mega · Ativo</div>
                  <div className="rounded-2xl bg-white/5 border border-[#1e3b29] p-3">
                    <div className="text-[10px] text-zinc-400">Fatura de novembro</div>
                    <div className="text-xl font-bold text-white">R$ 99,90</div>
                    <div className="text-[10px] text-zinc-400">Vence em 10/11</div>
                  </div>
                  <div className="rounded-xl bg-emerald-500 text-black text-xs font-bold py-2.5 flex items-center justify-center gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copiar código PIX
                  </div>
                  <div className="rounded-xl bg-white/5 border border-[#1e3b29] text-xs text-white py-2.5 flex items-center justify-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-emerald-400" /> Abrir chamado
                  </div>
                </Celular>
                <div className="hidden sm:block">
                  <Celular>
                    <div className="text-white font-bold text-lg">Minhas OS</div>
                    <div className="text-[11px] text-zinc-400 -mt-2">Hoje · 3 agendadas</div>
                    {[['Instalação', '09:00', true], ['Reparo de fibra', '11:30', false], ['Troca de ONU', '14:00', false]].map(([t, h, ok]) => (
                      <div key={t as string} className="rounded-xl bg-white/5 border border-[#1e3b29] p-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                          {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-white">{t}</div>
                          <div className="text-[9px] text-zinc-500">{h}</div>
                        </div>
                      </div>
                    ))}
                  </Celular>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= MÓDULO COMERCIAL (mantido) ================= */}
      <section id="benefit-section" className="py-20 md:py-28 bg-transparent relative z-20 border-t border-[#1e3b29]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <span className="mb-6 text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400">Módulo Comercial</span>

          <div className="w-full mb-10 sm:mb-14">
            <h2 id="heading-text" className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white overflow-visible">
              Chega de consultar CEP na mão.<br />O mapa qualifica.<br />Você Vende!
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto mb-20">
            {['Filtro automático', 'CRM de vendas', 'Foco em fechamento', 'Widget interativo'].map((t) => (
              <div key={t} className="tag-item px-6 py-3 rounded-full text-sm sm:text-base font-semibold tracking-tight shadow-xl bg-[#00e67a] text-[#0D0D0D] border border-[#0D0D0D]">
                {t}
              </div>
            ))}
          </div>

          <div className="text-center mb-16">
            <h3 className="text-2xl sm:text-4xl font-serif font-bold text-white tracking-wide uppercase mb-4">FEITO SOB MEDIDA PARA VOCÊ VENDER MAIS NO SEU PROVEDOR</h3>
            <p className="text-zinc-300 text-base sm:text-lg font-serif italic">Soluções específicas para o comercial, o campo e a diretoria trabalharem em perfeita sincronia.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full text-left">
            {[
              { n: '01', icon: MousePointerClick, t: 'O Cliente Faz o Teste Sozinho', d: 'Com o widget integrado no seu site, o cliente insere o endereço e o sistema verifica a cobertura de fibra e a CTO automaticamente.' },
              { n: '02', icon: Database, t: 'Dados Diretos no Sistema', d: 'Todas as informações aparecem instantaneamente no painel: endereço exato, viabilidade técnica, plano escolhido e a caixa CTO mais próxima.' },
              { n: '03', icon: TrendingUp, t: 'Time de Vendas com Superpoderes', d: 'Sua equipe comercial recebe o lead pronto e qualificado, eliminando o tempo perdido com planilhas e aumentando as conversões.' },
              { n: '04', icon: Users, t: 'CRM para Atendentes', d: 'Recepção de leads, consulta de viabilidade técnica em segundos e funil de vendas otimizado para fechar mais contratos com facilidade.' },
              { n: '05', icon: Navigation, t: 'Geolocalização para Técnicos', d: 'O técnico de rua recebe a rota exata da CTO mais próxima e atualiza o status da instalação no local de forma rápida e precisa.' },
              { n: '06', icon: ShieldCheck, t: 'Blindagem LGPD (Gerentes)', d: 'Termos de confidencialidade obrigatórios e retenção de registros conforme o Marco Civil da Internet.' },
            ].map((c) => (
              <div key={c.n} className="relative bg-[#0a0a0a] border border-[#1e3b29] p-8 rounded-2xl flex flex-col justify-between overflow-hidden group hover:border-emerald-500/50 transition-colors">
                <div className="absolute top-6 right-6 text-5xl font-mono font-black text-zinc-800/60 select-none group-hover:text-emerald-500/20 transition-colors">{c.n}</div>
                <div className="relative z-10 space-y-6">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                    <c.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-serif font-bold text-white tracking-wide">{c.t}</h4>
                    <p className="text-zinc-300 text-sm leading-relaxed font-sans">{c.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= VEJA O QUE O V5 CLOUD FAZ (cards pequenos) ================= */}
      <section className="relative z-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-zinc-400 mb-4">Veja o que o V5 Cloud pode fazer</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { icon: Receipt, cor: 'bg-emerald-500', t: 'Gere boletos e PIX automaticamente', href: '/funcionalidades#financeiro' },
              { icon: Lock, cor: 'bg-red-500', t: 'Bloqueie inadimplentes sem intervenção', href: '/funcionalidades#mikrotik' },
              { icon: Wrench, cor: 'bg-amber-500', t: 'Organize as ordens de serviço', href: '/funcionalidades#ordens' },
              { icon: MapPin, cor: 'bg-sky-500', t: 'Valide a viabilidade pelo mapa', href: '/funcionalidades#comercial' },
              { icon: Monitor, cor: 'bg-violet-500', t: 'Acompanhe quem está online', href: '/funcionalidades#mikrotik' },
            ].map((c) => (
              <Link key={c.t} href={c.href} className="group flex flex-col justify-between gap-12 min-h-[170px] bg-[#0a0a0a] border border-[#1e3b29] rounded-xl p-5 hover:border-emerald-500/50 transition-colors">
                <div className={`w-10 h-10 rounded-full ${c.cor} flex items-center justify-center text-black`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-white leading-snug">
                  {c.t} <ArrowRight className="inline w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAIXA CORRENDO (fatos do produto) ================= */}
      <section className="relative z-20 border-y border-[#1e3b29] bg-black/30 overflow-hidden py-4">
        <div className="v5-marquee flex w-max gap-12">
          {[...FATOS, ...FATOS].map((f, i) => (
            <span key={i} className="flex items-center gap-2.5 text-sm text-zinc-400 whitespace-nowrap">
              <f.icon className="w-4 h-4 text-emerald-500" /> {f.txt}
            </span>
          ))}
        </div>
      </section>

      {/* ================= CTA FINAL ================= */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#0a0a0a] to-[#021708] border border-emerald-500/30 rounded-3xl p-10 md:p-16 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight">Comece hoje mesmo.</h2>
          <p className="text-zinc-300 text-base mb-10 max-w-2xl mx-auto leading-relaxed">
            Abandone as planilhas e as mensagens soltas de WhatsApp. Crie sua conta ou veja o sistema funcionando numa demonstração com a nossa equipe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro" className="inline-flex px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold tracking-wide rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all items-center justify-center gap-3">
              Criar Conta V5 Cloud <ArrowRight className="w-5 h-5" />
            </Link>
            <a href={WHATSAPP_DEMO} target="_blank" rel="noreferrer" className="inline-flex px-10 py-4 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-semibold rounded-xl transition-all items-center justify-center">
              Agendar demonstração
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* ================= MODAL DO VÍDEO ================= */}
      {isVideoOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-emerald-500/40 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] p-4 sm:p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e3b29] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-white tracking-wider uppercase font-mono">Demonstração V5 Cloud</span>
              </div>
              <button onClick={() => setIsVideoOpen(false)} aria-label="Fechar vídeo" className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/NloapfLpXgQ?autoplay=1"
                title="Demonstração V5 Cloud"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}