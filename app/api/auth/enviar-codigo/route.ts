// app/api/auth/enviar-codigo/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
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

    const { error: dbError } = await supabaseAdmin
      .from('codigos_otp')
      .upsert({ email, codigo, expira_em: expiracao });

    if (dbError) {
      console.error("Erro ao guardar OTP no banco:", dbError);
      throw new Error(dbError.message);
    }

    // 🚀 ATENÇÃO: Usamos o domínio padrão do Resend para testes enquanto o teu não é verificado
    const { error: emailError } = await resend.emails.send({
      from: 'V5 Telecom <onboarding@resend.dev>', 
      to: email, // Nota: No plano gratuito do Resend, só podes enviar para o mesmo e-mail da tua conta Resend
      subject: `Seu código de verificação: ${codigo}`,
      html: `
        <div style="background-color: #0a0a0a; color: #fff; padding: 30px; font-family: monospace; border-radius: 12px; border: 1px solid #1e3b29;">
          <h2 style="color: #10b981; text-transform: uppercase;">V5 Telecom - Validação</h2>
          <p>Olá,</p>
          <p>O seu código de verificação de 6 dígitos para criar a conta corporativa é:</p>
          <div style="background: #021708; border: 1px solid #10b981; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #10b981; border-radius: 8px; margin: 20px 0;">
            ${codigo}
          </div>
          <p style="color: #71717a; font-size: 12px;">Este código expira em 15 minutos.</p>
        </div>
      `
    });

    if (emailError) {
      throw new Error(emailError.message);
    }

    return NextResponse.json({ sucesso: true, mensagem: 'Código enviado com sucesso!' });
  } catch (error: any) {
    console.error('Erro ao enviar OTP:', error);
    return NextResponse.json({ erro: 'Falha ao enviar o e-mail.', detalhes: error.message }, { status: 500 });
  }
}