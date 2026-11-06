import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — listar chamados com filtros
export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const prioridade = searchParams.get("prioridade");
  const categoria_id = searchParams.get("categoria_id");
  const tecnico_id = searchParams.get("tecnico_id");
  const busca = searchParams.get("busca");
  const id = searchParams.get("id");

  // Busca por ID único
  if (id) {
    const { data, error } = await supabase
      .from("chamados")
      .select(`
        *,
        cliente:clientes(id, nome, cpf, telefone, whatsapp, logradouro, numero, bairro, cidade, uf),
        categoria:chamado_categorias(id, nome)
      `)
      .eq("id", id)
      .eq("empresa_id", empresaId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Lista com filtros
  let query = supabase
    .from("chamados")
    .select(`
      *,
      cliente:clientes(id, nome, cpf, telefone, whatsapp),
      categoria:chamado_categorias(id, nome)
    `)
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (prioridade) query = query.eq("prioridade", prioridade);
  if (categoria_id) query = query.eq("categoria_id", categoria_id);
  if (tecnico_id) query = query.eq("tecnico_id", tecnico_id);
  if (busca) {
    query = query.or(`protocolo.ilike.%${busca}%,assunto.ilike.%${busca}%`);
  }

  const { data, error } = await query.limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — criar novo chamado (abertura pelo painel, via telefone)
export async function POST(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const body = await req.json();
  const { cliente_id, categoria_id, assunto, descricao, prioridade, origem } = body;

  if (!cliente_id || !assunto?.trim()) {
    return NextResponse.json({ error: "Cliente e assunto são obrigatórios" }, { status: 400 });
  }

  // Se categoria tem prioridade padrão e não foi informada
  let prioridadeFinal = prioridade || "media";
  if (categoria_id && !prioridade) {
    const { data: cat } = await supabase
      .from("chamado_categorias")
      .select("prioridade_padrao")
      .eq("id", categoria_id)
      .single();
    if (cat?.prioridade_padrao) prioridadeFinal = cat.prioridade_padrao;
  }

  const { data, error } = await supabase
    .from("chamados")
    .insert({
      empresa_id: empresaId,
      cliente_id,
      categoria_id: categoria_id || null,
      assunto: assunto.trim(),
      descricao: descricao?.trim() || "",
      prioridade: prioridadeFinal,
      origem: origem || "painel",
    })
    .select(`
      *,
      cliente:clientes(id, nome, cpf, telefone),
      categoria:chamado_categorias(id, nome)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Se tem descrição, criar primeira mensagem
  if (descricao?.trim()) {
    await supabase.from("chamado_mensagens").insert({
      empresa_id: empresaId,
      chamado_id: data.id,
      autor_tipo: origem === "app" ? "cliente" : "atendente",
      autor_id: cliente_id,
      autor_nome: data.cliente?.nome || "",
      mensagem: descricao.trim(),
      interna: false,
    });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH — atualizar chamado (status, prioridade, técnico)
export async function PATCH(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  // Se está marcando como resolvido, registrar data
  if (updates.status === "resolvido") {
    updates.resolvido_em = new Date().toISOString();
  }
  // Se está reabrindo, limpar data de resolução
  if (updates.status === "aberto" || updates.status === "em_andamento") {
    updates.resolvido_em = null;
  }

  const { data, error } = await supabase
    .from("chamados")
    .update(updates)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Se resolvido, enviar mensagem automática de sistema
  if (updates.status === "resolvido") {
    await supabase.from("chamado_mensagens").insert({
      empresa_id: empresaId,
      chamado_id: id,
      autor_tipo: "sistema",
      autor_nome: "Sistema",
      mensagem: "✅ Chamado marcado como resolvido. Se o problema persistir, você pode reabrir este chamado.",
      interna: false,
    });
  }

  return NextResponse.json(data);
}