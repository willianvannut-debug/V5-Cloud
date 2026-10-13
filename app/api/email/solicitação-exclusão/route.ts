import { NextRequest, NextResponse } from 'next/server';
import { enviarSolicitacaoExclusao } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, prazoExclusao, linkCancelar } = await req.json();

    if (!para || !nome || !prazoExclusao || !linkCancelar) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, prazoExclusao, linkCancelar' },
        { status: 400 }
      );
    }

    const resultado = await enviarSolicitacaoExclusao(para, nome, prazoExclusao, linkCancelar);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}