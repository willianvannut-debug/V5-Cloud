// components/site/HeroDemo.tsx — Janela do sistema "trabalhando sozinha" no topo do site
"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard, Users, UserCheck, Receipt, Server, Wrench, Headphones, Map as MapIcon,
  SquareKanban, Pause, Play, MapPin, BellRing, Search, Plus,
} from "lucide-react";

type ColId = "novo" | "contato" | "proposta" | "cliente";
type Card = { id: string; nome: string; info: string; tag?: string };
type FeedItem = { id: string; icon: "map" | "user" | "server" | "bell"; titulo: string; sub: string };
type Cena = { view: "funil" | "mapa"; cols: Record<ColId, Card[]>; feed: FeedItem[]; trabalhando: string | null; duracao: number };

const COLUNAS: { id: ColId; nome: string; cor: string; soDesktop?: boolean }[] = [
  { id: "novo", nome: "Novo lead", cor: "bg-sky-400" },
  { id: "contato", nome: "Em contato", cor: "bg-amber-400", soDesktop: true },
  { id: "proposta", nome: "Proposta", cor: "bg-violet-400", soDesktop: true },
  { id: "cliente", nome: "Cliente", cor: "bg-emerald-400" },
];

const INICIAL: Record<ColId, Card[]> = {
  novo: [
    { id: "joao", nome: "João Pereira", info: "95 m da CTO-04" },
    { id: "lia", nome: "Lia Martins", info: "210 m da CTO-02" },
  ],
  contato: [
    { id: "maria", nome: "Maria Oliveira", info: "140 m · Casa" },
    { id: "rui", nome: "Rui Costa", info: "60 m · Comércio" },
  ],
  proposta: [{ id: "ana", nome: "Ana Paula", info: "Plano 500 Mega" }],
  cliente: [
    { id: "pedro", nome: "Pedro Lima", info: "Ativo · 300 Mega" },
    { id: "bia", nome: "Bia Souza", info: "Ativo · 1 Giga" },
  ],
};

const CARLOS: Card = { id: "carlos", nome: "Carlos Silva", info: "120 m da CTO-04", tag: "via viabilidade" };
const F_VIAB: FeedItem = { id: "f1", icon: "map", titulo: "Nova consulta de viabilidade", sub: "Carlos Silva · com cobertura" };
const F_MARIA: FeedItem = { id: "f2", icon: "user", titulo: "Maria Oliveira avançou", sub: "Em contato → Proposta" };
const F_PPPOE: FeedItem = { id: "f3", icon: "server", titulo: "Cliente cadastrado", sub: "PPPoE criado no MikroTik" };
const F_FATURA: FeedItem = { id: "f4", icon: "bell", titulo: "Lembrete de fatura enviado", sub: "vence em 3 dias" };

function mover(cols: Record<ColId, Card[]>, id: string, de: ColId, para: ColId, novoInfo?: string) {
  const card = cols[de].find((c) => c.id === id)!;
  return {
    ...cols,
    [de]: cols[de].filter((c) => c.id !== id),
    [para]: [{ ...card, info: novoInfo ?? card.info }, ...cols[para]],
  };
}

// Roteiro do loop: cada cena é um "quadro" que a demo mostra por `duracao` ms
const c1 = { ...INICIAL, novo: [CARLOS, ...INICIAL.novo] };
const c2 = mover(c1, "maria", "contato", "proposta");
const c3 = mover(c2, "ana", "proposta", "cliente", "Ativo · 500 Mega");
const CENAS: Cena[] = [
  { view: "funil", cols: INICIAL, feed: [], trabalhando: null, duracao: 1600 },
  { view: "funil", cols: c1, feed: [F_VIAB], trabalhando: "carlos", duracao: 2600 },
  { view: "funil", cols: c2, feed: [F_MARIA, F_VIAB], trabalhando: "maria", duracao: 2600 },
  { view: "funil", cols: c3, feed: [F_PPPOE, F_MARIA, F_VIAB], trabalhando: "ana", duracao: 2400 },
  { view: "funil", cols: c3, feed: [F_FATURA, F_PPPOE, F_MARIA], trabalhando: null, duracao: 1800 },
  { view: "mapa", cols: c3, feed: [], trabalhando: null, duracao: 5000 },
];
const CENA_ESTATICA = 4; // usada quando o visitante prefere menos movimento

const ICONES = { map: MapPin, user: UserCheck, server: Server, bell: BellRing };
const COR_ICONE = { map: "text-sky-400", user: "text-violet-400", server: "text-emerald-400", bell: "text-amber-400" };

const MENU = [
  { nome: "Dashboard", icon: LayoutDashboard },
  { nome: "Leads", icon: SquareKanban, ativo: true },
  { nome: "Clientes", icon: Users },
  { nome: "Faturas", icon: Receipt },
  { nome: "MikroTik", icon: Server },
  { nome: "Ordens", icon: Wrench },
  { nome: "Suporte", icon: Headphones },
];

