import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Rate limiting: máximo 5 envios por hora por IP
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const MAX_ENVIOS = 5;
const WINDOW_MS = 60 * 60 * 1000;

setInterval(() => {
  const agora = Date.now();
  for (const [ip, reg] of rateLimitMap.entries()) {
    if (agora - reg.windowStart > WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, WINDOW_MS);

function checarRateLimit(ip: string): { bloqueado: boolean; minutosRestantes: number } {
  const agora = Date.now();
  const reg = rateLimitMap.get(ip);
  if (!reg || agora - reg.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: agora });
    return { bloqueado: false, minutosRestantes: 0 };
  }
  if (reg.count >= MAX_ENVIOS) {
    const minutosRestantes = Math.ceil((WINDOW_MS - (agora - reg.windowStart)) / 60000);
    return { bloqueado: true, minutosRestantes };
  }
  reg.count++;
  return { bloqueado: false, minutosRestantes: 0 };
}

function gerarCodigo6Digitos(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const rl = checarRateLimit(ip);
  if (rl.bloqueado) {
    return NextResponse.json(
      { sucesso: false, mensagem: `Muitas tentativas. Tente novamente em ${rl.minutosRestantes} minuto(s).` },
      { status: 429 }
    );
  }

  try {
    const { cliente_id, email } = await request.json();

    if (!cliente_id || !email) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Cliente e email são obrigatórios.' },
        { status: 400 }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Formato de email inválido.' },
        { status: 400 }
      );
    }

    // Verificar se o cliente existe
    const { data: cliente, error: erroCliente } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, empresa_id')
      .eq('id', cliente_id)
      .maybeSingle();

    if (erroCliente || !cliente) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Cliente não encontrado.' },
        { status: 404 }
      );
    }

    // Buscar nome da empresa para o email
    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('nome_empresa')
      .eq('id', cliente.empresa_id)
      .maybeSingle();

    const nomeEmpresa = empresa?.nome_empresa || 'seu provedor';

    // Invalidar códigos anteriores não usados
    await supabaseAdmin
      .from('codigos_verificacao')
      .update({ usado: true })
      .eq('cliente_id', cliente_id)
      .eq('usado', false);

    // Gerar novo código
    const codigo = gerarCodigo6Digitos();

    // Salvar código no banco
    const { error: erroCodigo } = await supabaseAdmin
      .from('codigos_verificacao')
      .insert({
        cliente_id,
        email: email.trim().toLowerCase(),
        codigo,
        usado: false,
        expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (erroCodigo) {
      console.error('Erro ao salvar código:', erroCodigo);
      return NextResponse.json(
        { sucesso: false, mensagem: 'Erro ao gerar código de verificação.' },
        { status: 500 }
      );
    }

    // Enviar email via Resend
    try {
      await resend.emails.send({
        from: `${nomeEmpresa} <onboarding@resend.dev>`,
        to: [email.trim().toLowerCase()],
        subject: `Seu código de verificação: ${codigo}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 460px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
              <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px;">Código de verificação</h2>
              <p style="color: #64748b; font-size: 14px; margin: 0 0 32px; line-height: 1.5;">
                Olá <strong>${cliente.nome}</strong>, use o código abaixo para verificar seu email no app de ${nomeEmpresa}:
              </p>

              <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: monospace;">
                  ${codigo}
                </span>
              </div>

              <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                Este código expira em <strong>10 minutos</strong>. Se você não solicitou este código, ignore este email.
              </p>
            </div>
          </div>
        `,
      });

      console.log(`✅ Código de verificação enviado para ${email}`);
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      return NextResponse.json(
        { sucesso: false, mensagem: 'Erro ao enviar email. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Código enviado para o email informado.',
    });
  } catch (err) {
    console.error('ERRO ao enviar código:', err);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
