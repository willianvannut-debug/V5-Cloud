// ============================================
// ✉️ API: ENVIAR CÓDIGO DE VERIFICAÇÃO (OTP)
// POST /api/email/verificar-email
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enviarCodigoVerificacao } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Gera código OTP de 6 dígitos
function gerarOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email, nome } = await req.json();

    if (!email || !nome) {
      return NextResponse.json(
        { mensagem: 'E-mail e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    const codigo = gerarOTP();
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // 💾 Salva o código no banco
    // Remove códigos anteriores não usados do mesmo email
    await supabase
      .from('codigos_verificacao')
      .delete()
      .eq('email', email.toLowerCase().trim())
      .eq('usado', false);

    const { error } = await supabase
      .from('codigos_verificacao')
      .insert({
        email: email.toLowerCase().trim(),
        codigo,
        expira_em: expiraEm.toISOString(),
        usado: false,
      });

    if (error) {
      console.error('Erro ao salvar código:', error);
      return NextResponse.json(
        { mensagem: 'Erro interno. Tente novamente.' },
        { status: 500 }
      );
    }

    // 📧 Envia o email com o código
    const resultado = await enviarCodigoVerificacao(email, nome, codigo);

    if (!resultado.sucesso) {
      return NextResponse.json(
        { mensagem: 'Erro ao enviar o e-mail. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Código de verificação enviado para seu e-mail.',
    });

  } catch (erro) {
    console.error('Erro na verificação de email:', erro);
    return NextResponse.json(
      { mensagem: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}