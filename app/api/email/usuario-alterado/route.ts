import { NextRequest, NextResponse } from 'next/server';
import { enviarUsuarioAlterado } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nomeDono, nomeUsuario, acao, cargo } = await req.json();

    if (!para || !nomeDono || !nomeUsuario || !acao || !cargo) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nomeDono, nomeUsuario, acao (adicionado|removido), cargo' },
        { status: 400 }
      );
    }

    const resultado = await enviarUsuarioAlterado(para, nomeDono, nomeUsuario, acao, cargo);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}