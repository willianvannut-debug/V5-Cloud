// ================================================================================
// 📦 ROTA DE BACKUP ISOLADO POR PROVEDOR - V5 CLOUD
// app/api/admin/backup/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

async function verificarGerente(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('v5_session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const empresaId = payload.empresa_id || payload.empresaId;
    if (!empresaId) return null;

    return {
      email: payload.email as string,
      empresaId: empresaId as string,
      role: String(payload.role || '').toLowerCase()
    };
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const usuario = await verificarGerente(request);
  if (!usuario) {
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const dataHora = new Date().toISOString().replace(/[:.]/g, '-');

    const [
      { data: empresa },
      { data: operadores },
      { data: leads },
      { data: ctos }
    ] = await Promise.all([
      supabaseAdmin.from('empresas').select('*').eq('id', usuario.empresaId).single(),
      supabaseAdmin.from('operadores').select('*').eq('empresa_id', usuario.empresaId),
      supabaseAdmin.from('leads').select('*').eq('empresa_id', usuario.empresaId),
      supabaseAdmin.from('ctos').select('*').eq('provedor_id', usuario.empresaId)
    ]);

    const pacoteBackup = {
      versao_sistema: 'V5 Cloud v2.6',
      gerado_em: new Date().toISOString(),
      gerado_por: usuario.email,
      empresa_id: usuario.empresaId,
      estatisticas: {
        total_operadores: operadores?.length || 0,
        total_leads: leads?.length || 0,
        total_ctos: ctos?.length || 0,
      },
      dados: {
        empresa: empresa ? [empresa] : [],
        operadores: operadores || [],
        leads: leads || [],
        ctos: ctos || []
      }
    };

    return new NextResponse(JSON.stringify(pacoteBackup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="v5-backup-${empresa?.slug || 'provedor'}-${dataHora}.json"`
      }
    });

  } catch (error: any) {
    console.error("❌ Erro ao gerar backup do provedor:", error);
    return NextResponse.json({ sucesso: false, erro: 'Erro interno ao gerar backup: ' + error.message }, { status: 500 });
  }
}