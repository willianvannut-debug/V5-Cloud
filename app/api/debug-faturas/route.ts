// app/api/debug-faturas/route.ts
// TEMPORARIO - REMOVER DEPOIS
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Ultimas 5 faturas criadas
    const { data: ultimas, error: e1 } = await supabase
      .from('faturas')
      .select('id, cliente_id, customer_name, customer_document, status, gateway_id, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

    // Para cada fatura, verificar se o cliente_id bate com um cliente real
    const diagnostico = [];
    for (const f of (ultimas || [])) {
      let clienteEncontrado = null;
      if (f.cliente_id) {
        const { data: cl } = await supabase
          .from('clientes')
          .select('id, nome, cpf, cnpj')
          .eq('id', f.cliente_id)
          .single();
        clienteEncontrado = cl;
      }

      // Buscar por CPF tambem
      const docLimpo = (f.customer_document || '').replace(/\D/g, '');
      let clientePorCpf = null;
      if (docLimpo) {
        const { data: cls } = await supabase
          .from('clientes')
          .select('id, nome, cpf')
          .or(`cpf.ilike.%${docLimpo}%,cnpj.ilike.%${docLimpo}%`)
          .limit(1);
        clientePorCpf = cls?.[0] || null;
      }

      diagnostico.push({
        fatura_id: f.id,
        cliente_id_na_fatura: f.cliente_id,
        customer_name: f.customer_name,
        customer_document: f.customer_document,
        status: f.status,
        gateway_id: f.gateway_id,
        amount: f.amount,
        created_at: f.created_at,
        cliente_encontrado_por_id: clienteEncontrado ? { id: clienteEncontrado.id, nome: clienteEncontrado.nome } : null,
        cliente_encontrado_por_cpf: clientePorCpf ? { id: clientePorCpf.id, nome: clientePorCpf.nome, cpf: clientePorCpf.cpf } : null,
        PROBLEMA: !f.cliente_id ? 'SEM CLIENTE_ID!' : (!clienteEncontrado ? 'CLIENTE_ID NAO EXISTE NA TABELA CLIENTES!' : 'OK'),
      });
    }

    return NextResponse.json({ diagnostico }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
