import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;

    if (!token) {
      return NextResponse.json({ sucesso: false, mensagem: 'Não autorizado.' }, { status: 401 });
    }

    // 1. Verifica se o usuário atual é realmente um Super Admin
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ sucesso: false, mensagem: 'Acesso negado. Apenas o Master do SaaS pode usar esta função.' }, { status: 403 });
    }

    const body = await request.json();
    const { empresaIdAlvo } = body;

    if (!empresaIdAlvo) {
      return NextResponse.json({ sucesso: false, mensagem: 'Empresa alvo não informada.' }, { status: 400 });
    }

    // 2. Busca o primeiro gerente/operador da empresa alvo para simular o acesso
    const { data: operadorAlvo } = await supabaseAdmin
      .from('operadores')
      .select('*')
      .eq('empresa_id', empresaIdAlvo)
      .limit(1)
      .single();

    if (!operadorAlvo) {
      return NextResponse.json({ sucesso: false, mensagem: 'Nenhum operador encontrado para esta empresa.' }, { status: 404 });
    }

    // 3. Gera um novo token JWT assumindo a identidade daquela empresa
    const novoToken = await new SignJWT({
      email: operadorAlvo.email,
      role: operadorAlvo.role,
      empresaId: empresaIdAlvo,
      suporteMaster: payload.email // Registra quem fez o acesso de suporte (Trilha de Auditoria)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(JWT_SECRET);

    // 4. Substitui o cookie de sessão do navegador com o token da empresa do cliente
    cookieStore.set({
      name: 'v5_session',
      value: novoToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 8 // 8 horas
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: `Acesso de suporte concedido à empresa ${empresaIdAlvo} com sucesso!` 
    });

  } catch (err: any) {
    console.error("Erro no acesso de suporte:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno ao processar suporte.' }, { status: 500 });
  }
}