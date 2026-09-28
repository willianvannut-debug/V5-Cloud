// app/api/superadmin/consumo/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role } = body;

    if (role !== 'superadmin' && role !== 'root') {
      return NextResponse.json({ erro: 'Acesso Negado: Privilégios insuficientes.' }, { status: 403 });
    }

    // 1. Busca todas as empresas
    const { data: empresas, error: erroEmpresas } = await supabaseAdmin
      .from('empresas')
      .select('*')
      .order('criado_em', { ascending: true });

    if (erroEmpresas) throw erroEmpresas;

    // 2. Processa o consumo real de cada instância no banco
    const empresasComConsumo = await Promise.all(
      (empresas || []).map(async (emp) => {
        const empresaId = emp.id;

        // 🚀 Total de Leads na tabela 'leads' vinculados por 'empresa_id'
        const { count: leadsTotais } = await supabaseAdmin
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId);

        // 🚀 Leads Instalados (filtra pelo campo status)
        const { count: leadsInstalados } = await supabaseAdmin
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .ilike('status', '%instalado%');

        // CTOs Ativas na tabela 'ctos' vinculadas por 'provedor_id'
        const { count: ctosCount } = await supabaseAdmin
          .from('ctos') 
          .select('id', { count: 'exact', head: true })
          .eq('provedor_id', empresaId);

        // Operadores Totais na tabela 'operadores' vinculados por 'empresa_id'
        const { count: equipeTotal } = await supabaseAdmin
          .from('operadores')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId);

        // Operadores Atendentes
        const { count: atendentesCount } = await supabaseAdmin
          .from('operadores')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .ilike('role', '%atendente%');

        // Operadores Técnicos
        const { count: tecnicosCount } = await supabaseAdmin
          .from('operadores')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', empresaId)
          .ilike('role', '%tecnico%');

        const totalL = leadsTotais || 0;
        const totalI = leadsInstalados || 0;
        const totalCtos = ctosCount || 0;
        const totalEq = equipeTotal || 0;
        const totalAtend = atendentesCount || 0;
        const totalTec = tecnicosCount || 0;

        let resolvidosAtend = totalAtend;
        let resolvidosTec = totalTec;
        if (totalAtend === 0 && totalTec === 0 && totalEq > 0) {
          resolvidosAtend = Math.max(1, Math.round(totalEq * 0.6));
          resolvidosTec = Math.max(0, totalEq - resolvidosAtend);
        }

        return {
          ...emp,
          consumo: {
            leads: totalL,
            instalados: totalI,
            pendentes: Math.max(0, totalL - totalI), // O restante vai para pendentes/outros
            ctos: totalCtos,
            equipe: totalEq,
            atendentes: resolvidosAtend,
            tecnicos: resolvidosTec
          }
        };
      })
    );

    return NextResponse.json({ sucesso: true, dados: empresasComConsumo });

  } catch (error: any) {
    console.error("Erro crítico na API de Superadmin:", error);
    return NextResponse.json({ sucesso: false, erro: 'Falha interna no servidor.', detalhes: error.message }, { status: 500 });
  }
}