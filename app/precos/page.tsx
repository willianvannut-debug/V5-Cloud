// app/precos/page.tsx — Redesign inspirado Notion Pricing
"use client";
import React, { useState } from 'react';
import { Layers, Monitor, Rocket, Building2, Check, X, Loader2, ArrowRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { WHATSAPP_DEMO, WHATSAPP_ENTERPRISE } from '@/components/site/links';
import { PLANOS_V5, ChavePlano, formatarReais } from '@/lib/planos-v5';

/* ============================================
   DADOS
   ============================================ */
const PLANOS_UI = [
  {
    chave: 'essencial' as ChavePlano,
    nome: 'Essencial',
    icon: Layers,
    desc: 'Para pequenos provedores dando o primeiro passo digital.',
    destaque: false,
    cta: 'Começar grátis',
    limites: ['300 assinantes ativos', '1 usuário de vendas', '2 técnicos', '1 servidor MikroTik', '70 leads/mês'],
    destaques: ['Link simples de viabilidade', 'CRM Básico (Kanban)', 'App cliente e técnico', 'Suporte por chamado'],
  },
  {
    chave: 'pro' as ChavePlano,
    nome: 'Pro',
    icon: Monitor,
    desc: 'Para provedores em expansão que precisam de velocidade.',
    destaque: true,
    cta: 'Assinar Pro',
    limites: ['1.000 assinantes ativos', '10 usuários de vendas', '10 técnicos', '3 servidores MikroTik', '150 leads/mês'],
    destaques: ['Tudo do Essencial', 'Viabilidade com sua marca', 'Suporte por chamado e e-mail'],
  },
  {
    chave: 'scale' as ChavePlano,
    nome: 'Scale',
    icon: Rocket,
    desc: 'Para equipes comerciais estruturadas e focadas em conversão.',
    destaque: false,
    cta: 'Começar agora',
    limites: ['3.000 assinantes ativos', '25 usuários de vendas', '30 técnicos', '10 servidores MikroTik', '500 leads/mês'],
    destaques: ['Tudo do Pro', 'Roleta de Leads', 'Analytics Avançado', 'Suporte VIP WhatsApp'],
  },
  {
    chave: 'enterprise' as ChavePlano,
    nome: 'Enterprise',
    icon: Building2,
    desc: 'Para grandes operações com necessidades personalizadas.',
    destaque: false,
    cta: 'Falar com vendas',
    limites: ['Assinantes ilimitados', 'Usuários personalizados', 'Técnicos personalizados', 'MikroTik personalizados', 'Leads personalizados'],
    destaques: ['Setup VIP', 'Gerente de sucesso dedicado', 'Treinamento da equipe'],
    enterprise: true,
  },
] as const;

const INCLUSO = [
  'Clientes e Contratos',
  'Cobrança automática (boleto + PIX)',
  'Integração MikroTik',
  'Monitor Online',
  'Suporte com protocolo',
  'Ordens de Serviço',
  'CTOs ilimitadas',
  'Viabilidade + CRM',
  'App do Assinante',
  'App do Técnico',
];

/* Tabela comparativa */
type Cel = boolean | string;
interface LinhaTabela { recurso: string; essencial: Cel; pro: Cel; scale: Cel; enterprise: Cel }
interface GrupoTabela { grupo: string; linhas: LinhaTabela[] }

const COMPARATIVO: GrupoTabela[] = [
  {
    grupo: 'Limites',
    linhas: [
      { recurso: 'Assinantes ativos', essencial: '300', pro: '1.000', scale: '3.000', enterprise: 'Personalizado' },
      { recurso: 'Usuários de vendas', essencial: '1', pro: '10', scale: '25', enterprise: 'Personalizado' },
      { recurso: 'Técnicos em campo', essencial: '2', pro: '10', scale: '30', enterprise: 'Personalizado' },
      { recurso: 'Vendedores em campo', essencial: '2', pro: '10', scale: '25', enterprise: 'Personalizado' },
      { recurso: 'Servidores MikroTik', essencial: '1', pro: '3', scale: '10', enterprise: 'Personalizado' },
      { recurso: 'Leads validados/mês', essencial: '70 + 30', pro: '150 + 60', scale: '500 + 100', enterprise: 'Personalizado' },
    ],
  },
  {
    grupo: 'Comercial',
    linhas: [
      { recurso: 'Link de viabilidade', essencial: 'Simples', pro: 'Com sua marca', scale: 'Com sua marca', enterprise: 'Com sua marca' },
      { recurso: 'CRM Kanban', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Roleta de Leads', essencial: false, pro: false, scale: true, enterprise: true },
      { recurso: 'Analytics Avançado', essencial: false, pro: false, scale: true, enterprise: true },
    ],
  },
  {
    grupo: 'Financeiro',
    linhas: [
      { recurso: 'Cobrança por boleto', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Cobrança por PIX', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Régua de cobrança', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Fluxo de caixa', essencial: true, pro: true, scale: true, enterprise: true },
    ],
  },
  {
    grupo: 'Infraestrutura',
    linhas: [
      { recurso: 'Bloqueio/liberação MikroTik', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Monitor online', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Backup MikroTik', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'CTOs e Rede (KMZ)', essencial: true, pro: true, scale: true, enterprise: true },
    ],
  },
  {
    grupo: 'Apps',
    linhas: [
      { recurso: 'App do Assinante', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'App do Técnico', essencial: true, pro: true, scale: true, enterprise: true },
    ],
  },
  {
    grupo: 'Suporte',
    linhas: [
      { recurso: 'Chamados com protocolo', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Suporte por e-mail', essencial: true, pro: true, scale: true, enterprise: true },
      { recurso: 'Suporte VIP WhatsApp', essencial: false, pro: false, scale: true, enterprise: true },
      { recurso: 'Gerente de sucesso dedicado', essencial: false, pro: false, scale: false, enterprise: true },
      { recurso: 'Setup assistido', essencial: false, pro: false, scale: false, enterprise: true },
      { recurso: 'Treinamento da equipe', essencial: false, pro: false, scale: false, enterprise: true },
    ],
  },
];

const FAQ = [
  { p: 'Vocês migram minha base de outro sistema?', r: 'Sim. Você importa seus clientes por planilha, e nossa equipe ajuda você na migração.' },
  { p: 'Preciso trocar meu MikroTik?', r: 'Não. O V5 Cloud se conecta ao MikroTik que você já usa para ver quem está online, bloquear e liberar clientes.' },
  { p: 'Tem fidelidade ou multa de cancelamento?', r: 'Não. A assinatura é mensal ou anual, e você pode cancelar quando quiser.' },
  { p: 'O que conta como assinante ativo?', r: 'Cada cliente com contrato ativo no sistema. Clientes cancelados não contam para o limite do plano.' },
  { p: 'Os apps têm custo extra?', r: 'Não. Os apps do Assinante e do Técnico estão inclusos em todos os planos, sem cobrança adicional.' },
  { p: 'Meus dados ficam seguros?', r: 'Os dados ficam na nuvem, separados por empresa, e o sistema segue a LGPD e o Marco Civil da Internet.' },
  { p: 'Posso trocar de plano depois?', r: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento, e o valor é ajustado proporcionalmente.' },
  { p: 'Existe período de teste?', r: 'Sim. Você pode testar por 7 dias grátis sem precisar de cartão de crédito.' },
];

/* ============================================
   COMPONENTE PRINCIPAL
   ============================================ */
export default function PrecosPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [carregandoPlano, setCarregandoPlano] = useState<string | null>(null);

  const getPreco = (chave: ChavePlano) => {
    const centavos = isAnnual ? PLANOS_V5[chave].anual : PLANOS_V5[chave].mensal;
    return centavos;
  };

  const handleAssinar = async (chavePlano: ChavePlano) => {
    const intervalo = isAnnual ? 'year' : 'month';
    const nomePlano = PLANOS_V5[chavePlano].nome;
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
          } catch (e) { console.error('Erro ao atualizar plano nos dados pendentes', e); }
        }
        const localData = localStorage.getItem('v5_empresa_criada') || localStorage.getItem('v5_operador');
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            empresaId = parsed.empresaId || parsed.id || parsed.empresa_id || '';
            if (!emailEmpresa) emailEmpresa = parsed.email || '';
          } catch (e) { console.error('Erro ao ler dados locais', e); }
        }
      }
      const rotaSucessoRetorno = empresaId ? `${window.location.origin}/dashboard?mudanca_plano=${chavePlano}` : undefined;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chavePlano, nomePlano, precoCentavos, intervalo, empresaId, email: emailEmpresa, successUrl: rotaSucessoRetorno }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert(data.error || 'Erro ao gerar sessão de pagamento.'); setCarregandoPlano(null); }
    } catch (err) { console.error(err); alert('Erro de conexão ao processar pagamento.'); setCarregandoPlano(null); }
  };

  return (
    <div className="min-h-screen bg-[#021708] text-zinc-50 relative overflow-x-hidden" style={{ fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}>
      <SiteNav />

      {/* ====== HERO ====== */}
      <section className="relative z-20 pt-36 pb-8 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight">
          Um plano para cada<br />tamanho de provedor.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Todas as funções em todos os planos. Você só escolhe o limite de assinantes.
        </p>
      </section>

      {/* ====== TOGGLE MENSAL / ANUAL ====== */}
      <div className="relative z-20 flex items-center justify-center gap-3 pt-6 pb-14">
        <span className={`text-sm font-semibold transition-colors ${!isAnnual ? 'text-white' : 'text-zinc-500'}`}>Mensal</span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className={`relative w-12 h-7 rounded-full transition-colors ${isAnnual ? 'bg-emerald-500' : 'bg-zinc-700'}`}
        >
          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${isAnnual ? 'left-6' : 'left-1'}`} />
        </button>
        <span className={`text-sm font-semibold transition-colors ${isAnnual ? 'text-white' : 'text-zinc-500'}`}>Anual</span>
        {isAnnual && <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">-20%</span>}
      </div>

      {/* ====== CARDS DOS PLANOS ====== */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANOS_UI.map((plano) => {
            const isEnterprise = 'enterprise' in plano && plano.enterprise;
            return (
              <div
                key={plano.chave}
                className={`relative flex flex-col rounded-2xl p-6 transition-all ${
                  plano.destaque
                    ? 'bg-[#0d1110] border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.08)]'
                    : 'bg-[#0a0a0a] border border-[#1e3b29] hover:border-zinc-600'
                }`}
              >
                {plano.destaque && (
                  <div className="absolute -top-3.5 left-6 bg-emerald-500 text-black text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Recomendado
                  </div>
                )}

                {/* Cabeçalho */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{plano.nome}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed min-h-[40px]">{plano.desc}</p>
                </div>

                {/* Preço */}
                <div className="mb-6">
                  {isEnterprise ? (
                    <div className="text-3xl font-black text-white">Personalizado</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white">R$ {formatarReais(getPreco(plano.chave))}</span>
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">
                        / {isAnnual ? 'ano' : 'mês'}
                        {isAnnual && <span className="text-zinc-600 ml-1">· R$ {formatarReais(Math.round(getPreco(plano.chave) / 12))}/mês</span>}
                      </p>
                    </>
                  )}
                </div>

                {/* Botão */}
                {isEnterprise ? (
                  <a
                    href={WHATSAPP_ENTERPRISE}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full mb-6 inline-flex items-center justify-center rounded-xl h-11 text-sm font-semibold border border-[#1e3b29] text-white hover:bg-white/5 transition-colors"
                  >
                    {plano.cta}
                  </a>
                ) : (
                  <button
                    onClick={() => handleAssinar(plano.chave)}
                    disabled={carregandoPlano !== null}
                    className={`w-full mb-6 inline-flex items-center justify-center rounded-xl h-11 text-sm font-semibold transition-colors ${
                      plano.destaque
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                        : 'border border-[#1e3b29] text-white hover:bg-white/5'
                    }`}
                  >
                    {carregandoPlano === plano.chave ? <Loader2 className="w-4 h-4 animate-spin" /> : plano.cta}
                  </button>
                )}

                {/* Lista de limites */}
                <div className="space-y-2.5 mt-auto">
                  {plano.limites.map((l) => (
                    <div key={l} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ====== INCLUSO EM TODOS ====== */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">Incluso em todos os planos.</h2>
          <p className="text-zinc-400 text-lg mb-12">Nenhuma função é cobrada à parte.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {INCLUSO.map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-zinc-300 bg-[#0a0a0a] border border-[#1e3b29] rounded-xl px-4 py-3">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TABELA COMPARATIVA (estilo Notion) ====== */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight text-center mb-4">Planos e recursos</h2>
          <p className="text-zinc-400 text-lg text-center mb-12">Compare tudo lado a lado.</p>

          <div className="overflow-x-auto rounded-2xl border border-[#1e3b29]">
            <table className="w-full min-w-[700px] text-sm">
              {/* Cabeçalho com planos */}
              <thead>
                <tr className="bg-[#0d1110]">
                  <th className="text-left p-4 font-semibold text-zinc-400 w-[220px]">Recurso</th>
                  {PLANOS_UI.map((p) => (
                    <th key={p.chave} className="p-4 text-center">
                      <span className={`text-sm font-bold ${p.destaque ? 'text-emerald-400' : 'text-white'}`}>{p.nome}</span>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {'enterprise' in p && p.enterprise
                          ? 'Personalizado'
                          : `R$ ${formatarReais(getPreco(p.chave))}/${isAnnual ? 'ano' : 'mês'}`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARATIVO.map((grupo) => (
                  <React.Fragment key={grupo.grupo}>
                    {/* Separador de grupo */}
                    <tr>
                      <td colSpan={5} className="bg-[#0a0a0a] px-4 py-3 text-xs font-bold uppercase tracking-widest text-emerald-400 border-t border-[#1e3b29]">
                        {grupo.grupo}
                      </td>
                    </tr>
                    {grupo.linhas.map((linha) => (
                      <tr key={linha.recurso} className="border-t border-[#1e3b29]/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-zinc-300 font-medium">{linha.recurso}</td>
                        {(['essencial', 'pro', 'scale', 'enterprise'] as const).map((col) => {
                          const val = linha[col];
                          return (
                            <td key={col} className="px-4 py-3 text-center">
                              {val === true ? (
                                <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                              ) : val === false ? (
                                <X className="w-4 h-4 text-zinc-700 mx-auto" />
                              ) : (
                                <span className="text-zinc-300 text-sm">{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ====== FAQ (estilo Notion) ====== */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-white text-center mb-12 tracking-tight">Perguntas e respostas</h2>
          <div className="divide-y divide-[#1e3b29]">
            {FAQ.map((f) => (
              <details key={f.p} className="group">
                <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none text-white font-semibold text-base hover:text-emerald-400 transition-colors">
                  {f.p}
                  <ChevronDown className="w-5 h-5 text-zinc-600 shrink-0 transition-transform group-open:rotate-180 group-open:text-emerald-400" />
                </summary>
                <p className="pb-5 text-zinc-400 leading-relaxed">{f.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA FINAL ====== */}
      <section className="relative z-20 px-4 sm:px-6 lg:px-8 pb-28 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            Pronto para simplificar?
          </h2>
          <p className="text-zinc-400 mb-10 text-lg">Teste 7 dias grátis. Sem cartão.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro" className="inline-flex px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-xl items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              Criar conta grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <a href={WHATSAPP_DEMO} target="_blank" rel="noreferrer" className="inline-flex px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold rounded-xl items-center justify-center transition-colors">
              Agendar demonstração
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
