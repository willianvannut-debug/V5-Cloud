import { NextRequest, NextResponse } from 'next/server';
import { enviarTicketAtualizado } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, ticketId, novoStatus, mensagem } = await req.json();

    if (!para || !nome || !ticketId || !novoStatus || !mensagem) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, ticketId, novoStatus, mensagem' },
        { status: 400 }
      );
    }

    const resultado = await enviarTicketAtualizado(para, nome, ticketId, novoStatus, mensagem);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}