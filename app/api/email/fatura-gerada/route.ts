// TESTE: Fatura Gerada — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarFaturaGerada } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarFaturaGerada(email, 'Usuario Teste', '197,00', '15/11/2026', 'https://exemplo.com/boleto');
    return NextResponse.json({ template: 'Fatura Gerada', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}