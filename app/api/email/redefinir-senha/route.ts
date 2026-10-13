// ============================================
// 🔐 API: REDEFINIR SENHA (Processar o token)
// POST /api/email/redefinir-senha
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { enviarAvisoSenhaAlterada } from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { token, novaSenha } = await req.json();

    if (!token || !novaSenha) {
      return NextResponse.json(
        { mensagem: 'Token e nova senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validação de força da senha
    if (novaSenha.length < 8) {
      return NextResponse.json(
        { mensagem: 'A senha deve ter pelo menos 8 caracteres.' },
        { status: 400 }
      );
    }

    // 🔍 Busca o token no banco
    const { data: tokenData, error: erroToken } = await supabase
      .from('tokens_recuperacao_senha')
      .select('*')
      .eq('token', token)
      .eq('usado', false)
      .single();

    if (erroToken || !tokenData) {
      return NextResponse.json(
        { mensagem: 'Link inválido ou já utilizado.' },
        { status: 400 }
      );
    }

    // ⏱ Verifica se expirou
    if (new Date(tokenData.expira_em) < new Date()) {
      // Marca como usado para não poder ser reutilizado
      await supabase
        .from('tokens_recuperacao_senha')
        .update({ usado: true })
        .eq('id', tokenData.id);

      return NextResponse.json(
        { mensagem: 'Link expirado. Solicite uma nova recuperação de senha.' },
        { status: 400 }
      );
    }

    // 🔒 Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 12);

    // 💾 Atualiza a senha do operador
    const { error: erroUpdate } = await supabase
      .from('operadores')
      .update({ senha: senhaHash })
      .eq('id', tokenData.operador_id);

    if (erroUpdate) {
      console.error('Erro ao atualizar senha:', erroUpdate);
      return NextResponse.json(
        { mensagem: 'Erro ao atualizar a senha. Tente novamente.' },
        { status: 500 }
      );
    }

    // ✅ Marca o token como usado
    await supabase
      .from('tokens_recuperacao_senha')
      .update({ usado: true })
      .eq('id', tokenData.id);

    // 🗑️ Invalida TODOS os tokens pendentes desse operador (segurança extra)
    await supabase
      .from('tokens_recuperacao_senha')
      .update({ usado: true })
      .eq('operador_id', tokenData.operador_id)
      .eq('usado', false);

    // 📧 Envia aviso de que a senha foi alterada
    const { data: operador } = await supabase
      .from('operadores')
      .select('nome, email')
      .eq('id', tokenData.operador_id)
      .single();

    if (operador) {
      await enviarAvisoSenhaAlterada(operador.email, operador.nome);
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Senha alterada com sucesso! Faça login com sua nova senha.',
    });

  } catch (erro) {
    console.error('Erro ao redefinir senha:', erro);
    return NextResponse.json(
      { mensagem: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}