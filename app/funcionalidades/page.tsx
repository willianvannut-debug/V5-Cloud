// app/funcionalidades/page.tsx — Aba de Funcionalidades
"use client";
import React from 'react';
import Link from 'next/link';
import {
  UserCheck, Receipt, Server, Headphones, Wrench, Briefcase, Network, Smartphone, LayoutDashboard,
  Check, ArrowRight,
} from 'lucide-react';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { WHATSAPP_DEMO } from '@/components/site/links';

type Modulo = {
  id: string;
  icon: React.ElementType;
  cor: string;
  nome: string;
  titulo: string;
  texto: string;
  itens: string[];
};

const MODULOS: Modulo[] = [
  {
    id: 'clientes', icon: UserCheck, cor: 'bg-emerald-500', nome: 'Clientes e Contratos',
    titulo: 'Todo o cadastro do assinante em um só lugar.',
    texto: 'Dados, plano, contrato, acesso PPPoE e histórico de cada cliente, sem planilha paralela.',
    itens: ['Cadastro de pessoa física e jurídica', 'Importação da base por planilha', 'Planos e contratos vinculados ao cliente', 'Contrato em PDF', 'Histórico e observações', 'Acesso PPPoE do cliente'],
  },
  {
    id: 'financeiro', icon: Receipt, cor: 'bg-emerald-500', nome: 'Financeiro',
    titulo: 'Cobrança que roda sozinha, todo mês.',
    texto: 'Boleto e PIX gerados automaticamente, com multa, juros e desconto configurados do seu jeito.',
    itens: ['Boleto e PIX integrados', 'Multa, juros e desconto por antecipação', 'Régua de cobrança', 'Fluxo de caixa', 'Contas a pagar', 'Painel financeiro'],
  },
  {
    id: 'mikrotik', icon: Server, cor: 'bg-red-500', nome: 'MikroTik',
    titulo: 'Atrasou, bloqueia. Pagou, libera.',
    texto: 'O V5 Cloud conversa com o seu concentrador MikroTik e mostra a rede em tempo real.',
    itens: ['Vários servidores MikroTik', 'Planos PPPoE e pools de IP', 'Bloqueio e desbloqueio automáticos', 'Monitor Online em tempo real', 'Busca por usuário, IP ou MAC', 'Backup do MikroTik'],
  },
  {
    id: 'suporte', icon: Headphones, cor: 'bg-orange-500', nome: 'Suporte',
    titulo: 'Atendimento com protocolo, sem WhatsApp lotado.',
    texto: 'Cada pedido do assinante vira um chamado com número, prioridade e prazo.',
    itens: ['Chamados com protocolo', 'Prioridades e prazos (SLA)', 'Categorias de atendimento', 'Notas internas da equipe', 'Chamados abertos pelo app do assinante'],
  },
  {
    id: 'ordens', icon: Wrench, cor: 'bg-amber-500', nome: 'Ordens de Serviço',
    titulo: 'Do agendamento à assinatura do cliente.',
    texto: 'Crie, atribua e acompanhe as ordens de serviço, com a equipe de campo usando o app.',
    itens: ['Criação e status das OS', 'Cadastro de técnicos', 'OS no mapa do técnico', 'CTO mais próxima e casa do cliente', 'Rota pelo Maps ou Waze'],
  },
  {
    id: 'comercial', icon: Briefcase, cor: 'bg-sky-500', nome: 'Comercial',
    titulo: 'O mapa qualifica. Você vende.',
    texto: 'O interessado consulta a cobertura sozinho e o lead chega pronto para a sua equipe.',
    itens: ['Widget de viabilidade para o seu site', 'Viabilidade pela CTO mais próxima', 'CRM de leads em Kanban', 'Mapa de demanda', 'Converter lead em cliente', 'Localização exata do interessado'],
  },
  {
    id: 'cto', icon: Network, cor: 'bg-violet-500', nome: 'CTOs e Rede',
    titulo: 'Sua rede de fibra no mapa.',
    texto: 'Importe as caixas do seu KMZ e use as CTOs na viabilidade e no trabalho de campo.',
    itens: ['Importação de KMZ', 'Mapa com todas as caixas', 'CTOs ilimitadas', 'CTO mais próxima do cliente'],
  },
  {
    id: 'gestao', icon: LayoutDashboard, cor: 'bg-teal-500', nome: 'Gestão e Equipe',
    titulo: 'Os números do provedor numa tela só.',
    texto: 'Acompanhe clientes, faturamento, inadimplência, leads e chamados, e organize sua equipe.',
    itens: ['Visão geral com os principais números', 'Relatórios', 'Equipe comercial e de campo', 'Metas de faturamento', 'Convite de colaboradores'],
  },
  {
    id: 'apps', icon: Smartphone, cor: 'bg-emerald-500', nome: 'Apps',
    titulo: 'Dois apps inclusos em todos os planos.',
    texto: 'O assinante resolve a vida pelo celular, e o técnico leva o trabalho no bolso.',
    itens: ['App do Assinante: fatura, PIX e 2ª via', 'App do Assinante: abrir e acompanhar chamados', 'App do Técnico: ordens de serviço do dia', 'App do Técnico: mapa, rota e CTO mais próxima', 'Sem cobrança por técnico ou por assinante'],
  },
];

