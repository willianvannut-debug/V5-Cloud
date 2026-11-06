// api/contratos/planos/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Listar planos da empresa
export async function GET(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
    if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const tenantId = sessao.empresaId;

    const { searchParams } = new URL(req.url);
    const apenasAtivos = searchParams.get("ativos") === "true";

    let query = supabase
      .from("planos")
      .select("*")
      .eq("empresa_id", tenantId)
      .order("created_at", { ascending: false });

    if (apenasAtivos) {
      query = query.eq("ativo", true);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST — Criar novo plano
export async function POST(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
    if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const tenantId = sessao.empresaId;

    const body = await req.json();
    const { nome, descricao, velocidade_download, velocidade_upload, valor, tipo } = body;

    if (!nome || !velocidade_download || !velocidade_upload || !valor) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, velocidade_download, velocidade_upload, valor" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("planos")
      .insert({
        empresa_id: tenantId,
        nome,
        descricao: descricao || null,
        velocidade_download: Number(velocidade_download),
        velocidade_upload: Number(velocidade_upload),
        valor: Number(valor),
        tipo: tipo || "residencial",
        ativo: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT — Atualizar plano existente
export async function PUT(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
    if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const tenantId = sessao.empresaId;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID do plano é obrigatório" }, { status: 400 });

    delete updates.empresa_id;
    delete updates.created_at;
    delete updates.updated_at;

    const { data, error } = await supabase
      .from("planos")
      .update(updates)
      .eq("id", id)
      .eq("empresa_id", tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE — Soft delete (desativar plano)
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
    if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const tenantId = sessao.empresaId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do plano é obrigatório" }, { status: 400 });

    const { data, error } = await supabase
      .from("planos")
      .update({ ativo: false })
      .eq("id", id)
      .eq("empresa_id", tenantId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Plano desativado com sucesso", data });
  } catch (err: any) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}