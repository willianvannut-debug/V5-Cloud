// api/contratos/modelos/route.ts
// CRUD de modelos/templates de contrato
// Caminho: app/api/contratos/modelos/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Listar modelos
export async function GET(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const tenantId = sessao.empresaId;

    const { data, error } = await supabase
      .from("modelos_contrato")
      .select("*")
      .eq("empresa_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — Criar modelo
export async function POST(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const tenantId = sessao.empresaId;

    const body = await req.json();
    const { nome, descricao, conteudo } = body;

    if (!nome) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const { data, error } = await supabase
      .from("modelos_contrato")
      .insert({
        empresa_id: tenantId,
        nome,
        descricao: descricao || null,
        conteudo: conteudo || "",
        ativo: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — Atualizar modelo
export async function PUT(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const tenantId = sessao.empresaId;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

    delete updates.empresa_id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from("modelos_contrato")
      .update(updates)
      .eq("id", id)
      .eq("empresa_id", tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — Remover modelo
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const tenantId = sessao.empresaId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

    const { error } = await supabase
      .from("modelos_contrato")
      .update({ ativo: false })
      .eq("id", id)
      .eq("empresa_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Modelo desativado" });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
} 