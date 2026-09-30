// app/api/auth/enviar-codigo/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ erro: 'E-mail obrigatório.' }, { status: 400 });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracao = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Guarda o código na base de dados para manter a integridade do fluxo
    const { error: dbError } = await supabaseAdmin
      .from('codigos_otp')
      .upsert({ email, codigo, expira_em: expiracao });

    if (dbError) {
      console.error("Erro ao guardar OTP no banco:", dbError);
      throw new Error(dbError.message);
    }

    // 🚀 Envio de e-mail desativado por completo. O código gerado pode ser consultado na base de dados (tabela codigos_otp) se precisar testar.
    console.log(`[MODO SEM E-MAIL] Código OTP gerado para ${email}: ${codigo}`);

    return NextResponse.json({ sucesso: true, mensagem: 'Código gerado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao processar OTP:', error);
    return NextResponse.json({ erro: 'Falha ao processar o código.', detalhes: error.message }, { status: 500 });
  }
}