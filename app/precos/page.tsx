// app/precos/page.tsx — Aba de Preços
"use client";
import React, { useState } from 'react';
import { Rocket, Layers, Monitor, Building2, Check, X, Loader2, ArrowRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { WHATSAPP_DEMO, WHATSAPP_ENTERPRISE } from '@/components/site/links';
import { PLANOS_V5, ChavePlano, formatarReais } from '@/lib/planos-v5';

const INCLUSO = [
  'Clientes e Contratos',
  'Cobrança automática por boleto e PIX',
  'Integração MikroTik (bloqueio e liberação)',
  'Monitor Online',
  'Suporte com protocolo',
  'Ordens de Serviço',
  'CTOs ilimitadas',
  'Viabilidade automática + CRM de leads',
  'App do Assinante',
  'App do Técnico',
];

const FAQ = [
  {
    p: 'Vocês migram minha base de outro sistema?',
    r: 'Sim. Você importa seus clientes por planilha, e nossa equipe ajuda você na migração.',
  },
  {
    p: 'Preciso trocar meu MikroTik?',
    r: 'Não. O V5 Cloud se conecta ao MikroTik que você já usa para ver quem está online, bloquear e liberar clientes.',
  },
  {
    p: 'Tem fidelidade ou multa de cancelamento?',
    r: 'Não. A assinatura é mensal ou anual, e você pode cancelar quando quiser.',
  },
  {
    p: 'O que conta como assinante ativo?',
    r: 'Cada cliente com contrato ativo no sistema. Clientes cancelados não contam para o limite do plano.',
  },
  {
    p: 'Os apps do assinante e do técnico têm custo extra?',
    r: 'Não. Os dois apps estão inclusos em todos os planos, sem cobrança por técnico ou por assinante.',
  },
  {
    p: 'Meus dados ficam seguros?',
    r: 'Os dados ficam na nuvem, separados por empresa, e o sistema segue a LGPD e o Marco Civil da Internet.',
  },
];

function Linha({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs text-[#94a3b8] mb-1.5">✓ {children}</p>;
}
function Destaque({ children, riscado = false }: { children: React.ReactNode; riscado?: boolean }) {
  return riscado ? (
    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]/40 line-through"><X className="w-4 h-4 text-[#94a3b8] shrink-0" /> <span>{children}</span></li>
  ) : (
    <li className="flex items-start gap-2 font-mono text-xs text-[#94a3b8]"><Check className="w-4 h-4 text-[#f8fafc] shrink-0" /> <span>{children}</span></li>
  );
}

export default function PrecosPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [carregandoPlano, setCarregandoPlano] = useState<string | null>(null);

  // Preço que aparece no card (vem da tabela única)
  const Preco = ({ chave }: { chave: ChavePlano }) => {
    const centavos = isAnnual ? PLANOS_V5[chave].anual : PLANOS_V5[chave].mensal;
    return (
      <>
        <div className="text-4xl font-mono font-black mb-1 text-white">R$ {formatarReais(centavos)}</div>
        <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px] uppercase tracking-widest">
          / {isAnnual ? `ano · equivale a R$ ${formatarReais(Math.round(centavos / 12))}/mês` : 'mês'}
        </p>
      </>
    );
  };

  const handleAssinar = async (chavePlano: ChavePlano) => {
    const intervalo = isAnnual ? 'year' : 'month';
    const nomePlano = PLANOS_V5[chavePlano].nome;
    // Só informativo: o servidor deve calcular o preço sozinho pela tabela única
    const precoCentavos = isAnnual ? PLANOS_V5[chavePlano].anual : PLANOS_V5[chavePlano].mensal;
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
            console.error('Erro ao atualizar plano nos dados pendentes', e);
          }
        }
        const localData = localStorage.getItem('v5_empresa_criada') || localStorage.getItem('v5_operador');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            empresaId = parsed.empresaId || parsed.id || parsed.empresa_id || '';
            if (!emailEmpresa) emailEmpresa = parsed.email || '';
          } catch (e) {
            console.error('Erro ao ler dados locais', e);
          }
        }
      }

      const rotaSucessoRetorno = empresaId ? `${window.location.origin}/dashboard?mudanca_plano=${chavePlano}` : undefined;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chavePlano, nomePlano, precoCentavos,
          intervalo,
          empresaId, email: emailEmpresa, successUrl: rotaSucessoRetorno,
        }),
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

  const btnSecundario = 'w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 border border-[#1e3b29] bg-transparent hover:bg-[#1e3b29] transition-colors text-[#f8fafc] cursor-pointer';

  return (
    <div className="min-h-screen bg-[#021708] text-zinc-50 font-sans relative overflow-x-hidden">
      <div className="fixed top-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-[#09a05c] opacity-15 blur-[150px] pointer-events-none z-0" />
      <SiteNav />

      {/* Cabeçalho */}
      <section className="relative z-20 pt-36 pb-10 px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-mono font-semibold uppercase tracking-[0.25em] text-emerald-400">Preços</span>
        <h1 className="mt-4 text-3xl sm:text-5xl font-black text-white font-mono tracking-wide uppercase leading-tight">
          Planos que crescem<br className="hidden sm:block" /> com o seu provedor
        </h1>
        <p className="mt-5 text-zinc-300 max-w-2xl mx-auto">
          Você paga pelo número de assinantes ativos. Todas as funções e os dois apps vêm em todos os planos.
        </p>
      </section>

      {/* Toggle mensal / anual */}
      <div className="relative z-20 flex items-center justify-center gap-3 mb-14">
        <label htmlFor="billing-toggle" className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" id="billing-toggle" className="sr-only peer" checked={isAnnual} onChange={(e) => setIsAnnual(e.target.checked)} />
          <div className="w-11 h-6 bg-[#1e3b29] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f8fafc] peer-checked:after:bg-[#021708]" />
          <span className="ml-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[#94a3b8] select-none">Pague anualmente e economize 20%</span>
        </label>
      </div>

      {/* Cards */}
      <section className="relative z-20 px-4 md:px-8 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* ESSENCIAL */}
          <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#0a0a0a] p-6 transition-all hover:border-[#f8fafc]/30">
            <div className="flex flex-col items-center text-center mb-6 pt-2">
              <Layers className="w-8 h-8 text-[#f8fafc] mb-4" />
              <h3 className="text-xl font-black uppercase tracking-wider mb-2">Essencial</h3>
              <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para pequenos provedores dando o primeiro passo digital.</p>
            </div>
            <div className="text-center flex-grow flex flex-col">
              <Preco chave="essencial" />
              <button onClick={() => handleAssinar('essencial')} disabled={carregandoPlano !== null} className={btnSecundario}>
                {carregandoPlano === 'essencial' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Começar Agora'}
              </button>
              <div className="text-left text-sm mt-auto">
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                <Linha>300 assinantes ativos</Linha>
                <Linha>1 usuário de vendas</Linha>
                <Linha>2 técnicos em campo</Linha>
                <Linha>2 vendedores em campo</Linha>
                <Linha>1 servidor MikroTik</Linha>
                <Linha>70 leads validados por mês + 30 leads extras</Linha>
                <p className="font-mono text-xs text-[#94a3b8] mb-8">✓ +R$ 1,50 por lead validado excedente</p>
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                <ul className="space-y-2.5">
                  <Destaque>Link simples de viabilidade</Destaque>
                  <Destaque>CRM Básico (Kanban)</Destaque>
                  <Destaque>App para cliente e técnico</Destaque>
                  <Destaque>Suporte por chamado e e-mail</Destaque>
                </ul>
              </div>
            </div>
          </div>

          {/* PRO (Recomendado) */}
          <div className="relative flex flex-col border border-[#f8fafc] ring-1 ring-[#f8fafc]/30 lg:scale-[1.03] rounded-xl bg-[#0a0a0a] p-6 shadow-md z-10">
            <div className="absolute -top-3 left-0 right-0 mx-auto w-fit bg-[#f8fafc] text-[#021708] font-mono text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full font-bold">Recomendado</div>
            <div className="flex flex-col items-center text-center mb-6 pt-4">
              <Monitor className="w-8 h-8 text-[#f8fafc] mb-4" />
              <h3 className="text-xl font-black uppercase tracking-wider mb-2">Pro</h3>
              <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para provedores em expansão que precisam de velocidade.</p>
            </div>
            <div className="text-center flex-grow flex flex-col">
              <Preco chave="pro" />
              <button onClick={() => handleAssinar('pro')} disabled={carregandoPlano !== null} className="w-full mb-6 font-mono font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center rounded-lg h-10 px-4 py-2 bg-[#f8fafc] text-[#021708] hover:bg-[#f8fafc]/90 transition-colors shadow-[0_0_15px_rgba(248,250,252,0.15)] cursor-pointer">
                {carregandoPlano === 'pro' ? <Loader2 className="w-4 h-4 animate-spin text-[#021708]" /> : 'Assinar Pro'}
              </button>
              <div className="text-left text-sm mt-auto">
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                <Linha>1.000 assinantes ativos</Linha>
                <Linha>10 usuários de vendas</Linha>
                <Linha>10 técnicos em campo</Linha>
                <Linha>10 vendedores em campo</Linha>
                <Linha>3 servidores MikroTik</Linha>
                <Linha>150 leads validados por mês + 60 leads extras</Linha>
                <p className="font-mono text-xs text-[#94a3b8] mb-8">✓ +R$ 1,50 por lead validado excedente</p>
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                <ul className="space-y-2.5">
                  <Destaque>Tudo do Essencial</Destaque>
                  <Destaque>Link de viabilidade personalizado com sua marca</Destaque>
                  <Destaque>Suporte por chamado e e-mail</Destaque>
                  <Destaque riscado>Setup assistido de automação</Destaque>
                </ul>
              </div>
            </div>
          </div>

          {/* SCALE */}
          <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#0a0a0a] p-6 transition-all hover:border-[#f8fafc]/30">
            <div className="flex flex-col items-center text-center mb-6 pt-2">
              <Rocket className="w-8 h-8 text-[#f8fafc] mb-4" />
              <h3 className="text-xl font-black uppercase tracking-wider mb-2">Scale</h3>
              <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para equipes comerciais estruturadas e focadas em conversão.</p>
            </div>
            <div className="text-center flex-grow flex flex-col">
              <Preco chave="scale" />
              <button onClick={() => handleAssinar('scale')} disabled={carregandoPlano !== null} className={btnSecundario}>
                {carregandoPlano === 'scale' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Começar Agora'}
              </button>
              <div className="text-left text-sm mt-auto">
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                <Linha>3.000 assinantes ativos</Linha>
                <Linha>25 usuários de vendas</Linha>
                <Linha>30 técnicos em campo</Linha>
                <Linha>25 vendedores em campo</Linha>
                <Linha>10 servidores MikroTik</Linha>
                <Linha>Até 500 leads validados por mês + 100 leads extras</Linha>
                <p className="font-mono text-xs text-[#94a3b8] mb-8">✓ +R$ 1,50 por lead validado excedente</p>
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                <ul className="space-y-2.5">
                  <Destaque>Tudo do Pro</Destaque>
                  <Destaque>Roleta de Leads automática</Destaque>
                  <Destaque>Analytics Avançado</Destaque>
                  <Destaque>Suporte VIP WhatsApp</Destaque>
                </ul>
              </div>
            </div>
          </div>

          {/* ENTERPRISE */}
          <div className="relative flex flex-col border border-[#1e3b29] rounded-xl bg-[#0a0a0a] p-6 transition-all hover:border-[#f8fafc]/30">
            <div className="flex flex-col items-center text-center mb-6 pt-2">
              <Building2 className="w-8 h-8 text-[#f8fafc] mb-4" />
              <h3 className="text-xl font-black uppercase tracking-wider mb-2">Enterprise</h3>
              <p className="text-[11px] font-mono text-[#94a3b8] min-h-[40px] uppercase tracking-wide">Para grandes operações.</p>
            </div>
            <div className="text-center flex-grow flex flex-col">
              <div className="text-2xl font-mono font-black mb-1 text-white pt-2 pb-2">PERSONALIZADO</div>
              <p className="text-[11px] font-mono text-[#94a3b8] mb-6 min-h-[20px]" />
              <a href={WHATSAPP_ENTERPRISE} target="_blank" rel="noreferrer" className={btnSecundario}>Falar com Vendas</a>
              <div className="text-left text-sm mt-auto">
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Visão Geral</h4>
                <Linha>A partir de 3.000 assinantes ativos</Linha>
                <Linha>Usuários de vendas personalizados</Linha>
                <Linha>Técnicos em campo personalizados</Linha>
                <Linha>Vendedores em campo personalizados</Linha>
                <Linha>Servidores MikroTik personalizados</Linha>
                <p className="font-mono text-xs text-[#94a3b8] mb-8">✓ Leads validados por mês personalizados</p>
                <h4 className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#f8fafc] mb-3">Destaques</h4>
                <ul className="space-y-2.5">
                  <Destaque>Setup VIP para sua operação</Destaque>
                  <Destaque>Gerente de sucesso dedicado</Destaque>
                  <Destaque>Treinamento da equipe</Destaque>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Incluso em todos os planos */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto bg-[#0a0a0a] border border-emerald-500/30 rounded-2xl p-8 md:p-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Incluso em todos os planos</h2>
          <p className="text-zinc-400 text-sm mb-8">Nenhuma função é cobrada à parte. Os planos mudam só nos limites e no atendimento.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-3">
            {INCLUSO.map((t) => (
              <div key={t} className="flex items-start gap-2 text-sm text-zinc-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white text-center mb-10 tracking-tight">Perguntas frequentes</h2>
          <div className="divide-y divide-[#1e3b29] border-y border-[#1e3b29]">
            {FAQ.map((f) => (
              <details key={f.p} className="group py-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-white font-semibold">
                  {f.p}
                  <ChevronDown className="w-5 h-5 text-emerald-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-zinc-400 leading-relaxed">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-28 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6 tracking-tight">Ainda com dúvida sobre o plano?</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={WHATSAPP_DEMO} target="_blank" rel="noreferrer" className="inline-flex px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-xl items-center justify-center gap-2">
            Agendar demonstração <ArrowRight className="w-5 h-5" />
          </a>
          <Link href="/funcionalidades" className="inline-flex px-8 py-4 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-semibold rounded-xl items-center justify-center">
            Ver funcionalidades
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}