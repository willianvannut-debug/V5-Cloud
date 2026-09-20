// middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

export async function middleware(request: NextRequest) {
  const cookieSessao = request.cookies.get('v5_session');

  // Se não tem o cookie, loga e redireciona
  if (!cookieSessao?.value) {
    console.log("Middleware: Cookie 'v5_session' não encontrado. Redirecionando para login.");
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Tenta validar o token JWT
    await jwtVerify(cookieSessao.value, JWT_SECRET);
    return NextResponse.next();
  } catch (err: any) {
    // Loga o erro exato no terminal do Next.js para sabermos o motivo da rejeição
    console.error("Middleware: Falha ao verificar o JWT do cookie:", err.message);
    
    const respostaRedirecionamento = NextResponse.redirect(new URL('/login', request.url));
    respostaRedirecionamento.cookies.delete('v5_session');
    return respostaRedirecionamento;
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};