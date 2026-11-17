// ================================================================================
// API UPLOAD LOGO - Faz upload da logo da empresa no Supabase Storage
// Caminho: app/api/empresa-config/upload-logo/route.ts
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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (session.role !== 'gerente' && session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Apenas imagens' }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Máximo 2MB' }, { status: 400 });

    // Nome do arquivo: empresa_id + extensão
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${session.empresaId}/logo.${ext}`;

    // Converter para buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload para Supabase Storage (bucket "logos")
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // Sobrescrever se já existir
      });

    if (uploadError) {
      console.error('Erro upload:', uploadError);
      return NextResponse.json({ error: 'Erro no upload' }, { status: 500 });
    }

    // Pegar URL pública
    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    const logoUrl = urlData.publicUrl;

    // Atualizar a empresa com a URL da logo
    await supabase
      .from('empresas')
      .update({ logo_url: logoUrl })
      .eq('id', session.empresaId);

    return NextResponse.json({ url: logoUrl });
  } catch (error) {
    console.error('Erro upload logo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
