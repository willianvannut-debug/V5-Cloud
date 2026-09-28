// app/api/auth/verificar-codigo/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, token } = await req.json();

    if (!email || !token) {
      return NextResponse.json({ erro: 'E-mail e código são obrigatórios.' }, { status: 400 });
    }

    // 1. Busca o código na tabela
    const { data, error } = await supabaseAdmin
      .from('codigos_otp')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return NextResponse.json({ erro: 'Código não encontrado ou expirado.' }, { status: 400 });
    }

    // 2. Valida se o código confere e se não expirou
    if (data.codigo !== token) {
      return NextResponse.json({ erro: 'Código incorreto.' }, { status: 400 });
    }

    if (new Date() > new Date(data.expira_em)) {
      return NextResponse.json({ erro: 'Este código já expirou. Solicite um novo.' }, { status: 400 });
    }

    // 3. Código válido! Removemos o código da tabela para ser de uso único
    await supabaseAdmin.from('codigos_otp').delete().eq('email', email);

    return NextResponse.json({ sucesso: true, mensagem: 'E-mail verificado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao verificar OTP:', error);
    return NextResponse.json({ erro: 'Falha interna ao validar código.', detalhes: error.message }, { status: 500 });
  }
}