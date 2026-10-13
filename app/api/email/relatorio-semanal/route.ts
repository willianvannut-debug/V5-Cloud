// TESTE: Relatorio Semanal — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarRelatorioSemanal } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarRelatorioSemanal(email, 'Usuario Teste', '07/10 a 13/10/2026', {
      leadsNovos: 342,
      osAbertas: 89,
      osConcluidas: 76,
      taxaConversao: '22.8%',
    });
    return NextResponse.json({ template: 'Relatorio Semanal', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}