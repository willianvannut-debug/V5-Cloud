// lib/cliente-auth.ts
// Sessão do APP DO CLIENTE (separada da sessão de operador do painel).
// Usa uma chave diferente da do painel: um token de cliente nunca vale como login de operador.

import { SignJWT, jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const CHAVE = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || `${process.env.JWT_SECRET_KEY || ''}::app-cliente`
);

export type SessaoCliente = { clienteId: string; empresaId: string };

export async function assinarTokenCliente(clienteId: string, empresaId: string) {
  return new SignJWT({ emp: empresaId, tipo: 'cliente' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(clienteId)
    .setAudience('v5-app-cliente')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(CHAVE);
}

export async function getClienteDaRequisicao(req: Request): Promise<SessaoCliente | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, CHAVE, { audience: 'v5-app-cliente' });
    if (payload.tipo !== 'cliente' || !payload.sub || !payload.emp) return null;
    return { clienteId: String(payload.sub), empresaId: String(payload.emp) };
  } catch {
    return null;
  }
}

/** Remove campos que nunca devem sair do servidor. */
export function clientePublico<T extends Record<string, any>>(c: T) {
  const { senha, ...resto } = c;
  return resto;
}

export async function empresaPublica(empresaId: string) {
  const { data } = await supabaseAdmin
    .from('empresas')
    .select('id, nome_empresa, logo_url, cor_primaria, cor_secundaria, telefone_suporte')
    .eq('id', empresaId)
    .maybeSingle();
  return {
    id: empresaId,
    nome: data?.nome_empresa || 'Provedor',
    logo_url: data?.logo_url ?? null,
    cor_primaria: data?.cor_primaria ?? null,
    cor_secundaria: data?.cor_secundaria ?? null,
    telefone_suporte: data?.telefone_suporte ?? null,
  };
}

// Limite de tentativas por IP (login / primeiro acesso)
const tentativas = new Map<string, { n: number; inicio: number }>();
export function excedeuTentativas(chave: string, max = 10, janelaMs = 15 * 60_000) {
  const agora = Date.now();
  const r = tentativas.get(chave);
  if (!r || agora - r.inicio > janelaMs) { tentativas.set(chave, { n: 1, inicio: agora }); return false; }
  r.n += 1;
  return r.n > max;
}

export const ipDe = (req: Request) =>
  (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();

export function variacoesCpf(cpf: string) {
  const digitos = String(cpf || '').replace(/\D/g, '');
  const mascara = digitos.length === 11
    ? digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return Array.from(new Set([mascara, digitos, String(cpf || '').trim()].filter(Boolean)));
}
