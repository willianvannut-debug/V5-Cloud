// app/funcionalidades/page.tsx — Redesign inspirado Notion
"use client";
import React from 'react';
import Link from 'next/link';
import {
  ArrowRight, MapPin, Receipt, Server, Headphones, Wrench, Users, Network, Smartphone, LayoutDashboard,
} from 'lucide-react';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { WHATSAPP_DEMO } from '@/components/site/links';

/* ============================================
   MINI-TELAS — simulações visuais do sistema
   ============================================ */
function MiniTelaViabilidade() {
  return (
    <div className="bg-[#0d1110] border border-[#1e3b29] rounded-2xl p-5 shadow-2xl w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-white">Viabilidade</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold">Ao vivo</span>
      </div>
      {/* Mapa simulado */}
      <div className="relative h-44 rounded-xl overflow-hidden bg-[#0a1510]">
        <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(rgba(16,185,129,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,.04) 1px, transparent 1px)', backgroundSize: '30px 30px'}} />
        <div className="absolute top-[25%] left-[20%] w-[60%] h-[55%] rounded-full border border-dashed border-emerald-500/20 bg-emerald-500/5" />
        {/* Pin */}
        <div className="absolute top-[40%] left-[48%]">
          <div className="w-5 h-5 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,.5)] animate-pulse" />
        </div>
        {/* CTOs */}
        {[[30,35],[50,62],[38,50],[65,42]].map(([t,l],i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full bg-emerald-400/40" style={{top:`${t}%`,left:`${l}%`}} />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,.5)]" />
        <span className="text-sm font-semibold text-emerald-400">Cobertura disponível</span>
        <span className="ml-auto text-xs text-emerald-400/60 font-mono">120m</span>
      </div>
    </div>
  );
}

function MiniTelaFinanceiro() {
  const rows = [
    { nome: 'Maria Souza', valor: 'R$ 99,90', st: 'Paga', cls: 'bg-emerald-500/15 text-emerald-400' },
    { nome: 'João Pereira', valor: 'R$ 129,90', st: 'Pendente', cls: 'bg-amber-500/15 text-amber-400' },
    { nome: 'Ana Lima', valor: 'R$ 99,90', st: 'Paga', cls: 'bg-emerald-500/15 text-emerald-400' },
  ];
  return (
    <div className="bg-[#0d1110] border border-[#1e3b29] rounded-2xl p-5 shadow-2xl w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-white">Faturas · Novembro</span>
      </div>
      <div className="divide-y divide-[#1e3b29]">
        {rows.map((r) => (
          <div key={r.nome} className="flex items-center justify-between py-3 text-sm">
            <span className="text-zinc-300">{r.nome}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 font-mono">{r.valor}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.cls}`}>{r.st}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-zinc-500 mb-1"><span>Recebido</span><span className="text-emerald-400">75%</span></div>
        <div className="h-1.5 rounded-full bg-zinc-800"><div className="h-full w-3/4 bg-emerald-500 rounded-full" /></div>
      </div>
    </div>
  );
}

function MiniTelaMikrotik() {
  const users = [
    { nome: 'maria-300m', on: true },
    { nome: 'joao-500m', on: true },
    { nome: 'pedro-1g', on: false },
  ];
  return (
    <div className="bg-[#0d1110] border border-[#1e3b29] rounded-2xl p-5 shadow-2xl w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Server className="w-4 h-4 text-red-400" />
        <span className="text-sm font-semibold text-white">Monitor Online</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 83 online
        </span>
      </div>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.nome} className="flex items-center justify-between bg-black/40 border border-[#1e3b29] rounded-lg px-3 py-2.5 text-xs font-mono">
            <span className="text-zinc-300">{u.nome}</span>
            {u.on ? (
              <span className="text-emerald-400">●</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">Bloqueado</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   SEÇÕES DE FEATURES (estilo Notion)
   ============================================ */
const FEATURES = [
  {
    eyebrow: 'Comercial',
    title: 'O lead chega qualificado.',
    subtitle: 'O interessado arrasta o pino no mapa, consulta cobertura e vira um lead com localização exata. Sua equipe só vende.',
    tags: ['Mapa de viabilidade', 'CRM Kanban', 'Conversão automática'],
    visual: 'viabilidade' as const,
    align: 'right' as const,
  },
  {
    eyebrow: 'Financeiro',
    title: 'Cobrança que roda sozinha.',
    subtitle: 'Boleto e PIX todo mês, régua de cobrança, multa e juros. Você configura uma vez.',
    tags: ['Boleto + PIX', 'Régua automática', 'Fluxo de caixa'],
    visual: 'financeiro' as const,
    align: 'left' as const,
  },
  {
    eyebrow: 'MikroTik',
    title: 'Atrasou, bloqueia. Pagou, libera.',
    subtitle: 'O V5 Cloud conversa com seu concentrador em tempo real. Monitor online, bloqueio automático e backup.',
    tags: ['Vários servidores', 'Bloqueio automático', 'Backup'],
    visual: 'mikrotik' as const,
    align: 'right' as const,
  },
];

/* ============================================
   MÓDULOS MENORES
   ============================================ */
const EXTRAS = [
  { icon: Headphones, nome: 'Suporte', desc: 'Chamados com protocolo, prioridade e SLA.', cor: 'text-orange-400 bg-orange-500/10' },
  { icon: Wrench, nome: 'Ordens de Serviço', desc: 'Do agendamento à assinatura, com rota.', cor: 'text-amber-400 bg-amber-500/10' },
  { icon: Network, nome: 'CTOs e Rede', desc: 'Importação KMZ. Sua fibra no mapa.', cor: 'text-violet-400 bg-violet-500/10' },
  { icon: LayoutDashboard, nome: 'Dashboard', desc: 'Seus números numa tela só.', cor: 'text-teal-400 bg-teal-500/10' },
  { icon: Users, nome: 'Equipe', desc: 'Convide técnicos, atendentes e gerentes.', cor: 'text-sky-400 bg-sky-500/10' },
  { icon: Smartphone, nome: 'Apps', desc: 'Assinante + Técnico. Sem custo extra.', cor: 'text-emerald-400 bg-emerald-500/10' },
];

const VISUALS = {
  viabilidade: MiniTelaViabilidade,
  financeiro: MiniTelaFinanceiro,
  mikrotik: MiniTelaMikrotik,
};

export default function FuncionalidadesPage() {
  return (
    <div className="min-h-screen bg-[#021708] text-zinc-50 relative overflow-x-hidden" style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}>
      <SiteNav />

      {/* ====== HERO ====== */}
      <section className="relative z-20 pt-36 pb-20 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight">
          Tudo o que o seu<br />
          provedor precisa.<br />
          <span className="text-emerald-400">Nada que não precisa.</span>
        </h1>
        <p className="mt-8 text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Do lead que consulta cobertura ao técnico fechando a instalação — nove módulos que conversam entre si.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/cadastro" className="inline-flex px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-xl items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            Começar grátis <ArrowRight className="w-5 h-5" />
          </Link>
          <a href={WHATSAPP_DEMO} target="_blank" rel="noreferrer" className="inline-flex px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold rounded-xl items-center justify-center transition-colors">
            Ver demonstração
          </a>
        </div>
      </section>

      {/* ====== FEATURES GRANDES (estilo Notion) ====== */}
      {FEATURES.map((f) => {
        const Visual = VISUALS[f.visual];
        return (
          <section key={f.eyebrow} className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className={`flex flex-col ${f.align === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}>
              {/* Texto */}
              <div className="flex-1 max-w-xl">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4 block">{f.eyebrow}</span>
                <h2 className="text-3xl sm:text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
                  {f.title}
                </h2>
                <p className="text-lg text-zinc-400 leading-relaxed mb-6">
                  {f.subtitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  {f.tags.map((t) => (
                    <span key={t} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Visual */}
              <div className="flex-1 flex justify-center">
                <Visual />
              </div>
            </div>
          </section>
        );
      })}

      {/* ====== SEPARADOR ====== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-[#1e3b29]" />
      </div>

      {/* ====== MÓDULOS EXTRAS (grid limpo) ====== */}
      <section className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">E tem mais.</h2>
          <p className="mt-3 text-zinc-400 text-lg">Cada módulo conectado ao próximo.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXTRAS.map((e) => (
            <div key={e.nome} className="group p-6 rounded-2xl bg-[#0a0a0a] border border-[#1e3b29] hover:border-zinc-700 transition-colors">
              <div className={`w-10 h-10 rounded-xl ${e.cor} flex items-center justify-center mb-4`}>
                <e.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">{e.nome}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== CTA FINAL ====== */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-28 pt-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            Pronto para simplificar?
          </h2>
          <p className="text-zinc-400 mb-10 text-lg">Teste 7 dias grátis. Sem cartão.</p>
          <Link href="/cadastro" className="inline-flex px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-xl items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            Criar conta grátis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
