import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const { searchParams } = new URL(req.url);
  const chamadoId = searchParams.get("chamado_id");

  if (!chamadoId) {
    return NextResponse.json({ error: "chamado_id obrigatório" }, { status: 400 });
  }

  const { data: chamado, error: chamadoErr } = await supabase
    .from("chamados")
    .select("*")
    .eq("id", chamadoId)
    .eq("empresa_id", empresaId)
    .single();

  if (chamadoErr || !chamado) {
    return NextResponse.json({ error: "Chamado não encontrado", detail: chamadoErr?.message }, { status: 404 });
  }

  let clienteNome = "N/A";
  let clienteDoc = "N/A";
  if (chamado.cliente_id) {
    const { data: cli } = await supabase
      .from("clientes")
      .select("nome, documento")
      .eq("id", chamado.cliente_id)
      .single();
    if (cli) {
      clienteNome = cli.nome || "N/A";
      clienteDoc = cli.documento || "N/A";
    }
  }

  let categoriaNome = "N/A";
  if (chamado.categoria_id) {
    const { data: cat } = await supabase
      .from("chamado_categorias")
      .select("nome")
      .eq("id", chamado.categoria_id)
      .single();
    if (cat) categoriaNome = cat.nome;
  }

  const incluirInternas = searchParams.get("internas") === "true";
  let query = supabase
    .from("chamado_mensagens")
    .select("*")
    .eq("chamado_id", chamadoId)
    .order("created_at", { ascending: true });

  if (!incluirInternas) {
    query = query.eq("interna", false);
  }

  const { data: mensagens, error: msgsErr } = await query;
  if (msgsErr) {
    return NextResponse.json({ error: "Erro ao buscar mensagens" }, { status: 500 });
  }

  const linhas: string[] = [];
  linhas.push("═".repeat(50));
  linhas.push("HISTÓRICO DO CHAMADO");
  linhas.push("═".repeat(50));
  linhas.push("");
  linhas.push(`Protocolo: #${chamado.protocolo}`);
  linhas.push(`Assunto: ${chamado.assunto}`);
  linhas.push(`Cliente: ${clienteNome}`);
  linhas.push(`Documento: ${clienteDoc}`);
  linhas.push(`Categoria: ${categoriaNome}`);
  linhas.push(`Status: ${chamado.status}`);
  linhas.push(`Prioridade: ${chamado.prioridade}`);
  linhas.push(`Aberto em: ${formatarData(chamado.created_at)}`);
  if (chamado.resolvido_em) {
    linhas.push(`Resolvido em: ${formatarData(chamado.resolvido_em)}`);
  }
  linhas.push("");
  linhas.push("─".repeat(50));
  linhas.push("MENSAGENS");
  linhas.push("─".repeat(50));
  linhas.push("");

  let diaAtual = "";
  for (const msg of mensagens || []) {
    const dia = formatarDia(msg.created_at);
    if (dia !== diaAtual) {
      linhas.push(`--- ${dia} ---`);
      diaAtual = dia;
    }

    const hora = formatarHora(msg.created_at);
    const tipo = msg.autor_tipo === "cliente" ? "Cliente" :
                 msg.autor_tipo === "sistema" ? "Sistema" : "Atendente";
    const marcaInterna = msg.interna ? " [NOTA INTERNA]" : "";

    linhas.push(`[${hora}] ${tipo} (${msg.autor_nome})${marcaInterna}:`);
    linhas.push(`  ${msg.mensagem}`);
    linhas.push("");
  }

  linhas.push("─".repeat(50));
  linhas.push(`Exportado em: ${formatarData(new Date().toISOString())}`);
  linhas.push(`Total de mensagens: ${mensagens?.length || 0}`);
  linhas.push("═".repeat(50));

  const texto = linhas.join("\n");
  const nomeArquivo = `chamado-${chamado.protocolo}.txt`;

  return new NextResponse(texto, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}

function formatarData(dataStr: string): string {
  const d = new Date(dataStr);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatarDia(dataStr: string): string {
  const d = new Date(dataStr);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatarHora(dataStr: string): string {
  const d = new Date(dataStr);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}