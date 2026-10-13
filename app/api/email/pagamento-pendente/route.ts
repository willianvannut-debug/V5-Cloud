import { NextRequest, NextResponse } from 'next/server';
import { enviarPagamentoPendente } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, valor, vencimento } = await req.json();

    if (!para || !nome || !valor || !vencimento) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, valor, vencimento' },
        { status: 400 }
      );
    }

    const resultado = await enviarPagamentoPendente(para, nome, valor, vencimento);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}