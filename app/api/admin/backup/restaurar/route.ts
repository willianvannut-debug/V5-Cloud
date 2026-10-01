// ================================================================================
// 📥 ROTA DE RESTAURAÇÃO ISOLADA POR PROVEDOR - V5 CLOUD
// app/api/admin/backup/restaurar/route.ts
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
     process.env.JWT_SECRET_KEY
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
      empresaId: empresaId as string,
      role: String(payload.role || '').toLowerCase()
    };
  } catch (e) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const usuario = await verificarGerente(request);
  if (!usuario) {
    return NextResponse.json({ sucesso: false, erro: 'Não autorizado.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { dados, empresa_id: empresaIdBackup } = body;

    if (!dados || typeof dados !== 'object') {
      return NextResponse.json({ sucesso: false, erro: 'Ficheiro de backup inválido.' }, { status: 400 });
    }

    // 🔒 TRAVA DE SEGURANÇA: Impede que um gerente restaure um ficheiro JSON pertencente a outra empresa
    if (empresaIdBackup && empresaIdBackup !== usuario.empresaId && usuario.role !== 'superadmin') {
      return NextResponse.json({ sucesso: false, erro: 'Este ficheiro de backup pertence a outro provedor.' }, { status: 403 });
    }

    const { operadores = [], leads = [], ctos = [] } = dados;
    const relatorio: Record<string, number> = {};

    // Força todos os registos a manterem a empresa_id correta do utilizador logado
    const operadoresLimpos = operadores.map((op: any) => ({ ...op, empresa_id: usuario.empresaId }));
    const leadsLimpos = leads.map((l: any) => ({ ...l, empresa_id: usuario.empresaId }));
    const ctosLimpas = ctos.map((c: any) => ({ ...c, provedor_id: usuario.empresaId }));

    if (operadoresLimpos.length > 0) {
      await supabaseAdmin.from('operadores').upsert(operadoresLimpos, { onConflict: 'id' });
      relatorio.operadores_restaurados = operadoresLimpos.length;
    }

    if (leadsLimpos.length > 0) {
      await supabaseAdmin.from('leads').upsert(leadsLimpos, { onConflict: 'id' });
      relatorio.leads_restaurados = leadsLimpos.length;
    }

    if (ctosLimpas.length > 0) {
      for (let i = 0; i < ctosLimpas.length; i += 500) {
        const lote = ctosLimpas.slice(i, i + 500);
        await supabaseAdmin.from('ctos').upsert(lote, { onConflict: 'id' });
      }
      relatorio.ctos_restauradas = ctosLimpas.length;
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Backup do provedor restaurado com sucesso!',
      relatorio
    });

  } catch (error: any) {
    console.error("❌ Erro ao restaurar backup do provedor:", error);
    return NextResponse.json({ sucesso: false, erro: 'Erro interno: ' + error.message }, { status: 500 });
  }
}