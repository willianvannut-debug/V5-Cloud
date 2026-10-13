// ============================================
// 🔑 API: SOLICITAR RECUPERAÇÃO DE SENHA
// POST /api/email/recuperar-senha
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { enviarRecuperacaoSenha } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { mensagem: 'E-mail é obrigatório.' },
        { status: 400 }
      );
    }

    // 🔍 Busca o operador pelo e-mail
    const { data: operador } = await supabase
      .from('operadores')
      .select('id, nome, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    // ⚠️ SEGURANÇA: Sempre retorna sucesso, mesmo se o email não existir.
    // Isso evita que atacantes descubram quais emails estão cadastrados.
    if (!operador) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Se o e-mail estiver cadastrado, você receberá o link de recuperação.',
      });
    }

    // 🔐 Gera token seguro + expiração de 30 minutos
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    // 💾 Salva o token no banco (tabela de tokens de recuperação)
    const { error: erroToken } = await supabase
      .from('tokens_recuperacao_senha')
      .insert({
        operador_id: operador.id,
        token: token,
        email: operador.email,
        expira_em: expiraEm.toISOString(),
        usado: false,
      });

    if (erroToken) {
      console.error('Erro ao salvar token:', erroToken);
      return NextResponse.json(
        { mensagem: 'Erro interno. Tente novamente.' },
        { status: 500 }
      );
    }

    // 📧 Envia o e-mail com o link de redefinição
    const resultado = await enviarRecuperacaoSenha(
      operador.email,
      operador.nome,
      token
    );

    if (!resultado.sucesso) {
      console.error('Erro ao enviar email:', resultado.erro);
      return NextResponse.json(
        { mensagem: 'Erro ao enviar o e-mail. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Se o e-mail estiver cadastrado, você receberá o link de recuperação.',
    });

  } catch (erro) {
    console.error('❌ ERRO DETALHADO:', erro);
    console.error('❌ STACK:', (erro as Error).stack);
    return NextResponse.json(
      { mensagem: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