export default function HeroDemo() {
  const reduzirMovimento = useReducedMotion();
  const [passo, setPasso] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [visivel, setVisivel] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduzirMovimento) { setPasso(CENA_ESTATICA); setPausado(true); }
  }, [reduzirMovimento]);

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (pausado || !visivel) return;
    const timer = setTimeout(() => setPasso((p) => (p + 1) % CENAS.length), CENAS[passo].duracao);
    return () => clearTimeout(timer);
  }, [passo, pausado, visivel]);

  const cena = CENAS[passo];

  return (
    <div ref={raiz} className="bg-[#121418]/90 backdrop-blur-xl border border-gray-800/80 rounded-xl overflow-hidden shadow-2xl relative text-left">
      {/* barra da janela */}
      <div className="bg-[#181b20] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="bg-[#121418] px-4 py-1 rounded-md text-[11px] text-gray-400 border border-gray-800 font-mono tracking-wide flex items-center gap-2">
          <SquareKanban className="w-3.5 h-3.5 text-emerald-500" />
          V5 Cloud<span className="hidden sm:inline"> · {cena.view === "funil" ? "Funil de vendas" : "Mapa de leads"}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ao vivo
        </div>
      </div>

      <div className="relative h-[420px] sm:h-[480px] flex">
        {/* menu lateral */}
        <aside className="hidden md:flex w-44 flex-col gap-0.5 border-r border-gray-800 bg-[#0f1114] p-3 text-[12px]">
          <div className="flex items-center gap-2 px-2 py-2 mb-2 font-semibold text-white">
            <span className="w-5 h-5 rounded bg-emerald-500 text-[9px] font-black text-black grid place-items-center">V5</span>
            V5 Cloud
          </div>
          {MENU.map(({ nome, icon: Icone, ativo }) => (
            <div key={nome} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md ${ativo ? "bg-emerald-500/10 text-emerald-300" : "text-zinc-400"}`}>
              <Icone className="w-3.5 h-3.5" /> {nome}
            </div>
          ))}
        </aside>

        {/* área principal */}
        <div className="flex-1 min-w-0 flex flex-col p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-white font-bold text-lg">Leads</h3>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              {(["funil", "mapa"] as const).map((v) => (
                <div key={v} className="relative px-2.5 py-1 rounded-md">
                  {cena.view === v && (
                    <motion.span layoutId="hero-demo-aba" className="absolute inset-0 rounded-md bg-zinc-800" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                  )}
                  <span className={`relative flex items-center gap-1.5 ${cena.view === v ? "text-white" : ""}`}>
                    {v === "funil" ? <SquareKanban className="w-3 h-3" /> : <MapIcon className="w-3 h-3" />}
                    {v === "funil" ? "Funil" : "Mapa"}
                  </span>
                </div>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Search className="hidden sm:block w-3.5 h-3.5 text-zinc-500" />
              <span className="flex items-center gap-1 bg-emerald-500 text-black text-[11px] font-semibold px-2.5 py-1 rounded-md">
                <Plus className="w-3 h-3" /> Novo
              </span>
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            <AnimatePresence mode="wait" initial={false}>
              {cena.view === "funil" ? (
                <motion.div key="funil" className="absolute inset-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                  <Funil cena={cena} />
                </motion.div>
              ) : (
                <motion.div key="mapa" className="absolute inset-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                  <MapaLeads />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* feed de ações automáticas (canto superior direito) */}
        <div className="hidden sm:flex absolute bottom-4 right-4 w-60 flex-col gap-2 z-10 pointer-events-none">
          <AnimatePresence initial={false}>
            {cena.view === "funil" && cena.feed.slice(0, 2).map((f, i) => {
              const Icone = ICONES[f.icon];
              return (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, x: 24, scale: 0.95 }}
                  animate={{ opacity: i === 0 ? 1 : 0.6, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="flex items-start gap-2.5 rounded-lg border border-gray-700/70 bg-[#161920] px-3 py-2 shadow-2xl"
                >
                  <Icone className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${COR_ICONE[f.icon]}`} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">{f.titulo}</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">{f.sub}</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* botão de pausa */}
        <button
          type="button"
          onClick={() => setPausado((p) => !p)}
          aria-label={pausado ? "Reproduzir animação" : "Pausar animação"}
          className="absolute bottom-3 left-3 z-20 w-8 h-8 rounded-full bg-zinc-800/90 border border-gray-700 text-zinc-300 hover:text-white hover:bg-zinc-700 grid place-items-center transition-colors cursor-pointer"
        >
          {pausado ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
        </button>
      </div>
    </div>
  );
}

function Funil({ cena }: { cena: Cena }) {
  return (
    <LayoutGroup id="hero-funil">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 h-full">
        {COLUNAS.map((col) => (
          <div key={col.id} className={`${col.soDesktop ? "hidden sm:flex" : "flex"} flex-col min-w-0 rounded-lg bg-[#0f1114]/70 border border-gray-800/70 p-2`}>
            <div className="flex items-center gap-1.5 px-1 pb-2 text-[11px] text-zinc-300 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${col.cor}`} />
              <span className="truncate">{col.nome}</span>
              <motion.span key={cena.cols[col.id].length} initial={{ scale: 1.6, color: "#34d399" }} animate={{ scale: 1, color: "#71717a" }} transition={{ duration: 0.5 }} className="ml-auto font-mono text-[10px]">
                {cena.cols[col.id].length}
              </motion.span>
            </div>
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {cena.cols[col.id].map((card) => {
                  const ativo = cena.trabalhando === card.id;
                  return (
                    <motion.div
                      key={card.id}
                      layoutId={`hero-card-${card.id}`}
                      layout
                      initial={{ opacity: 0, y: -12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: ativo ? 1.03 : 1, rotate: ativo ? -1.2 : 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className={`relative rounded-md border px-2.5 py-2 ${ativo ? "bg-[#1a2420] border-emerald-500/60 shadow-[0_10px_30px_rgba(16,185,129,0.18)] z-10" : "bg-[#161a1f] border-[#23272e]"}`}
                    >
                      <div className="text-[11.5px] font-medium text-white truncate">{card.nome}</div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">{card.info}</div>
                      {card.tag && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 text-[9px] text-sky-300 font-mono">
                          <MapPin className="w-2.5 h-2.5" /> {card.tag}
                        </span>
                      )}
                      <AnimatePresence>
                        {ativo && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-[8px] font-black text-black grid place-items-center ring-2 ring-[#121418]"
                          >
                            V5
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </LayoutGroup>
  );
}

function MapaLeads() {
  const leads = [
    { top: "22%", left: "20%", nome: "Maria Oliveira", dist: "140m" },
    { top: "22%", left: "80%", nome: "Ana Paula", dist: "110m" },
    { top: "50%", left: "82%", nome: "João Pereira", dist: "95m" },
  ];
  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden bg-[#0e1013] border border-gray-800/70">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 420" preserveAspectRatio="none">
        {[90, 210, 340].map((y) => <path key={y} d={`M 0 ${y} L 1000 ${y}`} stroke="#1c2128" strokeWidth="16" />)}
        {[200, 500, 800].map((x) => <path key={x} d={`M ${x} 0 L ${x} 420`} stroke="#1c2128" strokeWidth="16" />)}
        <path d="M 500 210 L 500 90 L 200 90" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="6,4" />
        <path d="M 500 210 L 500 90 L 800 90" fill="none" stroke="#a855f7" strokeWidth="3" strokeDasharray="6,4" />
        <path d="M 500 210 L 800 210" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="6,4" />
        <motion.path
          d="M 500 210 L 500 340 L 300 340"
          fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeDasharray="6,4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.6, duration: 1.1, ease: "easeInOut" }}
        />
      </svg>

      <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <div className="bg-[#161920] border-2 border-blue-600 rounded-lg px-3 py-2 shadow-2xl flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-[9px] font-bold text-white">CTO</div>
          <div className="text-[11px] font-semibold text-white">Caixa CTO-04</div>
        </div>
      </div>

      {leads.map((l) => (
        <div key={l.nome} className="absolute" style={{ top: l.top, left: l.left, transform: "translate(-50%, -50%)" }}>
          <div className="bg-[#161920] border border-emerald-500/60 rounded-lg px-2.5 py-1.5 shadow-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div>
              <div className="text-[10px] font-semibold text-white whitespace-nowrap">{l.nome}</div>
              <div className="text-[9px] text-emerald-400 font-mono">{l.dist} • Viável</div>
            </div>
          </div>
        </div>
      ))}

      {/* lead novo chegando pela viabilidade */}
      <div className="absolute" style={{ top: "81%", left: "30%", transform: "translate(-50%, -50%)" }}>
        <motion.div
          initial={{ scale: 0, opacity: 0, y: -30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 1.6, type: "spring", stiffness: 320, damping: 18 }}
          className="relative bg-[#161920] border border-sky-400/80 rounded-lg px-2.5 py-1.5 shadow-[0_0_30px_rgba(56,189,248,0.25)] flex items-center gap-2"
        >
          <span className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <div className="w-2 h-2 bg-sky-400 rounded-full relative" />
          <div>
            <div className="text-[10px] font-semibold text-white whitespace-nowrap">Carlos Silva · novo</div>
            <div className="text-[9px] text-sky-300 font-mono">120m • Viável</div>
          </div>
        </motion.div>
      </div>

      <div className="absolute top-3 right-3 bg-[#161920]/90 border border-gray-700/60 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] text-gray-300 font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Mapa com todos os leads
      </div>
    </div>
  );
}
