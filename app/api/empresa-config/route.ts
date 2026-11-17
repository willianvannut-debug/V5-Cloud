// ================================================================================
// API EMPRESA CONFIG - Endpoint PÚBLICO para white-label do app cliente
// Caminho: app/api/empresa-config/route.ts
// Retorna nome, logo, cores da empresa pelo codigo_slug
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/empresa-config?slug=4gnet
// Endpoint PÚBLICO - não precisa de autenticação
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Parâmetro "slug" é obrigatório' },
        { status: 400 }
      );
    }

    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, nome_empresa, codigo_slug, logo_url, cor_primaria, cor_secundaria, telefone_suporte')
      .eq('codigo_slug', slug.toLowerCase().trim())
      .single();

    if (error || !empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada. Verifique o código do seu provedor.' },
        { status: 404 }
      );
    }

    // Retorna apenas dados públicos (sem ID interno)
    return NextResponse.json({
      empresa_id: empresa.id,
      nome: empresa.nome_empresa,
      slug: empresa.codigo_slug,
      logo_url: empresa.logo_url || null,
      cor_primaria: empresa.cor_primaria || '#6366F1',
      cor_secundaria: empresa.cor_secundaria || '#818CF8',
      telefone_suporte: empresa.telefone_suporte || null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
