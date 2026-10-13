// TESTE: Codigo 2FA — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarCodigo2FA } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarCodigo2FA(email, 'Usuario Teste', '847293');
    return NextResponse.json({ template: 'Codigo 2FA', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}