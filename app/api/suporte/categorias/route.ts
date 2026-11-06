import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — listar categorias da empresa
export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const { data, error } = await supabase
    .from("chamado_categorias")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — criar nova categoria
export async function POST(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const body = await req.json();
  const { nome, descricao, prioridade_padrao } = body;

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chamado_categorias")
    .insert({
      empresa_id: empresaId,
      nome: nome.trim(),
      descricao: descricao?.trim() || "",
      prioridade_padrao: prioridade_padrao || "media",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH — atualizar categoria
export async function PATCH(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

  const { data, error } = await supabase
    .from("chamado_categorias")
    .update(updates)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}