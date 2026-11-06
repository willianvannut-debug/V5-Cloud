// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

declare global {
  namespace Express {
    interface Request {
      empresaId?: string;
      operadorId?: string;
      operadorRole?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Fallback: header do proxy
    const empresaIdHeader = req.headers['x-empresa-id'] as string;
    if (empresaIdHeader) {
      req.empresaId = empresaIdHeader;
      req.operadorId = (req.headers['x-operador-id'] as string) || '';
      req.operadorRole = (req.headers['x-operador-role'] as string) || '';
      return next();
    }

    // Lê o JWT do cookie
    const token = req.cookies?.v5_session;
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.empresaId) {
      return res.status(401).json({ error: 'Sessão inválida' });
    }

    req.empresaId = payload.empresaId as string;
    req.operadorId = (payload.operadorId as string) || '';
    req.operadorRole = (payload.role as string) || '';

    next();
  } catch (err: any) {
    console.log('AUTH ERRO:', err?.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
}