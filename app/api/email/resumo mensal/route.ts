// TESTE: Resumo Mensal — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarResumoMensal } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarResumoMensal(email, 'Usuario Teste', 'Outubro 2026', {
      totalLeads: 1420,
      totalOS: 380,
      osConcluidas: 341,
      ticketMedio: '89,50',
      receitaTotal: '34.010,00',
      melhorTecnico: 'Carlos Silva',
    });
    return NextResponse.json({ template: 'Resumo Mensal', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}