// app/api/debug-cliente/route.ts
// TEMPORARIO - REMOVER DEPOIS
// Diagnostica: CPF do cliente e faturas vinculadas
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get('clienteId');
    const cpf = searchParams.get('cpf');

    if (!clienteId && !cpf) {
      return NextResponse.json({
        uso: 'GET /api/debug-cliente?clienteId=UUID ou ?cpf=12345678900',
        descricao: 'Passa clienteId (UUID) ou cpf (com ou sem mascara) para diagnosticar'
      });
    }

    // 1. Buscar o cliente
    let cliente = null;
    if (clienteId) {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, cpf, cnpj, email, telefone, status, tipo_pessoa, updated_at')
        .eq('id', clienteId)
        .single();
      cliente = data;
    } else if (cpf) {
      const cpfLimpo = cpf.replace(/\D/g, '');
      // Tentar todas as formas
      const { data: lista } = await supabase
        .from('clientes')
        .select('id, nome, cpf, cnpj, email, telefone, status, tipo_pessoa, updated_at')
        .or(`cpf.ilike.%${cpfLimpo}%,cnpj.ilike.%${cpfLimpo}%`);
      cliente = lista?.[0] || null;
    }

    if (!cliente) {
      return NextResponse.json({
        erro: 'Cliente nao encontrado',
        buscou_por: clienteId ? { clienteId } : { cpf }
      }, { status: 404 });
    }

    // 2. Buscar faturas vinculadas a esse cliente (por cliente_id)
    const { data: faturasPorId } = await supabase
      .from('faturas')
      .select('id, cliente_id, customer_name, customer_document, status, amount, due_date, gateway_id, created_at')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. Buscar faturas pelo CPF do cliente (customer_document)
    const cpfCliente = (cliente.cpf || '').replace(/\D/g, '');
    let faturasPorCpf: any[] = [];
    if (cpfCliente) {
      const { data } = await supabase
        .from('faturas')
        .select('id, cliente_id, customer_name, customer_document, status, amount, due_date, gateway_id, created_at')
        .or(`customer_document.ilike.%${cpfCliente}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      faturasPorCpf = data || [];
    }

    // 4. Buscar faturas com CPF 999.999.999-99 (o CPF antigo de teste)
    const { data: faturasComCpfAntigo } = await supabase
      .from('faturas')
      .select('id, cliente_id, customer_name, customer_document, status, amount, due_date, gateway_id, created_at')
      .or('customer_document.ilike.%99999999999%,customer_document.ilike.%999.999.999-99%')
      .order('created_at', { ascending: false })
      .limit(10);

    // 5. Diagnostico
    const problemas: string[] = [];

    if (!cliente.cpf || cliente.cpf.replace(/\D/g, '') === '99999999999') {
      problemas.push('CPF DO CLIENTE AINDA E 999.999.999-99 NO BANCO! O update nao salvou.');
    }

    if ((faturasPorId || []).length === 0 && faturasPorCpf.length === 0) {
      problemas.push('NENHUMA FATURA encontrada para esse cliente (nem por ID, nem por CPF).');
    }

    const faturasSemClienteId = [...(faturasPorCpf || [])].filter(f => !f.cliente_id);
    if (faturasSemClienteId.length > 0) {
      problemas.push(`${faturasSemClienteId.length} fatura(s) encontrada(s) por CPF mas SEM cliente_id vinculado.`);
    }

    if ((faturasComCpfAntigo || []).length > 0) {
      problemas.push(`${(faturasComCpfAntigo || []).length} fatura(s) ainda com CPF antigo 999.999.999-99 no customer_document.`);
    }

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        cpf_no_banco: cliente.cpf,
        cnpj_no_banco: cliente.cnpj,
        email: cliente.email,
        status: cliente.status,
        tipo_pessoa: cliente.tipo_pessoa,
        updated_at: cliente.updated_at,
      },
      faturas_por_cliente_id: (faturasPorId || []).map(f => ({
        id: f.id,
        cliente_id: f.cliente_id,
        customer_document: f.customer_document,
        customer_name: f.customer_name,
        status: f.status,
        amount: f.amount,
        due_date: f.due_date,
        gateway_id: f.gateway_id,
      })),
      faturas_por_cpf_atual: faturasPorCpf.map(f => ({
        id: f.id,
        cliente_id: f.cliente_id,
        customer_document: f.customer_document,
        customer_name: f.customer_name,
        status: f.status,
        amount: f.amount,
      })),
      faturas_com_cpf_antigo_999: (faturasComCpfAntigo || []).map(f => ({
        id: f.id,
        cliente_id: f.cliente_id,
        customer_document: f.customer_document,
        customer_name: f.customer_name,
        status: f.status,
      })),
      DIAGNOSTICO: problemas.length > 0 ? problemas : ['TUDO OK - cliente e faturas parecem corretos'],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
