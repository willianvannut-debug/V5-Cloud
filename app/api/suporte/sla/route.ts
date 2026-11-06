import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — listar configurações de SLA da empresa
export async function GET(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const ordem = ["urgente", "alta", "media", "baixa"];
  const { data, error } = await supabase
    .from("sla_config")
    .select("*")
    .eq("empresa_id", empresaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ordenar pela prioridade
  const sorted = (data || []).sort(
    (a, b) => ordem.indexOf(a.prioridade) - ordem.indexOf(b.prioridade)
  );

  return NextResponse.json(sorted);
}

// PUT — atualizar SLA de uma prioridade
export async function PUT(req: NextRequest) {
  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const empresaId = sessao.empresaId;

  const body = await req.json();
  const { id, horas_resposta, horas_resolucao } = body;

  if (!id) return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  if (horas_resposta < 1 || horas_resolucao < 1) {
    return NextResponse.json({ error: "Horas devem ser >= 1" }, { status: 400 });
  }
  if (horas_resposta >= horas_resolucao) {
    return NextResponse.json(
      { error: "Prazo de resposta deve ser menor que o de resolução" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("sla_config")
    .update({ horas_resposta, horas_resolucao })
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}