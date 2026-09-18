import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

export async function gerarTokenSessao(payload: { email: string; role: string; empresaId?: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h') // Sessão expira em 8 horas
    .sign(JWT_SECRET);

  return token;
}

export async function definirCookieSessao(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: 'v5_session',
    value: token,
    httpOnly: true, // Invisível para o JavaScript do navegador (Proteção XSS absoluta)
    secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em produção
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  });
}

export async function verificarTokenSessao(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}