// app/api/debug-fix-cpf/route.ts
// TEMPORARIO - REMOVER DEPOIS
// Corrige o CPF de um cliente diretamente no banco
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/debug-fix-cpf  body: { clienteId: "UUID", cpf: "123.456.789-00" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clienteId, cpf } = body;

    if (!clienteId || !cpf) {
      return NextResponse.json({
        erro: 'Envie clienteId e cpf no body',
        exemplo: { clienteId: '6885d319-a719-4edf-809d-8dbd224a6b63', cpf: '123.456.789-00' }
      }, { status: 400 });
    }

    // Buscar cliente antes
    const { data: antes } = await supabase
      .from('clientes')
      .select('id, nome, cpf, cnpj')
      .eq('id', clienteId)
      .single();

    if (!antes) {
      return NextResponse.json({ erro: 'Cliente nao encontrado' }, { status: 404 });
    }

    // Atualizar CPF
    const { error: updateError } = await supabase
      .from('clientes')
      .update({ cpf: cpf, updated_at: new Date().toISOString() })
      .eq('id', clienteId);

    if (updateError) {
      return NextResponse.json({ erro: updateError.message }, { status: 500 });
    }

    // Buscar depois
    const { data: depois } = await supabase
      .from('clientes')
      .select('id, nome, cpf, cnpj')
      .eq('id', clienteId)
      .single();

    return NextResponse.json({
      sucesso: true,
      antes: { cpf: antes.cpf, nome: antes.nome },
      depois: { cpf: depois?.cpf, nome: depois?.nome },
      mensagem: 'CPF atualizado com sucesso! Agora o app do cliente vai mostrar o CPF correto.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
