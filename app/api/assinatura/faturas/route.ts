// app/api/assinatura/faturas/route.ts
// Lista as faturas da assinatura V5 Cloud da empresa logada.
// Roda no servidor com a service role key, porque a tabela assinatura_faturas
// tem RLS ligado e nenhuma policy de leitura pública.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmpresaDaSessao } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local' },
      { status: 500 }
    );
  }

  const sessao = await getEmpresaDaSessao(req);
  if (!sessao) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const empresaId = sessao.empresaId;

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('assinatura_faturas')
    .select('id, numero, plano, competencia, valor, vencimento, status, forma_pagamento, pago_em, valor_pago, link_pagamento, comprovante_url')
    .eq('empresa_id', empresaId)
    .order('competencia', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}