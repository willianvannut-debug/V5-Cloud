// api/contratos/vinculo/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getEmpresaDaSessao } from '@/lib/auth-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST — Criar contrato/vínculo
export async function POST(req: NextRequest) {
  try {
    const sessao = await getEmpresaDaSessao(req);
    if (!sessao) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const tenantId = sessao.empresaId;

    const body = await req.json();
    const {
      cliente_id,
      plano_id,
      billing_day,
      billing_type,
      start_date,
      observacoes,
    } = body;

    if (!cliente_id || !plano_id || !billing_day) {
      return NextResponse.json(
        { error: "Campos obrigatórios: cliente_id, plano_id, billing_day" },
        { status: 400 }
      );
    }

    const { data: cliente, error: errCliente } = await supabase
      .from("clientes")
      .select("id, nome, cpf_cnpj, email, telefone")
      .eq("id", cliente_id)
      .eq("empresa_id", tenantId)
      .single();

    if (errCliente || !cliente) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    const { data: plano, error: errPlano } = await supabase
      .from("planos")
      .select("id, nome, valor")
      .eq("id", plano_id)
      .eq("empresa_id", tenantId)
      .eq("ativo", true)
      .single();

    if (errPlano || !plano) {
      return NextResponse.json({ error: "Plano não encontrado ou inativo" }, { status: 404 });
    }

    const { data: gateway } = await supabase
      .from("gateway_configs")
      .select("id")
      .eq("empresa_id", tenantId)
      .eq("provider", "widepay")
      .eq("is_active", true)
      .single();

    const inicio = start_date ? new Date(start_date) : new Date();
    const nextBilling = calcularProximoVencimento(inicio, billing_day);

    const contrato = {
      empresa_id: tenantId,
      cliente_id: cliente.id,
      plano_id: plano.id,
      customer_name: cliente.nome,
      customer_document: cliente.cpf_cnpj || null,
      customer_email: cliente.email || null,
      customer_phone: cliente.telefone || null,
      plan_name: plano.nome,
      amount: plano.valor,
      billing_day: Number(billing_day),
      billing_type: billing_type || "BOLETO",
      status: "active",
      start_date: inicio.toISOString().split("T")[0],
      next_billing_date: nextBilling,
      gateway_id: gateway?.id || null,
      provider: "widepay",
      observacoes: observacoes || null,
    };

    const { data, error } = await supabase
      .from("contratos")
      .insert(contrato)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

function calcularProximoVencimento(dataInicio: Date, diaVencimento: number): string {
  const hoje = new Date();
  let ano = hoje.getFullYear();
  let mes = hoje.getMonth();

  if (hoje.getDate() > diaVencimento) {
    mes += 1;
  }

  if (mes > 11) {
    mes = 0;
    ano += 1;
  }

  const data = new Date(ano, mes, diaVencimento);
  return data.toISOString().split("T")[0];
}