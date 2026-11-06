// api/contratos/documentos/route.ts
// CRUD de documentos de contrato (gerados e importados)
// Caminho: app/api/contratos/documentos/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Listar documentos
export async function GET(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const tenantId = sessao.empresaId;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const busca = searchParams.get("busca");
    const id = searchParams.get("id");

    // Buscar um documento específico
    if (id) {
      const { data, error } = await supabase
        .from("documentos_contrato")
        .select("*")
        .eq("id", id)
        .eq("empresa_id", tenantId)
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    let query = supabase
      .from("documentos_contrato")
      .select("*")
      .eq("empresa_id", tenantId)
      .order("created_at", { ascending: false });

    if (status && status !== "todos") {
      query = query.eq("status", status);
    }

    if (busca) {
      query = query.or(`titulo.ilike.%${busca}%,cliente_nome.ilike.%${busca}%,cliente_documento.ilike.%${busca}%`);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — Criar documento de contrato
export async function POST(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const tenantId = sessao.empresaId;

    const body = await req.json();
    const {
      cliente_id,
      modelo_id,
      titulo,
      cliente_nome,
      cliente_documento,
      conteudo,
      status,
      tipo,
      arquivo_nome,
      arquivo_url,
      observacoes,
    } = body;

    if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

    const { data, error } = await supabase
      .from("documentos_contrato")
      .insert({
        empresa_id: tenantId,
        cliente_id: cliente_id || null,
        modelo_id: modelo_id || null,
        titulo,
        cliente_nome: cliente_nome || null,
        cliente_documento: cliente_documento || null,
        conteudo: conteudo || null,
        status: status || "rascunho",
        tipo: tipo || "gerado",
        arquivo_nome: arquivo_nome || null,
        arquivo_url: arquivo_url || null,
        observacoes: observacoes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — Atualizar documento
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
      .from("documentos_contrato")
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

// DELETE — Remover documento
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const tenantId = sessao.empresaId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });

    const { error } = await supabase
      .from("documentos_contrato")
      .delete()
      .eq("id", id)
      .eq("empresa_id", tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Documento removido" });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}