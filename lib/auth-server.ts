// lib/auth-server.ts
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY
);

export interface SessaoOperador {
  operadorId: string;
  email: string;
  role: string;
  empresaId: string;
}

export async function getEmpresaDaSessao(req: Request): Promise<SessaoOperador | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/v5_session=([^;]+)/);
    if (!match) return null;

    const token = decodeURIComponent(match[1]);
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.empresaId) return null;

    return {
      operadorId: (payload.operadorId as string) || '',
      email: (payload.email as string) || '',
      role: (payload.role as string) || 'gerente',
      empresaId: payload.empresaId as string,
    };
  } catch (err: any) {
    console.error('AUTH-SERVER ERRO:', err?.message || err);
    return null;
  }
}