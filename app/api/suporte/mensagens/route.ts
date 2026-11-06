import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — listar mensagens de um chamado
export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const { searchParams } = new URL(req.url);
  const chamadoId = searchParams.get("chamado_id");

  if (!chamadoId) {
    return NextResponse.json({ error: "chamado_id é obrigatório" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chamado_mensagens")
    .select("*")
    .eq("chamado_id", chamadoId)
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — enviar mensagem (resposta ou nota interna)
export async function POST(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const body = await req.json();
  const { chamado_id, mensagem, interna, autor_nome, autor_id, anexo_url } = body;

  if (!chamado_id || !mensagem?.trim()) {
    return NextResponse.json({ error: "chamado_id e mensagem são obrigatórios" }, { status: 400 });
  }

  // Inserir mensagem
  const { data, error } = await supabase
    .from("chamado_mensagens")
    .insert({
      empresa_id: empresaId,
      chamado_id,
      autor_tipo: "atendente",
      autor_id: autor_id || null,
      autor_nome: autor_nome || "Atendente",
      mensagem: mensagem.trim(),
      interna: interna || false,
      anexo_url: anexo_url || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Se é resposta pública (não interna), verificar primeira_resposta_em
  if (!interna) {
    const { data: chamado } = await supabase
      .from("chamados")
      .select("primeira_resposta_em, status")
      .eq("id", chamado_id)
      .single();

    const updates: Record<string, any> = {};

    // Registrar primeira resposta
    if (chamado && !chamado.primeira_resposta_em) {
      updates.primeira_resposta_em = new Date().toISOString();
    }

    // Mover para em_andamento se estava aberto
    if (chamado?.status === "aberto") {
      updates.status = "em_andamento";
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("chamados")
        .update(updates)
        .eq("id", chamado_id)
        .eq("empresa_id", empresaId);
    }
  }

  return NextResponse.json(data, { status: 201 });
}