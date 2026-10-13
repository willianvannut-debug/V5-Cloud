import { NextRequest, NextResponse } from 'next/server';
import { enviarTentativaCobranca } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, valor, tentativa, proximaTentativa } = await req.json();

    if (!para || !nome || !valor || !tentativa || !proximaTentativa) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, valor, tentativa, proximaTentativa' },
        { status: 400 }
      );
    }

    const resultado = await enviarTentativaCobranca(para, nome, valor, tentativa, proximaTentativa);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}