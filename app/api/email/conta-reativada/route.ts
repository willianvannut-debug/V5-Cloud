// TESTE: Conta Reativada — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarContaReativada } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarContaReativada(email, 'Usuario Teste');
    return NextResponse.json({ template: 'Conta Reativada', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}