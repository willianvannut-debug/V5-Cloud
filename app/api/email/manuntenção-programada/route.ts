import { NextRequest, NextResponse } from 'next/server';
import { enviarManutencaoProgramada } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, dataInicio, dataFim, servicosAfetados } = await req.json();

    if (!para || !nome || !dataInicio || !dataFim || !servicosAfetados || !Array.isArray(servicosAfetados)) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, dataInicio, dataFim, servicosAfetados (array)' },
        { status: 400 }
      );
    }

    const resultado = await enviarManutencaoProgramada(para, nome, dataInicio, dataFim, servicosAfetados);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}