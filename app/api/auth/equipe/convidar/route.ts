import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 🚀 Chave do Resend protegida via Variável de Ambiente (Segurança recomendada)
const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, cargo, empresaId, codigoEmpresa, nomeEmpresa } = body;

    if (!email || !codigoEmpresa) {
      return NextResponse.json({ sucesso: false, mensagem: 'E-mail e Código da Empresa são obrigatórios.' }, { status: 400 });
    }

    const emailLimpo = email.trim().toLowerCase();
    const codigoLimpo = codigoEmpresa.trim().toUpperCase();

    // 1. Insere o convite no Supabase
    const { error: erroDb } = await supabaseAdmin
      .from('convites_equipe')
      .insert([{
        empresa_id: empresaId || '00000000-0000-0000-0000-000000000001',
        email: emailLimpo,
        codigo_verificacao: codigoLimpo,
        status: 'PENDENTE'
      }]);

    if (erroDb) {
      console.error("ERRO DO SUPABASE NO CONVITE:", erroDb);
      return NextResponse.json({ sucesso: false, mensagem: `Erro no Banco: ${erroDb.message}` }, { status: 500 });
    }

    // 2. Disparo do e-mail via Resend
    const linkCadastro = `http://localhost:3000/register?email=${encodeURIComponent(emailLimpo)}`; 

    const { error: erroEmail } = await resend.emails.send({
      from: 'V5 Fibra Enterprise <onboarding@resend.dev>',
      to: [emailLimpo],
      subject: `Você foi convidado para a equipe ${nomeEmpresa || 'V5 Fibra'}`,
      html: `
        <div style="font-family: monospace; background-color: #0f0f11; color: #f4f4f5; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #27272a;">
          <h2 style="color: #34d399; text-transform: uppercase;">V5 Fibra Enterprise</h2>
          <p>O gerente convidou você para fazer parte do sistema como <strong>${cargo}</strong>.</p>
          <div style="background-color: #000; padding: 20px; border-radius: 8px; border: 1px dashed #34d399; margin: 25px 0;">
            <p style="margin: 0; color: #a1a1aa; font-size: 12px;">Seu Código de Acesso:</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #34d399;">${codigoLimpo}</p>
          </div>
          <p style="color: #ef4444; font-size: 14px;">⚠️ Expira em 15 minutos.</p>
          <a href="${linkCadastro}" style="display: inline-block; background-color: #10b981; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px;">Aceitar Convite</a>
        </div>
      `,
    });

    if (erroEmail) {
      console.error("ERRO DO RESEND:", erroEmail);
      return NextResponse.json({ sucesso: false, mensagem: `Erro ao enviar e-mail: ${erroEmail.message}` }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true, mensagem: `Convite enviado com sucesso para ${email}!` });

  } catch (err: any) {
    console.error("ERRO CRÍTICO NA API DE CONVITE:", err);
    return NextResponse.json({ sucesso: false, mensagem: `Erro interno: ${err.message || 'Desconhecido'}` }, { status: 500 });
  }
}