import { NextRequest, NextResponse } from 'next/server';
import { enviarPagamentoVencendo } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, valor, vencimento, diasRestantes } = await req.json();

    if (!para || !nome || !valor || !vencimento || diasRestantes === undefined) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, valor, vencimento, diasRestantes' },
        { status: 400 }
      );
    }

    const resultado = await enviarPagamentoVencendo(para, nome, valor, vencimento, diasRestantes);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}