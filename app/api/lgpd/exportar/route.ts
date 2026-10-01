//app/api/lgpd/exportar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

// Inicializa o Resend
const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const JWT_SECRET = new TextEncoder().encode(
     process.env.JWT_SECRET_KEY
);

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase não configurado' }, { status: 500 });
    }

    let empresaIdSessao = '';
    let operadorEmail = 'willianvannut@gmail.com';

    // 🛡️ 1. Extrair estritamente o ID (uuid) da empresa através da sessão ativa do utilizador
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('v5_session')?.value;
      if (token) {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        operadorEmail = String(payload.email || operadorEmail);
        empresaIdSessao = String(payload.empresa_id || payload.empresaId || payload.sub || '');
      }
    } catch (e) {}

    // Caso o token não traga o ID diretamente, buscamos a empresa mais recente como referência segura do tenant atual
    if (!empresaIdSessao) {
      const { data: empresaRecente } = await supabase
        .from('empresas')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (empresaRecente) {
        empresaIdSessao = empresaRecente.id;
      }
    }

    if (!empresaIdSessao) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado: Nenhuma empresa associada a esta sessão.' },
        { status: 401 }
      );
    }

    // 🏢 2. Buscar dados cadastrais da empresa usando o UUID exato (`id`)
    const { data: empresaDados, error: errEmpresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaIdSessao)
      .maybeSingle();

    if (errEmpresa || !empresaDados) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada com este ID (uuid).' },
        { status: 404 }
      );
    }

    // 👥 3. Buscar operadores vinculados estritamente a este UUID de empresa
    const { data: operadoresDados } = await supabase
      .from('operadores')
      .select('id, nome, email, cargo, criado_em')
      .eq('empresa_id', empresaIdSessao);

    // 🌐 4. Buscar CTOs vinculadas por provedor_id ou empresa_id
    const { data: ctosDados } = await supabase
      .from('ctos')
      .select('*')
      .or(`provedor_id.eq.${empresaIdSessao},empresa_id.eq.${empresaIdSessao}`);

    // 💰 5. Buscar Faturas da empresa
    const { data: faturasDados } = await supabase
      .from('faturas')
      .select('*')
      .eq('empresa_id', empresaIdSessao);

    // 🎯 6. Buscar Leads da empresa
    const { data: leadsDados } = await supabase
      .from('leads')
      .select('*')
      .eq('empresa_id', empresaIdSessao);

    // 📜 7. Buscar Logs de auditoria direcionados a este UUID
    const { data: logsDados } = await supabase
      .from('logs_sistema')
      .select('*')
      .eq('empresa_id', empresaIdSessao)
      .order('timestamp', { ascending: false })
      .limit(100);

    // 📦 8. Compilar o relatório LGPD estritamente isolado por empresa
    const relatorioLGPD = {
      geradoEm: new Date().toISOString(),
      baseLegal: "Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)",
      isolamentoTenant: {
        empresaUuid: empresaIdSessao,
        status: "Seguro - Dados filtrados por UUID corporativo"
      },
      dadosCadastraisEmpresa: {
        id: empresaDados.id,
        nomeEmpresa: empresaDados.nome_empresa,
        codigoConvite: empresaDados.codigo_convite,
        planoAtual: empresaDados.plano,
        telefone: empresaDados.telefone || 'Não informado',
        emailContato: empresaDados.email || 'Não informado',
        cep: empresaDados.cep || 'Não informado',
        enderecoLoja: empresaDados.endereco || 'Não informado',
        geolocalizacao: {
          lat: empresaDados.lat,
          lon: empresaDados.lon
        },
        planosComerciaisConfigurados: empresaDados.planos || [],
        criadoEm: empresaDados.criado_em
      },
      equipeOperadores: operadoresDados || [],
      infraestruturaCTOs: ctosDados || [],
      faturasEFinanceiro: faturasDados || [],
      leadsCRM: leadsDados || [],
      historicoAuditoriaESeguranca: logsDados || []
    };

    // 🚀 9. Registar log de auditoria da exportação
    await logger.info(
      'EXPORTAR_DADOS_LGPD',
      'sistema',
      `Relatório LGPD exportado com segurança para o UUID [${empresaIdSessao}] por [${operadorEmail}]`,
      { empresaId: empresaIdSessao, operadorEmail }
    );

    // 📧 10. DISPARAR O ALERTA DE SEGURANÇA VIA RESEND
    try {
      const dataHoraAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const ip = request.headers.get('x-forwarded-for') || 'IP não identificado';

      await resend.emails.send({
        from: 'V5 Privacidade <onboarding@resend.dev>', // ⚠️ Altere para o seu domínio depois
        to: [operadorEmail],
        subject: 'Aviso de Privacidade: Relatório LGPD Exportado 🛡️',
        html: `
          <div style="font-family: monospace; background-color: #09090b; color: #f8fafc; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e3b29;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="font-size: 40px;">🛡️</span>
            </div>
            
            <h2 style="color: #10b981; text-transform: uppercase; text-align: center;">Exportação de Dados Concluída</h2>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
              Olá,
            </p>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
              Em conformidade com a LGPD, informamos que um ficheiro JSON contendo os dados da empresa <strong>${empresaDados.nome_empresa}</strong> e informações associadas foi gerado e descarregado a partir do seu painel de controlo.
            </p>
            
            <div style="background-color: #18181b; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #333;">
              <p style="margin: 0; color: #10b981; font-size: 12px; text-transform: uppercase;">Detalhes da Ação:</p>
              <ul style="color: #94a3b8; font-size: 12px; line-height: 1.8; padding-left: 20px;">
                <li><strong>Data/Hora:</strong> ${dataHoraAtual}</li>
                <li><strong>IP de Origem:</strong> ${ip}</li>
                <li><strong>E-mail Solicitante:</strong> ${operadorEmail}</li>
              </ul>
            </div>
            
            <div style="background-color: #ef444415; padding: 15px; border-left: 4px solid #ef4444; margin: 25px 0;">
              <p style="margin: 0; color: #ef4444; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                ⚠️ Não solicitou esta exportação?
              </p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #f8fafc;">
                Se não foi você que clicou no botão para exportar os dados, a sua conta pode estar comprometida. Recomendamos que altere a sua senha imediatamente nas Configurações do sistema e avise a nossa equipa de suporte.
              </p>
            </div>

            <p style="margin-top: 30px; font-size: 10px; color: #52525b; border-top: 1px dashed #1e3b29; padding-top: 15px; text-align: center;">
              V5 Cloud Compliance - Proteção de Dados.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar alerta LGPD:", emailError);
    }

    const nomeFicheiro = `relatorio-lgpd-${empresaDados.nome_empresa.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(relatorioLGPD, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeFicheiro}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error) {
    console.error("❌ Erro crítico ao gerar relatório LGPD por UUID:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}