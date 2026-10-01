// ================================================================================
// 🔒 ROTA DE ALTERAÇÃO DE SENHA E AVISO POR E-MAIL (RESEND)
// app/api/auth/senha/alterar/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = new TextEncoder().encode(   process.env.JWT_SECRET_KEY);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // 1. Valida a sessão para saber quem está a tentar mudar a senha
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;

    if (!token) {
      return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const emailOperador = payload.email as string;

    const body = await request.json();
    const { senhaAntiga, novaSenha } = body;

    if (!senhaAntiga || !novaSenha) {
      return NextResponse.json({ sucesso: false, mensagem: 'Preencha as duas senhas.' }, { status: 400 });
    }

    // 2. Busca o operador no banco de dados
    const { data: operador, error } = await supabaseAdmin
      .from('operadores')
      .select('id, nome, senha_hash')
      .eq('email', emailOperador)
      .single();

    if (error || !operador) {
      return NextResponse.json({ sucesso: false, mensagem: 'Operador não encontrado.' }, { status: 404 });
    }

    // 3. Verifica se a senha antiga bate com o hash criptografado no banco
    const senhaCorreta = await bcrypt.compare(senhaAntiga, operador.senha_hash);
    if (!senhaCorreta) {
      return NextResponse.json({ sucesso: false, mensagem: 'A senha antiga está incorreta.' }, { status: 400 });
    }

    // 4. Cria o hash da NOVA senha e salva no Supabase
    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    await supabaseAdmin
      .from('operadores')
      .update({ senha_hash: novaSenhaHash })
      .eq('id', operador.id);

    // 5. 🚀 ENVIA O E-MAIL DE ALERTA DE SEGURANÇA VIA RESEND
    try {
      await resend.emails.send({
        from: 'V5 Segurança <onboarding@resend.dev>', // Lembrete: mude para o seu domínio depois
        to: [emailOperador],
        subject: 'Alerta de Segurança: Sua senha foi alterada 🔐',
        html: `
          <div style="font-family: monospace; background-color: #09090b; color: #f8fafc; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e3b29;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 40px;">🔐</span>
            </div>
            
            <h2 style="color: #10b981; text-transform: uppercase; text-align: center;">Senha Alterada com Sucesso</h2>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
              Olá <strong>${operador.nome}</strong>,
            </p>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
              Informamos que a senha de acesso à sua conta na V5 Cloud foi modificada recentemente. Se foi você que realizou esta alteração, pode ignorar este e-mail tranquilamente.
            </p>
            
            <div style="background-color: #ef444415; padding: 15px; border-left: 4px solid #ef4444; margin: 25px 0;">
              <p style="margin: 0; color: #ef4444; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                ⚠️ Não reconhece esta ação?
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #f8fafc;">
                Entre em contato imediatamente com o suporte técnico para bloquearmos a sua conta e garantirmos a segurança dos seus dados.
              </p>
            </div>

            <p style="margin-top: 30px; font-size: 10px; color: #52525b; border-top: 1px dashed #1e3b29; padding-top: 15px; text-align: center;">
              V5 Cloud Security - Este é um e-mail automático.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail de segurança:", emailError);
    }

    return NextResponse.json({ sucesso: true, mensagem: 'Senha atualizada com segurança!' }, { status: 200 });

  } catch (err: any) {
    console.error("Erro na API de alterar senha:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno no servidor.' }, { status: 500 });
  }
}