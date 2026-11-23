import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { cliente_id, codigo } = await request.json();

    if (!cliente_id || !codigo) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Cliente e código são obrigatórios.' },
        { status: 400 }
      );
    }

    // Buscar código válido (não usado e não expirado)
    const { data: registro, error } = await supabaseAdmin
      .from('codigos_verificacao')
      .select('id, email, expira_em')
      .eq('cliente_id', cliente_id)
      .eq('codigo', codigo.trim())
      .eq('usado', false)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !registro) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Código inválido ou já utilizado.' },
        { status: 400 }
      );
    }

    // Verificar se expirou
    if (new Date(registro.expira_em) < new Date()) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Código expirado. Solicite um novo código.' },
        { status: 400 }
      );
    }

    // Marcar código como usado
    await supabaseAdmin
      .from('codigos_verificacao')
      .update({ usado: true })
      .eq('id', registro.id);

    // Atualizar email e email_verificado no cliente
    const { error: erroUpdate } = await supabaseAdmin
      .from('clientes')
      .update({
        email: registro.email,
        email_verificado: true,
      })
      .eq('id', cliente_id);

    if (erroUpdate) {
      console.error('Erro ao atualizar cliente:', erroUpdate);
      return NextResponse.json(
        { sucesso: false, mensagem: 'Erro ao verificar email.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Email verificado com sucesso!',
      email: registro.email,
    });
  } catch (err) {
    console.error('ERRO ao confirmar código:', err);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
