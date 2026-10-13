import { NextRequest, NextResponse } from 'next/server';
import { enviarTicketResolvido } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, ticketId, assuntoTicket } = await req.json();

    if (!para || !nome || !ticketId || !assuntoTicket) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, ticketId, assuntoTicket' },
        { status: 400 }
      );
    }

    const resultado = await enviarTicketResolvido(para, nome, ticketId, assuntoTicket);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}