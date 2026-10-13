import { NextRequest, NextResponse } from 'next/server';
import { enviarAlteracaoDadosEmpresa } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { para, nome, camposAlterados } = await req.json();

    if (!para || !nome || !camposAlterados || !Array.isArray(camposAlterados)) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatorios: para, nome, camposAlterados (array de strings)' },
        { status: 400 }
      );
    }

    const resultado = await enviarAlteracaoDadosEmpresa(para, nome, camposAlterados);
    return NextResponse.json(resultado);
  } catch (erro) {
    return NextResponse.json(
      { mensagem: 'Erro ao enviar email.', erro: String(erro) },
      { status: 500 }
    );
  }
}