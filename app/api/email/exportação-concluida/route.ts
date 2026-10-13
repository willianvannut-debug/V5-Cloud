import { NextRequest, NextResponse } from 'next/server';
import { enviarExportacaoConcluida } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, tipoRelatorio, linkDownload } = await req.json();

    if (!para || !nome || !tipoRelatorio || !linkDownload) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, tipoRelatorio, linkDownload' },
        { status: 400 }
      );
    }

    const resultado = await enviarExportacaoConcluida(para, nome, tipoRelatorio, linkDownload);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}