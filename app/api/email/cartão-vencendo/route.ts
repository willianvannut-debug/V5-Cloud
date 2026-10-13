import { NextRequest, NextResponse } from 'next/server';
import { enviarCartaoVencendo } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, ultimosDigitos, mesExpiracao } = await req.json();

    if (!para || !nome || !ultimosDigitos || !mesExpiracao) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, ultimosDigitos, mesExpiracao' },
        { status: 400 }
      );
    }

    const resultado = await enviarCartaoVencendo(para, nome, ultimosDigitos, mesExpiracao);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}