// app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

// 🛡️ Lógica Unificada de Rate Limit
const ipRateLimitMap = new Map<string, { count: number; lastReset: number; blockedUntil: number }>();
const WINDOW_MS = 60 * 1000; // Janela de 1 minuto para contar tentativas
const MAX_TENTATIVAS = 5;      // Máximo de 5 tentativas por janela
const TEMPO_BLOQUEIO_MS = 2 * 60 * 1000; // Bloqueio de 2 minutos se exceder as 5 tentativas

/**
 * Função para verificar o Rate Limit e aplicar bloqueios
 */
function verificarRateLimit(ip: string): { permitido: boolean; tempoRestanteSegundos: number } {
  const agora = Date.now();
  const registro = ipRateLimitMap.get(ip);

  // Se nunca tentou, cria o registo inicial
  if (!registro) {
    ipRateLimitMap.set(ip, { count: 1, lastReset: agora, blockedUntil: 0 });
    return { permitido: true, tempoRestanteSegundos: 0 };
  }

  // Se o IP está atualmente a cumprir o castigo de bloqueio
  if (registro.blockedUntil > agora) {
    const tempoRestanteSegundos = Math.ceil((registro.blockedUntil - agora) / 1000);
    return { permitido: false, tempoRestanteSegundos };
  }

  // Se passou o tempo da janela normal e ele não estava bloqueado, reseta o contador de tentativas
  if (agora - registro.lastReset > WINDOW_MS) {
    ipRateLimitMap.set(ip, { count: 1, lastReset: agora, blockedUntil: 0 });
    return { permitido: true, tempoRestanteSegundos: 0 };
  }

  // Incrementa a tentativa
  registro.count++;

  // Se excedeu o máximo de tentativas, aplica o castigo de bloqueio
  if (registro.count >= MAX_TENTATIVAS) {
    registro.blockedUntil = agora + TEMPO_BLOQUEIO_MS;
    ipRateLimitMap.set(ip, registro);
    
    const tempoRestanteSegundos = Math.ceil((registro.blockedUntil - agora) / 1000);
    return { permitido: false, tempoRestanteSegundos };
  }

  // Salva a tentativa incrementada
  ipRateLimitMap.set(ip, registro);
  return { permitido: true, tempoRestanteSegundos: 0 };
}


/**
 * Função auxiliar para registrar LOGS no Supabase
 */
async function registrarLog(
  email: string,
  acao: string,
  nivel: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO',
  mensagem: string,
  detalhes?: Record<string, any>
) {
  try {
    const ip = detalhes?.ip || '127.0.0.1';
    
    await supabaseAdmin.from('logs_sistema').insert([
      {
        nivel,
        acao: acao.toUpperCase(),
        entidade: 'autenticacao',
        mensagem,
        operador_email: email,
        ip,
        detalhes: detalhes || {},
        timestamp: new Date().toISOString(),
        criado_em: new Date().toISOString(),
      }
    ]);
  } catch (erro) {
    console.error('Erro ao registrar log:', erro);
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    // 🛡️ 1. Verificar Rate Limit no início do request
    const rateLimit = verificarRateLimit(ip);

    if (!rateLimit.permitido) {
      await registrarLog('desconhecido', 'TENTATIVA_LOGIN_BLOQUEADA', 'WARNING', 
        `IP bloqueado por múltiplas tentativas`, 
        { ip, tempoBloqueioRestante: rateLimit.tempoRestanteSegundos }
      );

      return NextResponse.json(
        { sucesso: false, mensagem: `Muitas tentativas. Tente em ${rateLimit.tempoRestanteSegundos}s.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json({ sucesso: false, mensagem: 'Preencha todos os campos.' }, { status: 400 });
    }

    const emailLimpo = email.trim().toLowerCase();

    // 2. Busca o operador
    const { data: operador, error } = await supabaseAdmin
      .from('operadores')
      .select('*')
      .eq('email', emailLimpo)
      .single();

    if (error || !operador) {
      await registrarLog(emailLimpo, 'TENTATIVA_LOGIN_EMAIL_INVALIDO', 'WARNING',
        'Tentativa de login com e-mail não cadastrado',
        { ip, emailTentativa: emailLimpo }
      );
      
      return NextResponse.json(
        { sucesso: false, mensagem: 'E-mail ou senha inválidos.' },
        { status: 400 }
      );
    }

    const senhaCorreta = await bcrypt.compare(senha, operador.senha_hash);

    if (!senhaCorreta) {
      await registrarLog(emailLimpo, 'TENTATIVA_LOGIN_SENHA_INCORRETA', 'WARNING',
        'Tentativa de login com senha incorreta',
        { ip }
      );

      return NextResponse.json(
        { sucesso: false, mensagem: 'E-mail ou senha inválidos.' },
        { status: 400 }
      );
    }

    // 3. Login bem-sucedido: Limpa as falhas do IP
    ipRateLimitMap.delete(ip);

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
      maxAge: 60 * 60 * 8,
    });

    await registrarLog(operador.email, 'LOGIN_SUCESSO', 'SUCCESS',
      'Operador fez login no sistema',
      { 
        ip, 
        operadorId: operador.id,
        empresaId: operador.empresa_id,
        role: operador.role 
      }
    );

    let empresaNome = 'V5 Fibra Enterprise';
    if (operador.empresa_id) {
      const { data: empresa } = await supabaseAdmin
        .from('empresas')
        .select('nome_empresa')
        .eq('id', operador.empresa_id)
        .single();

      if (empresa) empresaNome = empresa.nome_empresa;
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Login aprovado!',
      operador: {
        nome: operador.nome,
        email: operador.email,
        role: operador.role || 'gerente',
        empresaNome,
      },
    });

  } catch (err: any) {
    console.error("ERRO NO LOGIN:", err);

    await registrarLog('desconhecido', 'ERRO_LOGIN_SERVIDOR', 'ERROR',
      'Erro interno no servidor de login',
      { 
        ip, 
        erro: err.message,
        stack: err.stack?.slice(0, 200)
      }
    );

    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}