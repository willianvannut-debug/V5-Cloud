// app/dashboard/faturas/page.tsx
// Faturas da ASSINATURA do V5 Cloud (o que o provedor paga para a V5),
// NÃO as faturas dos assinantes do provedor.

"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Calendar,
  Loader2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { obterLimitesDaEmpresa } from '@/lib/planLimites';

type StatusFatura = 'pendente' | 'paga' | 'vencida' | 'cancelada';

export interface FaturaAssinatura {
  id: string;
  numero: string;
  plano: string;
  competencia: string;      // '2026-11-01'
  valor: number | string;
  vencimento: string;       // '2026-11-10'
  status: StatusFatura;
  forma_pagamento: string | null;
  pago_em: string | null;
  valor_pago: number | string | null;
  link_pagamento: string | null;
  comprovante_url: string | null;
}

// ---------- formatação (sem new Date('AAAA-MM-DD'), que volta 1 dia no fuso de Brasília)
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatarCompetencia(d: string) {
  const [ano, mes] = d.slice(0, 10).split('-');
  return `${MESES[Number(mes) - 1]}/${ano}`;
}
function formatarData(d: string | null) {
  if (!d) return '—';
  if (d.length > 10) {
    return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
  const [ano, mes, dia] = d.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
function formatarValor(v: number | string | null) {
  const n = Number(v ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatarForma(f: string | null) {
  if (!f) return '—';
  const mapa: Record<string, string> = { pix: 'PIX', boleto: 'Boleto', boleto_pix: 'Boleto / PIX', cartao: 'Cartão' };
  return mapa[f.toLowerCase()] || f;
}

const STATUS_UI: Record<StatusFatura, { label: string; cls: string; Icon: React.ElementType }> = {
  paga:      { label: 'Paga',      cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', Icon: CheckCircle2 },
  pendente:  { label: 'Em aberto', cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400',       Icon: Clock },
  vencida:   { label: 'Vencida',   cls: 'bg-red-500/10 border-red-500/30 text-red-400',             Icon: AlertTriangle },
  cancelada: { label: 'Cancelada', cls: 'bg-zinc-800/60 border-zinc-700 text-zinc-400',             Icon: XCircle },
};

export default function FaturasPage() {
  const { operador, empresa } = useAuth();

  const [planoAtual, setPlanoAtual] = useState<string>('essencial');
  const [faturas, setFaturas] = useState<FaturaAssinatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const idDaEmpresa = operador?.empresaId || operador?.empresa_id || empresa?.id;
  const nomeEmpresa = empresa?.nomeEmpresa || operador?.empresa?.nome_empresa || 'Minha Empresa';

  useEffect(() => {
    const planoDoContexto = empresa?.plano || operador?.empresa?.plano;
    if (planoDoContexto) setPlanoAtual(String(planoDoContexto).toLowerCase().trim());

    if (!idDaEmpresa) {
      setCarregando(false);
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        setCarregando(true);
        setErro(null);
        const res = await fetch('/api/assinatura/faturas', {
          headers: { 'x-empresa-id': String(idDaEmpresa) },
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao buscar faturas');
        if (!cancelado) setFaturas(json.data || []);
      } catch (err: any) {
        console.error('Erro ao buscar faturas da assinatura:', err);
        if (!cancelado) {
          setErro(err.message);
          setFaturas([]);
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [operador, empresa, idDaEmpresa]);

  const configPlano = obterLimitesDaEmpresa(planoAtual);

  // ---------- situação da conta, calculada a partir das faturas reais
  const resumo = useMemo(() => {
    const vencidas = faturas.filter(f => f.status === 'vencida');
    const abertas = faturas
      .filter(f => f.status === 'pendente')
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const anoAtual = String(new Date().getFullYear());
    const totalPagoAno = faturas
      .filter(f => f.status === 'paga' && f.competencia.startsWith(anoAtual))
      .reduce((s, f) => s + Number(f.valor_pago ?? f.valor), 0);
    return { vencidas, proxima: abertas[0] || null, totalPagoAno, anoAtual };
  }, [faturas]);

  const emAtraso = resumo.vencidas.length > 0;

  // ---------- comprovante (abre uma página pronta para imprimir / salvar em PDF)
  const handleComprovante = (fat: FaturaAssinatura) => {
    if (fat.comprovante_url) {
      window.open(fat.comprovante_url, '_blank', 'noopener');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Comprovante ${fat.numero}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px;margin:40px auto;padding:0 24px}
  h1{font-size:20px;margin:0 0 4px}.sub{color:#666;font-size:13px;margin-bottom:28px}
  .ok{display:inline-block;background:#e7f8ef;color:#0a7a45;font-weight:bold;padding:6px 12px;border-radius:6px;font-size:13px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  td{padding:10px 0;border-bottom:1px solid #e5e5e5}td:first-child{color:#666;width:45%}
  .total td{font-size:18px;font-weight:bold;border-bottom:0;padding-top:18px}
  .rod{margin-top:36px;color:#888;font-size:12px}
  @media print{button{display:none}}
  button{margin-top:28px;padding:10px 18px;border:0;border-radius:6px;background:#09A25E;color:#fff;font-weight:bold;cursor:pointer}
</style></head><body>
<h1>Comprovante de pagamento</h1>
<div class="sub">V5 Cloud · Assinatura do sistema de gestão</div>
<div class="ok">PAGAMENTO CONFIRMADO</div>
<table>
  <tr><td>Fatura</td><td>${fat.numero}</td></tr>
  <tr><td>Cliente</td><td>${nomeEmpresa}</td></tr>
  <tr><td>Plano</td><td>${fat.plano}</td></tr>
  <tr><td>Mês de referência</td><td>${formatarCompetencia(fat.competencia)}</td></tr>
  <tr><td>Vencimento</td><td>${formatarData(fat.vencimento)}</td></tr>
  <tr><td>Pago em</td><td>${formatarData(fat.pago_em)}</td></tr>
  <tr><td>Forma de pagamento</td><td>${formatarForma(fat.forma_pagamento)}</td></tr>
  <tr class="total"><td>Valor pago</td><td>${formatarValor(fat.valor_pago ?? fat.valor)}</td></tr>
</table>
<div class="rod">Documento gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</div>
<button onclick="window.print()">Imprimir / Salvar em PDF</button>
</body></html>`);
    w.document.close();
  };

  return (
    <div className="p-8 space-y-6 bg-[#0a0a0a] min-h-screen text-zinc-50 font-sans relative">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" /> Faturas & Histórico de Pagamentos
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">Mensalidades da sua assinatura do V5 Cloud e comprovantes de pagamento.</p>
        </div>

        {!carregando && (
          emAtraso ? (
            <span className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-bold uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Pagamento em atraso
            </span>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Assinatura ativa
            </span>
          )
        )}
      </div>

      {/* RESUMO DA ASSINATURA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Plano atual</span>
            <div className="text-2xl font-black font-mono text-white uppercase">{configPlano.nome}</div>
            <p className="text-xs text-zinc-400 font-mono">Recorrência mensal com franquia de {configPlano.max_leads} leads.</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Situação da conta</span>
            {emAtraso ? (
              <>
                <div className="text-2xl font-black font-mono text-red-400">Em atraso</div>
                <p className="text-xs text-zinc-400 font-mono">
                  {resumo.vencidas.length} fatura{resumo.vencidas.length > 1 ? 's' : ''} vencida{resumo.vencidas.length > 1 ? 's' : ''}. Regularize para evitar o bloqueio do sistema.
                </p>
              </>
            ) : resumo.proxima ? (
              <>
                <div className="text-2xl font-black font-mono text-amber-400">Fatura em aberto</div>
                <p className="text-xs text-zinc-400 font-mono">
                  {formatarCompetencia(resumo.proxima.competencia)} · vence em {formatarData(resumo.proxima.vencimento)}.
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-black font-mono text-emerald-400">Em dia</div>
                <p className="text-xs text-zinc-400 font-mono">Nenhuma pendência financeira em aberto.</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
          <CardContent className="p-6 space-y-2">
            {resumo.proxima ? (
              <>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Próxima fatura</span>
                <div className="text-2xl font-black font-mono text-white">{formatarValor(resumo.proxima.valor)}</div>
                <p className="text-xs text-zinc-400 font-mono">Vencimento em {formatarData(resumo.proxima.vencimento)}.</p>
              </>
            ) : (
              <>
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">Total pago em {resumo.anoAtual}</span>
                <div className="text-2xl font-black font-mono text-white">{formatarValor(resumo.totalPagoAno)}</div>
                <p className="text-xs text-zinc-500 font-mono">Soma das mensalidades pagas no ano.</p>
              </>
            )}
          </CardContent>
        </Card>

      </div>

      {/* HISTÓRICO */}
      <Card className="border border-zinc-900 bg-zinc-900/40 backdrop-blur">
        <CardHeader className="border-b border-zinc-900/85 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase font-mono tracking-wide text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Histórico de mensalidades
          </CardTitle>
          <span className="text-[11px] font-mono text-zinc-500">Comprovantes guardados por 5 anos</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-black/20">
                  <th className="p-4 whitespace-nowrap">Fatura</th>
                  <th className="p-4 whitespace-nowrap">Referência</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4 whitespace-nowrap">Pago em</th>
                  <th className="p-4">Forma</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 text-xs font-mono">
                {carregando ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-emerald-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Carregando faturas...
                    </td>
                  </tr>
                ) : erro ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-red-400">
                      Não foi possível carregar as faturas: {erro}
                    </td>
                  </tr>
                ) : faturas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-zinc-500">
                      Nenhuma mensalidade registrada ainda. Assim que a primeira fatura da sua assinatura for emitida, ela aparece aqui.
                    </td>
                  </tr>
                ) : (
                  faturas.map((fat) => {
                    const ui = STATUS_UI[fat.status] || STATUS_UI.pendente;
                    const podePagar = (fat.status === 'pendente' || fat.status === 'vencida') && fat.link_pagamento;
                    return (
                      <tr key={fat.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4 font-bold text-white whitespace-nowrap">{fat.numero}</td>
                        <td className="p-4 text-zinc-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-zinc-600" /> {formatarCompetencia(fat.competencia)}
                          </span>
                        </td>
                        <td className="p-4 uppercase text-emerald-400 font-bold">{fat.plano}</td>
                        <td className="p-4 text-white font-bold whitespace-nowrap">{formatarValor(fat.valor)}</td>
                        <td className="p-4 text-zinc-400 whitespace-nowrap">{formatarData(fat.vencimento)}</td>
                        <td className="p-4 text-zinc-400 whitespace-nowrap">{formatarData(fat.pago_em)}</td>
                        <td className="p-4 text-zinc-400">{formatarForma(fat.forma_pagamento)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold whitespace-nowrap ${ui.cls}`}>
                            <ui.Icon className="w-3 h-3" /> {ui.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {fat.status === 'paga' ? (
                            <button
                              onClick={() => handleComprovante(fat)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer whitespace-nowrap"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-400" /> Comprovante
                            </button>
                          ) : podePagar ? (
                            <a
                              href={fat.link_pagamento!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold uppercase transition-all whitespace-nowrap"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Pagar agora
                            </a>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}