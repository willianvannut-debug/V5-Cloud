import { NextRequest, NextResponse } from 'next/server';
import { enviarAvisoSenhaAlterada } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome } = await req.json();

    if (!para || !nome) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome' },
        { status: 400 }
      );
    }

    const resultado = await enviarAvisoSenhaAlterada(para, nome);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}