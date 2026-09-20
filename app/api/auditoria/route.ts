//app/api/auditoria/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operador_email, acao, ip, detalhes, empresa_id, entidade_tipo, entidade_id } = body;

    const { error } = await supabase.from('auditoria_logs').insert([
      {
        operador_email,
        acao,
        ip,
        detalhes,
        empresa_id,
        entidade_tipo,
        entidade_id,
        criado_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('[API Audit Error]:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Audit Exception]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}