// app/api/empresa-publica/route.ts
// Rota PÚBLICA: dados mínimos do provedor por slug, para as páginas abertas
// (viabilidade e download do app). Só devolve colunas seguras — nunca dados
// internos como stripe_customer_id, IP do termo, etc.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const COLUNAS = 'id, nome_empresa, slug, plano, logo_url, cor_primaria, cor_secundaria, telefone, telefone_suporte, apk_cliente_url, apk_tecnico_url, addon_iframe';

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug) return NextResponse.json({ erro: 'slug obrigatório' }, { status: 400 });
  const { data, error } = await db.from('empresas').select(COLUNAS).eq('slug', slug).limit(1).maybeSingle();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ empresa: null }, { status: 404 });
  return NextResponse.json({ empresa: data });
}
