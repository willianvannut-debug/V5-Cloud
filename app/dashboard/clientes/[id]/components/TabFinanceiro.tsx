// ================================================================================
// TAB FINANCEIRO - Faturas REAIS com integracao Wide Pay
// Gera boleto e PIX de verdade via backend financeiro (porta 4000)
// ================================================================================

"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Receipt,
  Plus,
  RefreshCw,
  DollarSign,
  CreditCard,
  CheckCircle,
  Eye,
  X,
  Ban,
  MessageCircle,
  AlertTriangle,
  Zap,
  Copy,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { estiloInput, estiloLabel, estiloSelect, estiloRotulo, estiloValor } from '../shared';

// ============================================================
// API Helper — chama o backend financeiro na porta 4000
// ============================================================

const FINANCIAL_API = '/api/financial';

async function financialApi(method: string, path: string, body?: any) {
  const res = await fetch(`${FINANCIAL_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
}

// ============================================================
// Tipos
// ============================================================

interface TabFinanceiroProps {
  clienteId: string;
  empresa: any;
  cliente: any;
  editando: boolean;
  formEdit: any;
  setFormEdit: (fn: (prev: any) => any) => void;
  planoAtual: any;
}

// Mapeamento de metodo frontend → billingType backend
const BILLING_TYPE_MAP: Record<string, string> = {
  boleto: 'BOLETO',
  pix: 'PIX',
  boleto_pix: 'BOLETO_PIX',
  debito_automatico: 'BOLETO', // fallback
};

// Mapeamento inverso de status backend → labels PT-BR
const STATUS_MAP: Record<string, { label: string; key: string }> = {
  PENDING: { label: 'PENDENTE', key: 'pendente' },
  CONFIRMED: { label: 'PAGO', key: 'pago' },
  RECEIVED: { label: 'PAGO', key: 'pago' },
  RECEIVED_MANUALLY: { label: 'PAGO MANUAL', key: 'pago' },
  OVERDUE: { label: 'VENCIDO', key: 'vencido' },
  CANCELLED: { label: 'CANCELADO', key: 'cancelado' },
  REFUNDED: { label: 'ESTORNADO', key: 'cancelado' },
  AWAITING_ANALYSIS: { label: 'EM ANALISE', key: 'pendente' },
};

function getStatusInfo(status: string) {
  return STATUS_MAP[status] || { label: status, key: 'pendente' };
}

// ============================================================
// Helper para ler campos da fatura (backend pode retornar
// snake_case ou camelCase dependendo do endpoint)
// ============================================================
function getFaturaField(f: any, ...keys: string[]): any {
  for (const k of keys) {
    if (f[k] !== undefined && f[k] !== null && f[k] !== '') return f[k];
  }
  return null;
}

// ============================================================
// Componente
// ============================================================

export default function TabFinanceiro({ clienteId, empresa, cliente, editando, formEdit, setFormEdit, planoAtual }: TabFinanceiroProps) {
  const [faturas, setFaturas] = useState<any[]>([]);
  const [carregandoFaturas, setCarregandoFaturas] = useState(true);
  const [modalFatura, setModalFatura] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState<any>(null);
  const [salvandoFatura, setSalvandoFatura] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [formFatura, setFormFatura] = useState({
    valor: '', data_vencimento: '', mes: '', metodo: 'boleto', observacoes: '',
  });

  // Modal de resultado apos gerar fatura (mostra PIX QR code, link boleto, etc)
  const [modalResultado, setModalResultado] = useState<any>(null);

  // Carnê
  const [modalCarne, setModalCarne] = useState(false);
  const [gerandoCarne, setGerandoCarne] = useState(false);
  const [resultadoCarne, setResultadoCarne] = useState<any>(null);
  const [formCarne, setFormCarne] = useState({
    valor: '', meses: '12', metodo: 'boleto', descricao: '', mesInicio: '',
  });

  // ==========================
  // HELPERS
  // ==========================
  const parseValor = (v: any): number => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    return parseFloat(String(v).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
  };

  const formatarValor = (v: number): string => {
    return `R$ ${v.toFixed(2).replace('.', ',')}`;
  };

  const mostrarSucesso = (msg: string) => {
    setSucessoMsg(msg);
    setTimeout(() => setSucessoMsg(''), 4000);
  };

  const mostrarErro = (msg: string) => {
    setErroMsg(msg);
    setTimeout(() => setErroMsg(''), 6000);
  };

  const formatarData = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // ==========================
  // VERIFICAR BACKEND ONLINE
  // ==========================
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setBackendOnline(data.status === 'ok');
      } catch {
        setBackendOnline(false);
      }
    }
    checkBackend();
  }, []);

  // ==========================
  // CARREGAR FATURAS DO BACKEND
  // ==========================
  const carregarFaturas = useCallback(async () => {
    if (!clienteId) return;
    setCarregandoFaturas(true);
    try {
      const result = await financialApi('GET', `/invoices?customerId=${clienteId}&limit=100`);
      setFaturas(result.data || []);
    } catch (e: any) {
      console.error('Erro ao carregar faturas:', e);
      // Se o backend estiver offline, mostrar lista vazia sem erro
      if (backendOnline === false) {
        setFaturas([]);
      } else {
        mostrarErro('Erro ao carregar faturas: ' + e.message);
      }
    } finally {
      setCarregandoFaturas(false);
    }
  }, [clienteId, backendOnline]);

  useEffect(() => {
    if (backendOnline !== null) {
      carregarFaturas();
    }
  }, [carregarFaturas, backendOnline]);

  // ==========================
  // CRIAR FATURA (via backend → Wide Pay)
  // ==========================
  const criarFatura = async () => {
    if (!empresa || !clienteId) return;
    if (!formFatura.valor || !formFatura.data_vencimento || !formFatura.mes) {
      mostrarErro('Preencha todos os campos obrigatorios');
      return;
    }

    const valorNum = parseValor(formFatura.valor);
    if (valorNum <= 0) {
      mostrarErro('Valor deve ser maior que zero');
      return;
    }

    setSalvandoFatura(true);
    try {
      const billingType = BILLING_TYPE_MAP[formFatura.metodo] || 'BOLETO';

      const invoice = await financialApi('POST', '/invoices', {
        customerId: clienteId,
        customerName: cliente.nome || cliente.razao_social || '',
        customerDocument: cliente.cpf || cliente.cnpj || '',
        customerEmail: cliente.email || '',
        customerPhone: cliente.telefone || cliente.whatsapp || '',
        billingType,
        amount: valorNum,
        dueDate: formFatura.data_vencimento,
        description: `Mensalidade - ${formFatura.mes}${formFatura.observacoes ? ' | ' + formFatura.observacoes : ''}`,
      });

      await carregarFaturas();
      setModalFatura(false);
      setFormFatura({ valor: '', data_vencimento: '', mes: '', metodo: 'boleto', observacoes: '' });

      // Se tiver dados de pagamento (PIX QR, boleto URL), mostrar modal de resultado
      const hasPix = getFaturaField(invoice, 'pix_qr_code', 'pix_qrcode', 'pixQrcode');
      const hasPixCopy = getFaturaField(invoice, 'pix_copy_paste', 'pixCopyPaste');
      const hasBoleto = getFaturaField(invoice, 'boleto_url', 'bank_slip_url', 'bankSlipUrl');
      const hasInvoiceUrl = getFaturaField(invoice, 'invoice_url', 'invoiceUrl');

      if (hasPix || hasPixCopy || hasBoleto || hasInvoiceUrl) {
        setModalResultado(invoice);
      }

      mostrarSucesso(`Fatura gerada com sucesso via ${billingType}!`);
    } catch (e: any) {
      console.error('Erro ao criar fatura:', e);
      if (e.message?.includes('Gateway') || e.message?.includes('gateway')) {
        mostrarErro('Configure sua carteira Wide Pay primeiro! Acesse Financeiro → Gateway de Pagamento.');
      } else {
        mostrarErro('Erro ao criar fatura: ' + (e.message || 'Erro desconhecido'));
      }
    } finally {
      setSalvandoFatura(false);
    }
  };

  // ==========================
  // GERAR FATURA MENSAL AUTOMATICA
  // ==========================
  const gerarFaturaMensal = async () => {
    if (!empresa || !clienteId || !planoAtual) {
      mostrarErro('Cliente precisa ter um plano ativo para gerar fatura mensal');
      return;
    }

    const agora = new Date();
    const meses = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const mesRef = `${meses[agora.getMonth()]}/${agora.getFullYear()}`;

    // Verificar se ja existe fatura para este mes (pela descricao)
    const jaExiste = faturas.some((f: any) => {
      const desc = f.description || '';
      return desc.includes(mesRef) && f.status !== 'CANCELLED';
    });
    if (jaExiste) {
      mostrarErro(`Ja existe uma fatura para ${mesRef}`);
      return;
    }

    const dia = cliente.dia_vencimento || 10;
    let mesVenc = agora.getMonth();
    let anoVenc = agora.getFullYear();
    if (agora.getDate() > dia) {
      mesVenc += 1;
      if (mesVenc > 11) { mesVenc = 0; anoVenc += 1; }
    }
    const dataVenc = `${anoVenc}-${String(mesVenc + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const valorPlano = parseValor(planoAtual.preco);
    const billingType = BILLING_TYPE_MAP[cliente.forma_pagamento || 'boleto'] || 'BOLETO';

    setSalvandoFatura(true);
    try {
      const invoice = await financialApi('POST', '/invoices', {
        customerId: clienteId,
        customerName: cliente.nome || cliente.razao_social || '',
        customerDocument: cliente.cpf || cliente.cnpj || '',
        customerEmail: cliente.email || '',
        customerPhone: cliente.telefone || cliente.whatsapp || '',
        billingType,
        amount: valorPlano,
        dueDate: dataVenc,
        description: `Mensalidade - ${mesRef}`,
      });

      await carregarFaturas();

      // Mostrar resultado se tiver dados de pagamento
      const hasPix = getFaturaField(invoice, 'pix_qr_code', 'pix_qrcode', 'pixQrcode');
      const hasPixCopy = getFaturaField(invoice, 'pix_copy_paste', 'pixCopyPaste');
      const hasBoleto = getFaturaField(invoice, 'boleto_url', 'bank_slip_url', 'bankSlipUrl');
      const hasInvoiceUrl = getFaturaField(invoice, 'invoice_url', 'invoiceUrl');

      if (hasPix || hasPixCopy || hasBoleto || hasInvoiceUrl) {
        setModalResultado(invoice);
      }

      mostrarSucesso(`Fatura de ${mesRef} gerada: ${formatarValor(valorPlano)} via ${billingType}`);
    } catch (e: any) {
      if (e.message?.includes('Gateway') || e.message?.includes('gateway')) {
        mostrarErro('Configure sua carteira Wide Pay primeiro! Acesse Financeiro → Gateway de Pagamento.');
      } else {
        mostrarErro('Erro ao gerar fatura: ' + (e.message || ''));
      }
    } finally {
      setSalvandoFatura(false);
    }
  };

  // ==========================
  // CANCELAR FATURA (via backend → Wide Pay)
  // Backend espera POST /:id/cancel
  // ==========================
  const cancelarFatura = async (faturaId: string) => {
    try {
      await financialApi('POST', `/invoices/${faturaId}/cancel`, { reason: 'Cancelado pelo operador' });
      await carregarFaturas();
      mostrarSucesso('Fatura cancelada na Wide Pay');
    } catch (e: any) {
      mostrarErro('Erro ao cancelar: ' + (e.message || 'Erro desconhecido'));
    }
  };

  // ==========================
  // COPIAR PIX COPIA E COLA
  // ==========================
  const copiarPix = (fatura: any) => {
    const pixCode = getFaturaField(fatura, 'pix_copy_paste', 'pixCopyPaste');
    if (!pixCode) {
      mostrarErro('Codigo PIX nao disponivel para esta fatura');
      return;
    }
    navigator.clipboard.writeText(pixCode).then(() => {
      mostrarSucesso('Codigo PIX copiado!');
    }).catch(() => {
      mostrarErro('Nao foi possivel copiar');
    });
  };

  // ==========================
  // ENVIAR WHATSAPP
  // ==========================
  const enviarWhatsApp = (fatura: any) => {
    const tel = (cliente.whatsapp || cliente.telefone || '').replace(/\D/g, '');
    if (!tel) {
      mostrarErro('Cliente nao possui WhatsApp cadastrado');
      return;
    }
    const valor = formatarValor(parseFloat(fatura.amount || 0));
    const venc = formatarData(fatura.due_date);
    const tipo = fatura.billing_type || 'BOLETO';

    let linkPagamento = '';
    const pixCopy = getFaturaField(fatura, 'pix_copy_paste', 'pixCopyPaste');
    const boletoUrl = getFaturaField(fatura, 'boleto_url', 'bank_slip_url', 'bankSlipUrl');
    const invoiceUrl = getFaturaField(fatura, 'invoice_url', 'invoiceUrl');

    if (tipo === 'PIX' && pixCopy) {
      linkPagamento = `\n\n🔑 *PIX Copia e Cola:*\n${pixCopy}`;
    } else if (tipo === 'BOLETO' && boletoUrl) {
      linkPagamento = `\n\n📄 *Link do Boleto:*\n${boletoUrl}`;
    }
    if (invoiceUrl) {
      linkPagamento += `\n\n🔗 *Link de Pagamento:*\n${invoiceUrl}`;
    }

    const desc = fatura.description || '';
    const msg = encodeURIComponent(
      `Olá ${cliente.nome}!\n\n` +
      `Segue sua fatura:\n\n` +
      `📋 ${desc}\n` +
      `💰 Valor: *${valor}*\n` +
      `📅 Vencimento: ${venc}\n` +
      `💳 Forma: ${tipo}` +
      linkPagamento +
      `\n\nEm caso de duvidas, entre em contato.\nObrigado! 🙏`
    );
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
  };

  // ==========================
  // COPIAR DADOS DA FATURA
  // ==========================
  const copiarDadosFatura = (fatura: any) => {
    const valor = formatarValor(parseFloat(fatura.amount || 0));
    const venc = formatarData(fatura.due_date);
    const statusInfo = getStatusInfo(fatura.status);
    const tipo = fatura.billing_type || '-';

    const boletoUrl = getFaturaField(fatura, 'boleto_url', 'bank_slip_url', 'bankSlipUrl');
    const pixCopy = getFaturaField(fatura, 'pix_copy_paste', 'pixCopyPaste');
    const invoiceUrl = getFaturaField(fatura, 'invoice_url', 'invoiceUrl');

    let texto =
      `Cliente: ${cliente.nome}\n` +
      `Descricao: ${fatura.description || '-'}\n` +
      `Valor: ${valor}\n` +
      `Vencimento: ${venc}\n` +
      `Metodo: ${tipo}\n` +
      `Status: ${statusInfo.label}`;

    if (boletoUrl) {
      texto += `\nBoleto: ${boletoUrl}`;
    }
    if (pixCopy) {
      texto += `\nPIX: ${pixCopy}`;
    }
    if (invoiceUrl) {
      texto += `\nLink: ${invoiceUrl}`;
    }

    navigator.clipboard.writeText(texto).then(() => {
      mostrarSucesso('Dados copiados!');
    }).catch(() => {
      mostrarErro('Nao foi possivel copiar');
    });
  };

  // ==========================
  // GERAR CARNE (multiplas faturas)
  // ==========================
  const gerarCarne = async () => {
    if (!empresa || !clienteId) return;
    const valorNum = parseValor(formCarne.valor);
    if (valorNum <= 0) {
      mostrarErro('Valor deve ser maior que zero');
      return;
    }
    const qtdMeses = parseInt(formCarne.meses);
    if (qtdMeses < 1 || qtdMeses > 24) {
      mostrarErro('Quantidade de meses deve ser entre 1 e 24');
      return;
    }

    setGerandoCarne(true);
    setResultadoCarne(null);
    try {
      const billingType = BILLING_TYPE_MAP[formCarne.metodo] || 'BOLETO';
      const dia = cliente.dia_vencimento || 10;

      // Calcular mesInicio se nao informado
      let startMonth = formCarne.mesInicio;
      if (!startMonth) {
        const now = new Date();
        let mes = now.getMonth() + 1; // proximo mes
        let ano = now.getFullYear();
        if (now.getDate() > dia) {
          mes += 1;
        }
        if (mes > 12) { mes = 1; ano += 1; }
        startMonth = `${ano}-${String(mes).padStart(2, '0')}`;
      }

      const result = await financialApi('POST', '/invoices/carne', {
        customerId: clienteId,
        customerName: cliente.nome || cliente.razao_social || '',
        customerDocument: cliente.cpf || cliente.cnpj || '',
        customerEmail: cliente.email || '',
        customerPhone: cliente.telefone || cliente.whatsapp || '',
        billingType,
        amount: valorNum,
        billingDay: dia,
        months: qtdMeses,
        startMonth,
        description: formCarne.descricao || 'Mensalidade',
      });

      setResultadoCarne(result);
      await carregarFaturas();
      mostrarSucesso(`Carnê gerado! ${result.geradas} de ${result.total_parcelas} parcelas criadas.`);
    } catch (e: any) {
      if (e.message?.includes('Gateway') || e.message?.includes('gateway') || e.message?.includes('Wide Pay')) {
        mostrarErro('Configure sua carteira Wide Pay primeiro! Acesse Financeiro → Gateway de Pagamento.');
      } else {
        mostrarErro('Erro ao gerar carnê: ' + (e.message || 'Erro desconhecido'));
      }
    } finally {
      setGerandoCarne(false);
    }
  };

  const abrirModalCarne = () => {
    const now = new Date();
    const dia = cliente.dia_vencimento || 10;
    let mes = now.getMonth() + 1;
    let ano = now.getFullYear();
    if (now.getDate() > dia) { mes += 1; }
    if (mes > 12) { mes = 1; ano += 1; }

    setFormCarne({
      valor: planoAtual?.preco ? String(parseValor(planoAtual.preco)).replace('.', ',') : '',
      meses: '12',
      metodo: cliente.forma_pagamento || 'boleto',
      descricao: planoAtual?.nome || 'Mensalidade',
      mesInicio: `${ano}-${String(mes).padStart(2, '0')}`,
    });
    setResultadoCarne(null);
    setModalCarne(true);
  };

  // ==========================
  // CALCULOS
  // ==========================
  const isPago = (s: string) => ['CONFIRMED', 'RECEIVED', 'RECEIVED_MANUALLY'].includes(s);
  const isPendente = (s: string) => s === 'PENDING' || s === 'AWAITING_ANALYSIS';
  const isVencido = (s: string) => s === 'OVERDUE';
  const isCancelado = (s: string) => ['CANCELLED', 'REFUNDED'].includes(s);

  const totalPago = faturas.filter(f => isPago(f.status)).reduce((acc, f) => acc + parseFloat(f.amount || 0), 0);
  const totalAberto = faturas.filter(f => isPendente(f.status) || isVencido(f.status)).reduce((acc, f) => acc + parseFloat(f.amount || 0), 0);
  const totalVencido = faturas.filter(f => isVencido(f.status)).reduce((acc, f) => acc + parseFloat(f.amount || 0), 0);
  const qtdPendentes = faturas.filter(f => isPendente(f.status)).length;
  const qtdVencidas = faturas.filter(f => isVencido(f.status)).length;
  const qtdPagas = faturas.filter(f => isPago(f.status)).length;
  const qtdCanceladas = faturas.filter(f => isCancelado(f.status)).length;

  // Faturas filtradas
  const faturasFiltradas = filtroStatus === 'todos'
    ? faturas
    : faturas.filter((f: any) => {
        const info = getStatusInfo(f.status);
        return info.key === filtroStatus;
      });

  // ==========================
  // HELPERS FORMATACAO
  // ==========================
  const mesAtual = () => {
    const now = new Date();
    const meses = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${meses[now.getMonth()]}/${now.getFullYear()}`;
  };

  const dataVencimentoPadrao = () => {
    const now = new Date();
    const dia = cliente.dia_vencimento || 10;
    let mes = now.getMonth();
    let ano = now.getFullYear();
    if (now.getDate() > dia) {
      mes += 1;
      if (mes > 11) { mes = 0; ano += 1; }
    }
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  };

  const corStatusFatura = (status: string) => {
    const info = getStatusInfo(status);
    switch(info.key) {
      case 'pago': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'pendente': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'vencido': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelado': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  const labelBillingType = (type: string) => {
    switch(type) {
      case 'BOLETO': return 'Boleto';
      case 'PIX': return 'PIX';
      case 'BOLETO_PIX': return 'Boleto + PIX';
      default: return type || '-';
    }
  };

  const CampoSelect = ({ label, campo, opcoes }: { label: string; campo: string; opcoes: { value: string; label: string }[] }) => (
    <div>
      <label className={estiloRotulo}>{label}</label>
      {editando ? (
        <select value={formEdit[campo] || ''} onChange={(e) => setFormEdit((p: any) => ({ ...p, [campo]: e.target.value }))} className={estiloSelect}>
          {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <p className={estiloValor}>{opcoes.find(o => o.value === String(cliente[campo]))?.label || cliente[campo] || <span className="text-zinc-600">-</span>}</p>
      )}
    </div>
  );

  const abrirModalFatura = (metodo: string) => {
    setFormFatura({
      valor: planoAtual?.preco ? String(parseValor(planoAtual.preco)).replace('.', ',') : '',
      data_vencimento: dataVencimentoPadrao(),
      mes: mesAtual(),
      metodo,
      observacoes: '',
    });
    setModalFatura(true);
  };

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="space-y-6">
      {/* Mensagens de sucesso/erro */}
      {sucessoMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono animate-in fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {sucessoMsg}
        </div>
      )}
      {erroMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono animate-in fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {erroMsg}
        </div>
      )}

      {/* Aviso se backend offline */}
      {backendOnline === false && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="font-bold">Backend financeiro offline</p>
            <p className="text-orange-500/80 mt-0.5">Inicie o backend: abra um terminal na pasta do projeto, entre na pasta <code className="bg-orange-500/10 px-1 rounded">backend</code> e execute <code className="bg-orange-500/10 px-1 rounded">npx ts-node --transpile-only server.ts</code></p>
          </div>
        </div>
      )}

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-zinc-900 bg-zinc-900/40">
          <CardContent className="p-4 text-center">
            <p className={estiloRotulo}>Vencimento</p>
            <p className="text-lg font-black text-white font-mono mt-1">Dia {cliente.dia_vencimento || 10}</p>
          </CardContent>
        </Card>
        <Card className="border border-zinc-900 bg-zinc-900/40">
          <CardContent className="p-4 text-center">
            <p className={estiloRotulo}>Pagamento</p>
            <p className="text-lg font-black text-white font-mono mt-1 capitalize">{cliente.forma_pagamento || 'Boleto'}</p>
          </CardContent>
        </Card>
        <Card className="border border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-mono uppercase text-emerald-500">Em Dia</p>
            <p className="text-lg font-black text-emerald-400 font-mono mt-1">{formatarValor(totalPago)}</p>
            <p className="text-[10px] font-mono text-emerald-600 mt-0.5">{qtdPagas} fatura{qtdPagas !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className={`border ${totalVencido > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-mono uppercase text-red-500">Em Aberto</p>
            <p className="text-lg font-black text-red-400 font-mono mt-1">{formatarValor(totalAberto)}</p>
            <p className="text-[10px] font-mono text-red-600 mt-0.5">
              {qtdVencidas > 0 && <span className="text-red-400 font-bold">{qtdVencidas} vencida{qtdVencidas !== 1 ? 's' : ''}</span>}
              {qtdVencidas > 0 && qtdPendentes > 0 && ' · '}
              {qtdPendentes > 0 && `${qtdPendentes} pendente${qtdPendentes !== 1 ? 's' : ''}`}
              {qtdVencidas === 0 && qtdPendentes === 0 && 'nenhuma'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuracao financeira editavel */}
      <div>
        <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest border-b border-zinc-900 pb-2 mb-4">Configuracao</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CampoSelect label="Dia Vencimento" campo="dia_vencimento" opcoes={[1,5,7,10,15,20,25,30].map(d => ({ value: String(d), label: `Dia ${d}` }))} />
          <CampoSelect label="Forma Pagamento" campo="forma_pagamento" opcoes={[
            { value: 'boleto', label: 'Boleto' },
            { value: 'pix', label: 'PIX' },
            { value: 'boleto_pix', label: 'Boleto + PIX' },
            { value: 'debito_automatico', label: 'Debito Automatico' },
          ]} />
          <div>
            <label className={estiloRotulo}>Isento de Corte</label>
            {editando ? (
              <select value={formEdit.isento_corte ? 'sim' : 'nao'} onChange={(e) => setFormEdit((p: any) => ({ ...p, isento_corte: e.target.value === 'sim' }))} className={estiloSelect}>
                <option value="nao">Nao</option>
                <option value="sim">Sim</option>
              </select>
            ) : (
              <p className={estiloValor}>{cliente.isento_corte ? <span className="text-emerald-400">Sim</span> : 'Nao'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Faturas - Header com filtros */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-mono uppercase text-emerald-500 tracking-widest">Faturas</p>
            {/* Filtros por status */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'todos', label: 'Todos', count: faturas.length },
                { id: 'pendente', label: 'Pendentes', count: qtdPendentes },
                { id: 'vencido', label: 'Vencidas', count: qtdVencidas },
                { id: 'pago', label: 'Pagas', count: qtdPagas },
                { id: 'cancelado', label: 'Canceladas', count: qtdCanceladas },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFiltroStatus(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    filtroStatus === f.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-900/60 text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {f.label} {f.count > 0 && <span className="ml-1 opacity-60">({f.count})</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Gerar mensal automatico */}
            {planoAtual && (
              <button
                onClick={gerarFaturaMensal}
                disabled={salvandoFatura || backendOnline === false}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold uppercase hover:bg-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                title={`Gerar fatura de ${mesAtual()} - ${formatarValor(parseValor(planoAtual.preco))}`}
              >
                <Zap className="w-3 h-3" /> GERAR MENSAL
              </button>
            )}
            {/* Gerar manual */}
            <button
              onClick={() => abrirModalFatura(cliente.forma_pagamento || 'boleto')}
              disabled={backendOnline === false}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3 h-3" /> GERAR FATURA
            </button>
          </div>
        </div>

        {/* Tabela de faturas */}
        {carregandoFaturas ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="ml-2 text-xs text-zinc-500 font-mono">Carregando faturas...</span>
          </div>
        ) : faturasFiltradas.length === 0 ? (
          <Card className="border border-zinc-900 bg-zinc-900/40">
            <CardContent className="p-8 text-center">
              <Receipt className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-xs font-mono text-zinc-500">
                {filtroStatus === 'todos' ? 'Nenhuma fatura encontrada' : `Nenhuma fatura ${filtroStatus === 'pago' ? 'paga' : filtroStatus === 'cancelado' ? 'cancelada' : filtroStatus === 'vencido' ? 'vencida' : 'pendente'}`}
              </p>
              {filtroStatus === 'todos' && (
                <p className="text-[10px] font-mono text-zinc-600 mt-1">Clique em &quot;Gerar Fatura&quot; ou &quot;Gerar Mensal&quot; para criar</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-zinc-900 bg-zinc-900/40">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-900/50">
                    <th className="text-left px-4 py-3 text-zinc-600 uppercase text-[10px]">Descricao</th>
                    <th className="text-left px-4 py-3 text-zinc-600 uppercase text-[10px]">Vencimento</th>
                    <th className="text-right px-4 py-3 text-zinc-600 uppercase text-[10px]">Valor</th>
                    <th className="text-center px-4 py-3 text-zinc-600 uppercase text-[10px]">Metodo</th>
                    <th className="text-center px-4 py-3 text-zinc-600 uppercase text-[10px]">Status</th>
                    <th className="text-center px-4 py-3 text-zinc-600 uppercase text-[10px]">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {faturasFiltradas.map((f: any) => {
                    const statusInfo = getStatusInfo(f.status);
                    const isOverdue = statusInfo.key === 'vencido';
                    const boletoUrl = getFaturaField(f, 'boleto_url', 'bank_slip_url', 'bankSlipUrl');
                    const invoiceUrl = getFaturaField(f, 'invoice_url', 'invoiceUrl');
                    const pixCopy = getFaturaField(f, 'pix_copy_paste', 'pixCopyPaste');
                    const linkUrl = invoiceUrl || boletoUrl;

                    return (
                      <tr key={f.id} className={`hover:bg-zinc-900/30 ${isOverdue ? 'bg-red-500/5' : ''}`}>
                        <td className="px-4 py-3 text-zinc-300 max-w-[200px] truncate">{f.description || '-'}</td>
                        <td className={`px-4 py-3 ${isOverdue ? 'text-red-400' : 'text-zinc-300'}`}>
                          {formatarData(f.due_date)}
                          {isOverdue && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-400" />}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-300">{formatarValor(parseFloat(f.amount || 0))}</td>
                        <td className="px-4 py-3 text-center text-zinc-400">{labelBillingType(f.billing_type)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded border text-[10px] font-bold ${corStatusFatura(f.status)}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Link do boleto/PIX */}
                            {linkUrl && (statusInfo.key === 'pendente' || statusInfo.key === 'vencido') && (
                              <a
                                href={linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Abrir link de pagamento"
                                className="text-zinc-500 hover:text-emerald-400 p-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {/* Copiar PIX */}
                            {pixCopy && (statusInfo.key === 'pendente' || statusInfo.key === 'vencido') && (
                              <button
                                onClick={() => copiarPix(f)}
                                title="Copiar codigo PIX"
                                className="text-zinc-500 hover:text-purple-400 p-1 cursor-pointer"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            )}
                            {/* Enviar WhatsApp */}
                            {(statusInfo.key === 'pendente' || statusInfo.key === 'vencido') && (
                              <button
                                onClick={() => enviarWhatsApp(f)}
                                title="Enviar por WhatsApp"
                                className="text-zinc-500 hover:text-green-400 p-1 cursor-pointer"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                            {/* Cancelar */}
                            {(statusInfo.key === 'pendente' || statusInfo.key === 'vencido') && (
                              <button
                                onClick={() => cancelarFatura(f.id)}
                                title="Cancelar fatura"
                                className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            {/* Ver detalhes */}
                            <button
                              onClick={() => setModalDetalhes(f)}
                              title="Ver detalhes"
                              className="text-zinc-500 hover:text-blue-400 p-1 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {/* Copiar dados */}
                            <button
                              onClick={() => copiarDadosFatura(f)}
                              title="Copiar dados"
                              className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botoes de acao rapida */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => abrirModalFatura('boleto')} disabled={backendOnline === false} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50">
          <Receipt className="w-4 h-4" /> GERAR BOLETO
        </button>
        <button onClick={() => abrirModalFatura('pix')} disabled={backendOnline === false} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-bold uppercase hover:bg-purple-500/20 transition-all cursor-pointer disabled:opacity-50">
          <DollarSign className="w-4 h-4" /> GERAR PIX
        </button>
        <button onClick={() => abrirModalFatura('boleto_pix')} disabled={backendOnline === false} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase hover:bg-blue-500/20 transition-all cursor-pointer disabled:opacity-50">
          <CreditCard className="w-4 h-4" /> BOLETO + PIX
        </button>
        <button onClick={abrirModalCarne} disabled={backendOnline === false} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold uppercase hover:bg-amber-500/20 transition-all cursor-pointer disabled:opacity-50">
          <Receipt className="w-4 h-4" /> GERAR CARNÊ
        </button>
      </div>

      {/* ================================================================ */}
      {/* MODAL: GERAR FATURA */}
      {/* ================================================================ */}
      {modalFatura && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalFatura(false)}>
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-white uppercase">Gerar Fatura</h3>
              <button onClick={() => setModalFatura(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {planoAtual && (
              <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] font-mono text-emerald-600 uppercase">Plano Ativo</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">{planoAtual.nome} - {planoAtual.preco}</p>
              </div>
            )}

            {/* Info: vai gerar cobranca real */}
            <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-[10px] font-mono text-blue-400">
                <strong>Cobranca real:</strong> Sera gerado um {formFatura.metodo === 'pix' ? 'QR Code PIX' : formFatura.metodo === 'boleto_pix' ? 'boleto + PIX' : 'boleto bancario'} via Wide Pay.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className={estiloLabel}>Mes Referencia *</label>
                <input type="text" value={formFatura.mes} onChange={(e) => setFormFatura(p => ({ ...p, mes: e.target.value }))} placeholder="Outubro/2026" className={estiloInput} />
              </div>
              <div>
                <label className={estiloLabel}>Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">R$</span>
                  <input type="text" value={formFatura.valor} onChange={(e) => setFormFatura(p => ({ ...p, valor: e.target.value }))} placeholder="100,00" className={`${estiloInput} pl-10`} />
                </div>
              </div>
              <div>
                <label className={estiloLabel}>Data Vencimento *</label>
                <input type="date" value={formFatura.data_vencimento} onChange={(e) => setFormFatura(p => ({ ...p, data_vencimento: e.target.value }))} className={estiloInput} />
              </div>
              <div>
                <label className={estiloLabel}>Metodo de Pagamento</label>
                <select value={formFatura.metodo} onChange={(e) => setFormFatura(p => ({ ...p, metodo: e.target.value }))} className={estiloSelect}>
                  <option value="boleto">Boleto Bancario</option>
                  <option value="pix">PIX</option>
                  <option value="boleto_pix">Boleto + PIX</option>
                </select>
              </div>
              <div>
                <label className={estiloLabel}>Observacoes</label>
                <input type="text" value={formFatura.observacoes} onChange={(e) => setFormFatura(p => ({ ...p, observacoes: e.target.value }))} placeholder="Opcional" className={estiloInput} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalFatura(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono font-bold uppercase hover:bg-zinc-900 transition-all cursor-pointer">
                CANCELAR
              </button>
              <button onClick={criarFatura} disabled={salvandoFatura} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 cursor-pointer">
                {salvandoFatura ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'GERAR FATURA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: RESULTADO (PIX QR Code / Link Boleto) */}
      {/* ================================================================ */}
      {modalResultado && (() => {
        const pixQr = getFaturaField(modalResultado, 'pix_qr_code', 'pix_qrcode', 'pixQrcode');
        const pixCopy = getFaturaField(modalResultado, 'pix_copy_paste', 'pixCopyPaste');
        const boletoUrl = getFaturaField(modalResultado, 'boleto_url', 'bank_slip_url', 'bankSlipUrl');
        const invoiceUrl = getFaturaField(modalResultado, 'invoice_url', 'invoiceUrl');

        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalResultado(null)}>
            <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase">Fatura Gerada!</h3>
                <button onClick={() => setModalResultado(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center space-y-3">
                <p className="text-lg font-black text-white font-mono">
                  {formatarValor(parseFloat(modalResultado.amount || modalResultado.value || 0))}
                </p>

                {/* QR Code PIX */}
                {pixQr && (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-purple-400 uppercase font-bold">QR Code PIX</p>
                    <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                      <img
                        src={pixQr}
                        alt="QR Code PIX"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                    {pixCopy && (
                      <button
                        onClick={() => copiarPix(modalResultado)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-bold uppercase hover:bg-purple-500/20 transition-all cursor-pointer mx-auto"
                      >
                        <Copy className="w-3.5 h-3.5" /> COPIAR PIX COPIA E COLA
                      </button>
                    )}
                  </div>
                )}

                {/* Link Boleto */}
                {boletoUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-emerald-400 uppercase font-bold">Boleto Bancario</p>
                    <a
                      href={boletoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase hover:bg-emerald-500/20 transition-all cursor-pointer mx-auto w-fit"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> ABRIR BOLETO
                    </a>
                  </div>
                )}

                {/* Link generico de pagamento */}
                {invoiceUrl && (
                  <a
                    href={invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold uppercase hover:bg-zinc-700 transition-all cursor-pointer mx-auto w-fit"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> LINK DE PAGAMENTO
                  </a>
                )}
              </div>

              {/* Enviar por WhatsApp */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { enviarWhatsApp(modalResultado); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-mono font-bold uppercase hover:bg-green-600/30 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> ENVIAR WHATSAPP
                </button>
                <button
                  onClick={() => setModalResultado(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono font-bold uppercase hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================ */}
      {/* MODAL: DETALHES DA FATURA */}
      {/* ================================================================ */}
      {modalDetalhes && (() => {
        const statusInfo = getStatusInfo(modalDetalhes.status);
        const boletoUrl = getFaturaField(modalDetalhes, 'boleto_url', 'bank_slip_url', 'bankSlipUrl');
        const invoiceUrl = getFaturaField(modalDetalhes, 'invoice_url', 'invoiceUrl');
        const pixCopy = getFaturaField(modalDetalhes, 'pix_copy_paste', 'pixCopyPaste');
        const pixQr = getFaturaField(modalDetalhes, 'pix_qr_code', 'pix_qrcode', 'pixQrcode');

        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalDetalhes(null)}>
            <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white uppercase">Detalhes da Fatura</h3>
                  {(modalDetalhes.gateway_id || modalDetalhes.widepay_id) && (
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">Wide Pay: {modalDetalhes.gateway_id || modalDetalhes.widepay_id}</p>
                  )}
                </div>
                <button onClick={() => setModalDetalhes(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status badge grande */}
              <div className="flex justify-center">
                <span className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold uppercase ${corStatusFatura(modalDetalhes.status)}`}>
                  {statusInfo.label}
                </span>
              </div>

              {/* Dados */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={estiloRotulo}>Cliente</p>
                  <p className={estiloValor}>{modalDetalhes.customer_name || cliente.nome}</p>
                </div>
                <div>
                  <p className={estiloRotulo}>Descricao</p>
                  <p className={estiloValor}>{modalDetalhes.description || '-'}</p>
                </div>
                <div>
                  <p className={estiloRotulo}>Valor</p>
                  <p className="text-lg font-black text-white font-mono">{formatarValor(parseFloat(modalDetalhes.amount || 0))}</p>
                </div>
                <div>
                  <p className={estiloRotulo}>Metodo</p>
                  <p className={estiloValor}>{labelBillingType(modalDetalhes.billing_type)}</p>
                </div>
                <div>
                  <p className={estiloRotulo}>Vencimento</p>
                  <p className={`${estiloValor} ${statusInfo.key === 'vencido' ? 'text-red-400' : ''}`}>
                    {formatarData(modalDetalhes.due_date)}
                  </p>
                </div>
                <div>
                  <p className={estiloRotulo}>Data Pagamento</p>
                  <p className={estiloValor}>{formatarData(modalDetalhes.paid_date || modalDetalhes.payment_date)}</p>
                </div>
                {(modalDetalhes.fine_value > 0 || modalDetalhes.interest_value > 0) && (
                  <>
                    <div>
                      <p className={estiloRotulo}>Multa</p>
                      <p className={estiloValor}>{formatarValor(parseFloat(modalDetalhes.fine_value || 0))}</p>
                    </div>
                    <div>
                      <p className={estiloRotulo}>Juros</p>
                      <p className={estiloValor}>{formatarValor(parseFloat(modalDetalhes.interest_value || 0))}</p>
                    </div>
                  </>
                )}
                {modalDetalhes.total_paid && (
                  <div>
                    <p className={estiloRotulo}>Total Pago</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{formatarValor(parseFloat(modalDetalhes.total_paid))}</p>
                  </div>
                )}
              </div>

              {/* Links de pagamento */}
              {(boletoUrl || invoiceUrl || pixCopy) && (
                <div className="border-t border-zinc-800 pt-3 space-y-2">
                  <p className="text-[10px] font-mono uppercase text-zinc-500">Links de Pagamento</p>
                  {boletoUrl && (
                    <a href={boletoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300">
                      <ExternalLink className="w-3.5 h-3.5" /> Boleto bancario
                    </a>
                  )}
                  {invoiceUrl && (
                    <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-mono text-blue-400 hover:text-blue-300">
                      <ExternalLink className="w-3.5 h-3.5" /> Link de pagamento
                    </a>
                  )}
                  {pixCopy && (
                    <button onClick={() => copiarPix(modalDetalhes)}
                      className="flex items-center gap-2 text-xs font-mono text-purple-400 hover:text-purple-300 cursor-pointer">
                      <QrCode className="w-3.5 h-3.5" /> Copiar PIX copia e cola
                    </button>
                  )}
                </div>
              )}

              {/* PIX QR Code no detalhes */}
              {pixQr && (statusInfo.key === 'pendente' || statusInfo.key === 'vencido') && (
                <div className="border-t border-zinc-800 pt-3 text-center">
                  <p className="text-[10px] font-mono uppercase text-purple-400 mb-2">QR Code PIX</p>
                  <div className="bg-white rounded-xl p-3 inline-block">
                    <img
                      src={pixQr}
                      alt="QR Code PIX"
                      className="w-36 h-36"
                    />
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t border-zinc-800 pt-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600">
                  <span>Criado: {modalDetalhes.created_at ? new Date(modalDetalhes.created_at).toLocaleString('pt-BR') : '-'}</span>
                  <span>Atualizado: {modalDetalhes.updated_at ? new Date(modalDetalhes.updated_at).toLocaleString('pt-BR') : '-'}</span>
                </div>
              </div>

              {/* Acoes do modal */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(statusInfo.key === 'pendente' || statusInfo.key === 'vencido') && (
                  <>
                    <button
                      onClick={() => enviarWhatsApp(modalDetalhes)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-mono font-bold uppercase hover:bg-green-600/30 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> WHATSAPP
                    </button>
                    <button
                      onClick={() => { cancelarFatura(modalDetalhes.id); setModalDetalhes(null); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-bold uppercase hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      <Ban className="w-4 h-4" /> CANCELAR
                    </button>
                  </>
                )}
                <button
                  onClick={() => copiarDadosFatura(modalDetalhes)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold uppercase hover:bg-zinc-700 transition-all cursor-pointer"
                >
                  <Copy className="w-4 h-4" /> COPIAR
                </button>
                <button
                  onClick={() => setModalDetalhes(null)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-500 text-xs font-mono font-bold uppercase hover:bg-zinc-900 transition-all cursor-pointer ml-auto"
                >
                  FECHAR
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================ */}
      {/* MODAL: GERAR CARNÊ */}
      {/* ================================================================ */}
      {modalCarne && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => !gerandoCarne && setModalCarne(false)}>
          <div className="bg-[#111] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-amber-400 uppercase">Gerar Carnê</h3>
              <button onClick={() => !gerandoCarne && setModalCarne(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!resultadoCarne ? (
              <>
                {/* Info */}
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] font-mono text-amber-400">
                    <strong>Carnê:</strong> Gera múltiplas faturas de uma vez com vencimentos mensais consecutivos via Wide Pay.
                  </p>
                </div>

                {planoAtual && (
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] font-mono text-emerald-600 uppercase">Plano Ativo</p>
                    <p className="text-xs font-mono text-emerald-400 font-bold">{planoAtual.nome} - {planoAtual.preco}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={estiloLabel}>Valor por Parcela *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">R$</span>
                        <input type="text" value={formCarne.valor} onChange={(e) => setFormCarne(p => ({ ...p, valor: e.target.value }))} placeholder="100,00" className={`${estiloInput} pl-10`} />
                      </div>
                    </div>
                    <div>
                      <label className={estiloLabel}>Quantidade de Meses *</label>
                      <select value={formCarne.meses} onChange={(e) => setFormCarne(p => ({ ...p, meses: e.target.value }))} className={estiloSelect}>
                        {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                          <option key={n} value={String(n)}>{n} {n === 1 ? 'mês' : 'meses'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={estiloLabel}>Mês Início</label>
                      <input type="month" value={formCarne.mesInicio} onChange={(e) => setFormCarne(p => ({ ...p, mesInicio: e.target.value }))} className={estiloInput} />
                    </div>
                    <div>
                      <label className={estiloLabel}>Método de Pagamento</label>
                      <select value={formCarne.metodo} onChange={(e) => setFormCarne(p => ({ ...p, metodo: e.target.value }))} className={estiloSelect}>
                        <option value="boleto">Boleto</option>
                        <option value="pix">PIX</option>
                        <option value="boleto_pix">Boleto + PIX</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={estiloLabel}>Descrição</label>
                    <input type="text" value={formCarne.descricao} onChange={(e) => setFormCarne(p => ({ ...p, descricao: e.target.value }))} placeholder="Mensalidade Internet" className={estiloInput} />
                  </div>

                  {/* Preview do carnê */}
                  <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Resumo do Carnê</p>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <p className="text-zinc-600">Parcelas</p>
                        <p className="text-white font-bold">{formCarne.meses}x</p>
                      </div>
                      <div>
                        <p className="text-zinc-600">Valor/Parcela</p>
                        <p className="text-white font-bold">{formCarne.valor ? `R$ ${formCarne.valor}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-zinc-600">Total</p>
                        <p className="text-amber-400 font-bold">
                          {formCarne.valor ? formatarValor(parseValor(formCarne.valor) * parseInt(formCarne.meses)) : '-'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 mt-1">
                      Vencimento dia {cliente.dia_vencimento || 10} de cada mês
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setModalCarne(false)} disabled={gerandoCarne} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-mono font-bold uppercase hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50">
                    CANCELAR
                  </button>
                  <button onClick={gerarCarne} disabled={gerandoCarne} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold uppercase transition-all disabled:opacity-50 cursor-pointer">
                    {gerandoCarne ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> GERANDO...
                      </span>
                    ) : (
                      `GERAR ${formCarne.meses} PARCELAS`
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Resultado do carnê */
              <>
                <div className="text-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-lg font-black text-white font-mono">Carnê Gerado!</p>
                  <p className="text-xs font-mono text-zinc-400">
                    {resultadoCarne.geradas} de {resultadoCarne.total_parcelas} parcelas criadas com sucesso
                  </p>
                </div>

                {resultadoCarne.errors?.length > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-[10px] font-mono text-red-400 font-bold uppercase">Erros ({resultadoCarne.errors.length})</p>
                    {resultadoCarne.errors.map((e: any, i: number) => (
                      <p key={i} className="text-[10px] font-mono text-red-400/80 mt-0.5">Parcela {e.parcela}: {e.erro}</p>
                    ))}
                  </div>
                )}

                {/* Lista das parcelas geradas */}
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {resultadoCarne.faturas?.map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-zinc-500 w-8">{f.parcela}</span>
                        <span className="text-xs font-mono text-zinc-300">{f.mes}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white font-bold">{formatarValor(parseFloat(f.amount))}</span>
                        {f.boleto_url && (
                          <a href={f.boleto_url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setModalCarne(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                  >
                    FECHAR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}