export default function FuncionalidadesPage() {
  return (
    <div className="min-h-screen bg-[#021708] text-zinc-50 font-sans relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-[#09a05c] opacity-15 blur-[150px] pointer-events-none z-0" />
      <SiteNav />

      {/* Cabeçalho */}
      <section className="relative z-20 pt-36 pb-12 px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400">Funcionalidades</span>
        <h1 className="mt-4 text-3xl sm:text-5xl font-black text-white font-mono tracking-wide uppercase leading-tight">
          Tudo o que o seu<br className="hidden sm:block" /> provedor precisa
        </h1>
        <p className="mt-5 text-zinc-300 max-w-2xl mx-auto">
          Nove áreas que conversam entre si: do lead que consulta a cobertura até o técnico fechando a instalação.
        </p>
      </section>

      {/* Atalhos (fixos ao rolar) */}
      <div className="sticky top-20 z-40 bg-[#021708]/90 backdrop-blur-md border-y border-[#1e3b29]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto">
          {MODULOS.map((m) => (
            <a key={m.id} href={`#${m.id}`} className="shrink-0 px-4 py-1.5 rounded-full text-sm text-zinc-300 border border-[#1e3b29] hover:border-emerald-500/50 hover:text-white transition-colors">
              {m.nome}
            </a>
          ))}
        </div>
      </div>

      {/* Módulos */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        {MODULOS.map((m, i) => (
          <section
            key={m.id}
            id={m.id}
            className="scroll-mt-40 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center bg-[#0a0a0a] border border-[#1e3b29] rounded-2xl p-7 md:p-10"
          >
            <div className={`space-y-5 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${m.cor} flex items-center justify-center text-black`}>
                  <m.icon className="w-5 h-5" />
                </div>
                <span className="text-sm text-zinc-400">{m.nome}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug text-balance">{m.titulo}</h2>
              <p className="text-zinc-400 leading-relaxed max-w-lg">{m.texto}</p>
            </div>

            <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
              {m.itens.map((item) => (
                <li key={item} className="flex items-start gap-2.5 rounded-xl bg-black/40 border border-[#1e3b29] px-4 py-3 text-sm text-zinc-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-28 pt-8 text-center">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6 tracking-tight">Comece hoje mesmo.</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/precos" className="inline-flex px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-xl items-center justify-center gap-2">
            Ver planos e preços <ArrowRight className="w-5 h-5" />
          </Link>
          <a href={WHATSAPP_DEMO} target="_blank" rel="noreferrer" className="inline-flex px-8 py-4 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-semibold rounded-xl items-center justify-center">
            Agendar demonstração
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}