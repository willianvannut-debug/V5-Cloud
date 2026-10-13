// ============================================
// ✅ API: CONFIRMAR CÓDIGO OTP
// POST /api/email/confirmar-codigo
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, codigo } = await req.json();

    if (!email || !codigo) {
      return NextResponse.json(
        { mensagem: 'E-mail e código são obrigatórios.' },
        { status: 400 }
      );
    }

    // 🔍 Busca o código no banco
    const { data: registro, error } = await supabase
      .from('codigos_verificacao')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('codigo', codigo)
      .eq('usado', false)
      .single();

    if (error || !registro) {
      return NextResponse.json(
        { mensagem: 'Código inválido ou já utilizado.' },
        { status: 400 }
      );
    }

    // ⏱ Verifica expiração
    if (new Date(registro.expira_em) < new Date()) {
      await supabase
        .from('codigos_verificacao')
        .update({ usado: true })
        .eq('id', registro.id);

      return NextResponse.json(
        { mensagem: 'Código expirado. Solicite um novo.' },
        { status: 400 }
      );
    }

    // ✅ Marca como usado
    await supabase
      .from('codigos_verificacao')
      .update({ usado: true })
      .eq('id', registro.id);

    return NextResponse.json({
      sucesso: true,
      mensagem: 'E-mail verificado com sucesso!',
    });

  } catch (erro) {
    console.error('Erro ao confirmar código:', erro);
    return NextResponse.json(
      { mensagem: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}