// middleware.ts
// Protege o painel, a área do técnico e as APIs internas.
// Rotas de API públicas (site, app do cliente, webhooks, cron) passam direto
// e fazem a própria validação dentro da rota.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

// [prefixo, métodos permitidos sem login de operador] — '*' = todos
const API_PUBLICAS: [string, string[] | '*'][] = [
  ['/api/auth/', '*'],                        // login, registro, códigos
  ['/api/webhook/', '*'],                     // Stripe / MikroTik (assinatura própria)
  ['/api/empresa-config/por-cpf', '*'],       // app do cliente: descobrir o provedor
  ['/api/cliente/', '*'],                     // app do cliente (rotas validam o token do cliente)
  ['/api/viabilidade/', ['POST']],            // página pública de viabilidade
  ['/api/checkout', ['POST']],                // assinatura de novos provedores (/precos, /planos)
  ['/api/email/recuperar-senha', ['POST']],   // "esqueci minha senha"
  ['/api/notificacoes/cron', ['GET']],        // Vercel Cron (valida CRON_SECRET)
  ['/api/health', ['GET']],
];

function apiPublica(pathname: string, method: string) {
  return API_PUBLICAS.some(([prefixo, metodos]) =>
    (pathname === prefixo.replace(/\/$/, '') || pathname.startsWith(prefixo)) &&
    (metodos === '*' || metodos.includes(method))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ehApi = pathname.startsWith('/api/');

  if (ehApi && (request.method === 'OPTIONS' || apiPublica(pathname, request.method))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('v5_session')?.value;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // cai no "não autorizado" abaixo
    }
  }

  // API responde 401 em JSON (redirecionar para /login quebra os fetch do front)
  if (ehApi) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const resposta = NextResponse.redirect(new URL('/login', request.url));
  if (token) resposta.cookies.delete('v5_session');
  return resposta;
}

export const config = {
  matcher: ['/dashboard/:path*', '/tecnico/:path*', '/api/:path*'],
};
