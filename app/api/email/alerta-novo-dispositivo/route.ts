// TESTE: Alerta de Novo Dispositivo — REMOVA ANTES DO DEPLOY!
import { NextRequest, NextResponse } from 'next/server';
import { enviarAlertaNovoDispositivo } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ mensagem: 'Envie {"email": "seu@email.com"}' }, { status: 400 });

    const resultado = await enviarAlertaNovoDispositivo(email, 'Usuario Teste', 'Chrome no Windows 11', 'Sao Paulo, SP', '189.45.123.78');
    return NextResponse.json({ template: 'Alerta Novo Dispositivo', ...resultado });
  } catch (erro) {
    return NextResponse.json({ mensagem: 'Erro no teste.', erro: String(erro) }, { status: 500 });
  }
}