// app/dashboard/contratos/gerar-contrato-pdf/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import {
  FileDown,
  FileText,
  Loader2,
  Printer,
  Building2,
  User,
  Wifi,
} from "lucide-react";

interface Contrato {
  id: string;
  customer_name: string;
  customer_document: string;
  customer_email: string;
  customer_phone: string;
  plan_name: string;
  amount: number;
  billing_day: number;
  billing_type: string;
  status: string;
  start_date: string;
  observacoes: string;
}

export default function GerarContratoPdfPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [contratoId, setContratoId] = useState("");
  const [gerando, setGerando] = useState(false);
  const [empresaNome, setEmpresaNome] = useState("ISP Telecom Ltda");
  const [empresaCnpj, setEmpresaCnpj] = useState("00.000.000/0001-00");
  const [empresaEndereco, setEmpresaEndereco] = useState(
    "Rua Exemplo, 123 - Centro - Cidade/UF"
  );
  const previewRef = useRef<HTMLDivElement>(null);

  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("v5_tenant_id") || ""
      : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tenant-id": tenantId,
  };

  // Carregar contratos ativos
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const res = await fetch("http://localhost:4000/contratos", { headers });
        const data = await res.json();
        const lista = (
          Array.isArray(data) ? data : data.data || data.contratos || []
        ).filter((c: Contrato) => c.status === "active");
        setContratos(lista);
      } catch {
        console.error("Erro ao carregar contratos");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const contrato = contratos.find((c) => c.id === contratoId);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Gerar PDF via impressão do navegador
  async function gerarPDF() {
    if (!previewRef.current) return;
    setGerando(true);

    // Usar window.print com estilos específicos
    const conteudo = previewRef.current.innerHTML;
    const janela = window.open("", "_blank");
    if (!janela) {
      setGerando(false);
      return;
    }

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Contrato - ${contrato?.customer_name || "Cliente"}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1a1a1a;
            padding: 40px;
            line-height: 1.6;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
          .header h1 { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
          .header p { font-size: 11px; color: #666; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #10b981; margin-bottom: 8px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
          .info-item { display: flex; gap: 6px; }
          .info-label { font-weight: 600; color: #555; min-width: 120px; }
          .info-value { color: #1a1a1a; }
          .clausulas { margin-top: 20px; }
          .clausulas h3 { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
          .clausulas p { margin-bottom: 10px; text-align: justify; }
          .clausulas ol { padding-left: 20px; }
          .clausulas ol li { margin-bottom: 8px; text-align: justify; }
          .assinaturas { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; text-align: center; }
          .assinatura-linha { border-top: 1px solid #333; padding-top: 8px; margin-top: 60px; }
          .assinatura-nome { font-weight: 600; }
          .assinatura-doc { font-size: 10px; color: #666; }
          .rodape { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #e5e5e5; padding-top: 10px; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${conteudo}
        <script>
          window.onload = function() { window.print(); window.close(); };
        <\/script>
      </body>
      </html>
    `);
    janela.document.close();
    setGerando(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight font-mono text-white">
            Gerar Contrato PDF
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Selecione um contrato e gere o PDF para impressão
          </p>
        </div>
        {contrato && (
          <button
            onClick={gerarPDF}
            disabled={gerando}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-mono font-bold uppercase text-xs px-4 py-2.5 rounded-lg transition-colors"
          >
            {gerando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Gerar PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel lateral */}
        <div className="lg:col-span-1 space-y-4">
          {/* Selecionar contrato */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <h2 className="text-sm font-black uppercase font-mono text-white mb-3">
              Contrato
            </h2>
            {loading ? (
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin mx-auto" />
            ) : (
              <select
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value)}
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option value="">Selecione...</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customer_name} — {c.plan_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Dados da empresa (editáveis) */}
          <div className="border border-zinc-900 bg-zinc-900/40 backdrop-blur rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-black uppercase font-mono text-white">
                Empresa
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  Razão Social
                </label>
                <input
                  type="text"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={empresaCnpj}
                  onChange={(e) => setEmpresaCnpj(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 mb-1 block">
                  Endereço
                </label>
                <input
                  type="text"
                  value={empresaEndereco}
                  onChange={(e) => setEmpresaEndereco(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview do contrato */}
        <div className="lg:col-span-3">
          <div className="border border-zinc-900 bg-white rounded-xl overflow-hidden">
            {!contrato ? (
              <div className="text-center py-20">
                <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-mono text-zinc-400">
                  Selecione um contrato para visualizar o preview
                </p>
              </div>
            ) : (
              <div ref={previewRef} className="p-8 text-[#1a1a1a] text-xs leading-relaxed">
                {/* Cabeçalho */}
                <div className="header text-center mb-8 border-b-2 border-emerald-500 pb-5">
                  <h1 className="text-lg font-extrabold uppercase tracking-wide">
                    Contrato de Prestação de Serviço de Comunicação Multimídia
                  </h1>
                  <p className="text-[11px] text-gray-500 mt-1">
                    SCM — Serviço de Acesso à Internet
                  </p>
                </div>

                {/* Dados da Empresa */}
                <div className="section mb-5">
                  <div className="section-title text-[13px] font-bold uppercase text-emerald-600 border-b border-gray-200 pb-1 mb-2">
                    Dados da Prestadora
                  </div>
                  <div className="info-grid grid grid-cols-2 gap-x-5 gap-y-1">
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Razão Social:</span>
                      <span className="info-value">{empresaNome}</span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">CNPJ:</span>
                      <span className="info-value">{empresaCnpj}</span>
                    </div>
                    <div className="info-item flex gap-1 col-span-2">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Endereço:</span>
                      <span className="info-value">{empresaEndereco}</span>
                    </div>
                  </div>
                </div>

                {/* Dados do Cliente */}
                <div className="section mb-5">
                  <div className="section-title text-[13px] font-bold uppercase text-emerald-600 border-b border-gray-200 pb-1 mb-2">
                    Dados do Assinante
                  </div>
                  <div className="info-grid grid grid-cols-2 gap-x-5 gap-y-1">
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Nome:</span>
                      <span className="info-value">{contrato.customer_name}</span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">CPF/CNPJ:</span>
                      <span className="info-value">{contrato.customer_document || "—"}</span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">E-mail:</span>
                      <span className="info-value">{contrato.customer_email || "—"}</span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Telefone:</span>
                      <span className="info-value">{contrato.customer_phone || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Dados do Plano */}
                <div className="section mb-5">
                  <div className="section-title text-[13px] font-bold uppercase text-emerald-600 border-b border-gray-200 pb-1 mb-2">
                    Plano Contratado
                  </div>
                  <div className="info-grid grid grid-cols-2 gap-x-5 gap-y-1">
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Plano:</span>
                      <span className="info-value">{contrato.plan_name}</span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Valor Mensal:</span>
                      <span className="info-value font-bold">
                        R$ {Number(contrato.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Vencimento:</span>
                      <span className="info-value">Dia {contrato.billing_day}</span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Pagamento:</span>
                      <span className="info-value">{contrato.billing_type}</span>
                    </div>
                    <div className="info-item flex gap-1">
                      <span className="info-label font-semibold text-gray-500 min-w-[120px]">Início:</span>
                      <span className="info-value">
                        {contrato.start_date
                          ? new Date(contrato.start_date).toLocaleDateString("pt-BR")
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cláusulas */}
                <div className="clausulas mt-5">
                  <div className="section-title text-[13px] font-bold uppercase text-emerald-600 border-b border-gray-200 pb-1 mb-3">
                    Cláusulas Contratuais
                  </div>

                  <ol className="list-decimal pl-5 space-y-2 text-justify">
                    <li>
                      <strong>DO OBJETO:</strong> O presente contrato tem por objeto a prestação de
                      Serviço de Comunicação Multimídia (SCM), consistente no fornecimento de acesso
                      à internet em banda larga, conforme o plano descrito acima, na modalidade de
                      prestação contínua.
                    </li>
                    <li>
                      <strong>DA VELOCIDADE:</strong> A velocidade contratada refere-se à velocidade
                      máxima de conexão. A PRESTADORA garante a velocidade média de, no mínimo, 80%
                      da velocidade contratada e a velocidade mínima de 40%, conforme regulamentação
                      vigente da ANATEL.
                    </li>
                    <li>
                      <strong>DO PRAZO:</strong> O presente contrato é firmado por prazo indeterminado,
                      podendo ser rescindido por qualquer das partes mediante aviso prévio de 30
                      (trinta) dias, sem multa.
                    </li>
                    <li>
                      <strong>DO PAGAMENTO:</strong> O ASSINANTE se compromete a efetuar o pagamento
                      mensal até a data de vencimento indicada neste contrato. O atraso no pagamento
                      acarretará multa de 2% e juros de mora de 1% ao mês.
                    </li>
                    <li>
                      <strong>DA SUSPENSÃO:</strong> A PRESTADORA poderá suspender o serviço em caso
                      de inadimplência superior a 30 (trinta) dias, após notificação prévia ao
                      ASSINANTE.
                    </li>
                    <li>
                      <strong>DA MANUTENÇÃO:</strong> A PRESTADORA se compromete a manter a
                      infraestrutura necessária para a prestação do serviço e a realizar manutenções
                      preventivas e corretivas. Eventuais interrupções programadas serão comunicadas
                      com antecedência mínima de 48 horas.
                    </li>
                    <li>
                      <strong>DA PRIVACIDADE:</strong> A PRESTADORA se compromete a proteger os dados
                      pessoais do ASSINANTE em conformidade com a Lei Geral de Proteção de Dados
                      (LGPD — Lei nº 13.709/2018).
                    </li>
                    <li>
                      <strong>DO FORO:</strong> Fica eleito o foro da comarca da sede da PRESTADORA
                      para dirimir quaisquer questões oriundas deste contrato, com renúncia de
                      qualquer outro, por mais privilegiado que seja.
                    </li>
                  </ol>
                </div>

                {/* Data */}
                <div className="mt-8 text-center text-[11px] text-gray-500">
                  <p>{empresaEndereco?.split(" - ").pop() || "Cidade/UF"}, {dataHoje}</p>
                </div>

                {/* Assinaturas */}
                <div className="assinaturas mt-12 grid grid-cols-2 gap-16 text-center">
                  <div>
                    <div className="assinatura-linha border-t border-gray-800 pt-2 mt-16">
                      <p className="assinatura-nome font-semibold">
                        {empresaNome}
                      </p>
                      <p className="assinatura-doc text-[10px] text-gray-500">
                        CNPJ: {empresaCnpj}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="assinatura-linha border-t border-gray-800 pt-2 mt-16">
                      <p className="assinatura-nome font-semibold">
                        {contrato.customer_name}
                      </p>
                      <p className="assinatura-doc text-[10px] text-gray-500">
                        CPF/CNPJ: {contrato.customer_document || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="rodape mt-8 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-3">
                  Contrato gerado eletronicamente · {empresaNome} · {empresaCnpj}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}