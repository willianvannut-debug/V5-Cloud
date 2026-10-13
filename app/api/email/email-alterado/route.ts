import { NextRequest, NextResponse } from 'next/server';
import { enviarEmailAlterado } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, emailAntigo, emailNovo } = await req.json();

    if (!para || !nome || !emailAntigo || !emailNovo) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, emailAntigo, emailNovo' },
        { status: 400 }
      );
    }

    const resultado = await enviarEmailAlterado(para, nome, emailAntigo, emailNovo);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}