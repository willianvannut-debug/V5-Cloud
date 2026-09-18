import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Chave secreta para assinar o JWT
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

// Armazenamento em memória para Rate Limit por IP
const tentativasLogin = new Map<string, { tentativas: number; bloqueadoAte: number }>();

const LIMITE_TENTATIVAS = 5; // Máximo de 5 tentativas
const TEMPO_BLOQUEIO_MS = 2 * 60 * 1000; // ⏱️ Bloqueio ajustado para 2 minutos

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    const agora = Date.now();
    const registroIp = tentativasLogin.get(ip);

    // 1. Verificação Rigorosa de Rate Limiting
    if (registroIp) {
      // Se ainda estiver dentro do tempo de bloqueio, retorna o tempo restante SEM estender o cronômetro
      if (registroIp.bloqueadoAte > agora) {
        const segundosRestantes = Math.ceil((registroIp.bloqueadoAte - agora) / 1000);
        const minutosRestantes = Math.ceil(segundosRestantes / 60);
        const mensagemTempo = segundosRestantes < 60 
          ? `Tente novamente em ${segundosRestantes} segundo(s).` 
          : `Tente novamente em ${minutosRestantes} minuto(s).`;

        return NextResponse.json(
          { sucesso: false, mensagem: `Muitas tentativas incorretas. ${mensagemTempo}` },
          { status: 429 }
        );
      }
      
      // Se o tempo de bloqueio já passou, limpa o registro para permitir novas tentativas
      if (registroIp.bloqueadoAte > 0 && registroIp.bloqueadoAte <= agora) {
        tentativasLogin.delete(ip);
      }
    }

    const body = await request.json();
    const { email, senha, tokenCaptcha } = body;

    if (!email || !senha) {
      return NextResponse.json({ sucesso: false, mensagem: 'Preencha todos os campos.' }, { status: 400 });
    }

    // 2. Validação opcional do CAPTCHA (apenas se enviado)
    if (tokenCaptcha && process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY) {
      const captchaValido = await verificarCaptcha(tokenCaptcha);
      if (!captchaValido) {
        return NextResponse.json({ sucesso: false, mensagem: 'Falha na validação de segurança (Captcha). Tente novamente.' }, { status: 400 });
      }
    }

    const emailLimpo = email.trim().toLowerCase();
    const mensagemErroGenerica = 'E-mail ou senha inválidos.';

    // 3. Busca o operador pelo e-mail
    const { data: operador, error } = await supabaseAdmin
      .from('operadores')
      .select('*')
      .eq('email', emailLimpo)
      .single();

    if (error || !operador) {
      await registrarAuditoria(emailLimpo, 'TENTATIVA_LOGIN_FALHA', ip, 'E-mail não encontrado');
      registrarFalhaIp(ip);
      return NextResponse.json({ sucesso: false, mensagem: mensagemErroGenerica }, { status: 400 });
    }

    const senhaCorreta = await bcrypt.compare(senha, operador.senha_hash);

    if (!senhaCorreta) {
      await registrarAuditoria(emailLimpo, 'TENTATIVA_LOGIN_FALHA', ip, 'Senha incorreta');
      registrarFalhaIp(ip);
      return NextResponse.json({ sucesso: false, mensagem: mensagemErroGenerica }, { status: 400 });
    }

    // Login bem-sucedido: limpa o histórico de erros do IP
    tentativasLogin.delete(ip);

    // 4. Geração do JWT e Cookie HTTP-only seguro
    const tokenJwt = await new SignJWT({
      email: operador.email,
      role: operador.role || 'gerente',
      empresaId: operador.empresa_id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === 'production';

    cookieStore.set({
      name: 'v5_session',
      value: tokenJwt,
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 horas
    });

    // 5. Registra auditoria de sucesso
    await registrarAuditoria(operador.email, 'LOGIN_SUCESSO', ip, 'Login efetuado com sucesso');

    // 6. Busca os dados da empresa vinculada (se houver)
    let empresaNome = 'V5 Fibra Enterprise';
    let codigoConvite = '';

    if (operador.empresa_id) {
      const { data: empresa } = await supabaseAdmin
        .from('empresas')
        .select('nome_empresa, codigo_convite')
        .eq('id', operador.empresa_id)
        .single();

      if (empresa) {
        empresaNome = empresa.nome_empresa;
        codigoConvite = empresa.codigo_convite;
      }
    }

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Login aprovado!',
      operador: { 
        nome: operador.nome, 
        email: operador.email, 
        role: operador.role || 'gerente',
        empresaNome,
        codigoConvite
      } 
    });

  } catch (err: any) {
    console.error("ERRO NO LOGIN:", err);
    await registrarAuditoria('desconhecido', 'ERRO_SERVIDOR', ip, err.message);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno no servidor.' }, { status: 500 });
  }
}

// Função auxiliar para registrar falhas por IP sem estender indevidamente o bloqueio ativo
function registrarFalhaIp(ip: string) {
  const agora = Date.now();
  const registro = tentativasLogin.get(ip);
  
  if (!registro) {
    tentativasLogin.set(ip, { tentativas: 1, bloqueadoAte: 0 });
  } else {
    const novasTentativas = registro.tentativas + 1;
    const bloqueadoAte = novasTentativas >= LIMITE_TENTATIVAS ? agora + TEMPO_BLOQUEIO_MS : 0;
    tentativasLogin.set(ip, { tentativas: novasTentativas, bloqueadoAte });
  }
}

// Função auxiliar para gravar Logs de Auditoria no Supabase
async function registrarAuditoria(email: string, acao: string, ip: string, detalhes: string) {
  try {
    await supabaseAdmin.from('auditoria_logs').insert([
      { operador_email: email, acao, ip, detalhes }
    ]);
  } catch (e) {
    console.error("Erro ao gravar log de auditoria:", e);
  }
}

// Função auxiliar para validar o token do Captcha na API externa do Cloudflare Turnstile
async function verificarCaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });
    const data = await response.json();
    return data.success;
  } catch (e) {
    console.error("Erro ao verificar captcha:", e);
    return false;
  }
}