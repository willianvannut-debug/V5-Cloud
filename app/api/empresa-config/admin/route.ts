// ================================================================================
// API EMPRESA CONFIG ADMIN - GET/PATCH dados white-label da empresa logada
// Caminho: app/api/empresa-config/admin/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

async function getSession(request: NextRequest) {
  const cookie = request.cookies.get('v5_session');
  if (cookie?.value) {
    try {
      const { payload } = await jwtVerify(cookie.value, JWT_SECRET);
      return { empresaId: payload.empresaId as string, role: payload.role as string };
    } catch {}
  }
  return null;
}

// GET - Buscar config white-label da empresa logada
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('empresas')
      .select('nome_empresa, codigo_slug, logo_url, cor_primaria, cor_secundaria, telefone_suporte')
      .eq('id', session.empresaId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH - Atualizar config white-label
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.role !== 'gerente' && session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const update: any = {};

    if (body.codigo_slug !== undefined) {
      const slug = body.codigo_slug.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      if (!slug) return NextResponse.json({ error: 'Código do provedor inválido' }, { status: 400 });

      // Verificar se slug já existe em outra empresa
      const { data: existe } = await supabase
        .from('empresas')
        .select('id')
        .eq('codigo_slug', slug)
        .neq('id', session.empresaId)
        .single();

      if (existe) {
        return NextResponse.json({ error: 'Esse código já está sendo usado por outra empresa' }, { status: 409 });
      }
      update.codigo_slug = slug;
    }

    if (body.cor_primaria !== undefined) update.cor_primaria = body.cor_primaria;
    if (body.cor_secundaria !== undefined) update.cor_secundaria = body.cor_secundaria;
    if (body.telefone_suporte !== undefined) update.telefone_suporte = body.telefone_suporte;

    const { data, error } = await supabase
      .from('empresas')
      .update(update)
      .eq('id', session.empresaId)
      .select('nome_empresa, codigo_slug, logo_url, cor_primaria, cor_secundaria, telefone_suporte')
      .single();

    if (error) return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
