import { NextRequest, NextResponse } from 'next/server';
import { enviarBoasVindas } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, plano } = await req.json();

    if (!para || !nome || !plano) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, plano' },
        { status: 400 }
      );
    }

    const resultado = await enviarBoasVindas(para, nome, plano);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}