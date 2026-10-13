// TESTE: Falha no Pagamento — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarFalhaPagamento } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarFalhaPagamento(email, 'Usuario Teste', '197,00', 'Cartao recusado pela operadora');
    return NextResponse.json({ template: 'Falha no Pagamento', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}