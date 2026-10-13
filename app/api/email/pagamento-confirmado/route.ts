// TESTE: Pagamento Confirmado — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarPagamentoConfirmado } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarPagamentoConfirmado(email, 'Usuario Teste', '197,00', 'PAG-2026-001234');
    return NextResponse.json({ template: 'Pagamento Confirmado', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}