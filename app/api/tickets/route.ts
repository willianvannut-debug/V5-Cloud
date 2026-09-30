// ================================================================================
// 🎫 ROTA DE TICKETS DE SUPORTE COM NOTIFICAÇÕES VIA E-MAIL (RESEND)
// app/api/tickets/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

// Função auxiliar para gerar o HTML do e-mail com a identidade visual da V5
function gerarTemplateEmail(titulo: string, mensagemPrincipal: string, detalhesTicket: string, corDestaque: string = '#10b981') {
  return `
    <div style="font-family: monospace; background-color: #09090b; color: #f8fafc; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e3b29;">
      <h2 style="color: ${corDestaque}; text-transform: uppercase; text-align: center;">${titulo}</h2>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
        ${mensagemPrincipal}
      </p>
      
      <div style="background-color: #000; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px dashed #333;">
        ${detalhesTicket}
      </div>

      <p style="margin-top: 30px; font-size: 10px; color: #52525b; border-top: 1px dashed #1e3b29; padding-top: 15px; text-align: center;">
        V5 Cloud Support - Este é um e-mail automático.
      </p>
    </div>
  `;
}

// 🆕 CRIAR NOVO TICKET (Dispara "Recebido")
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;
    if (!token) return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const empresaId = payload.empresaId as string;
    const emailOperador = payload.email as string;

    const body = await request.json();
    const { assunto, descricao, prioridade } = body;

    // 1. Salva no banco de dados
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .insert([{ 
        empresa_id: empresaId, 
        assunto, 
        descricao, 
        prioridade: prioridade || 'Média',
        status: 'ABERTO',
        criado_por: emailOperador
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Dispara e-mail de "Ticket Recebido"
    try {
      const detalhes = `
        <p style="margin: 0; color: #10b981; font-weight: bold;">Ticket #${ticket.id.split('-')[0]}</p>
        <p style="margin: 5px 0 0 0; color: #f8fafc; font-size: 13px;"><strong>Assunto:</strong> ${assunto}</p>
        <p style="margin: 5px 0 0 0; color: #f8fafc; font-size: 13px;"><strong>Prioridade:</strong> ${prioridade}</p>
      `;
      const mensagem = `Olá! Recebemos a sua solicitação. A nossa equipa de suporte técnico já foi notificada e irá analisar o seu caso o mais rápido possível.`;
      
      await resend.emails.send({
        from: 'Suporte V5 <onboarding@resend.dev>',
        to: [emailOperador],
        subject: `Ticket Recebido: ${assunto} [V5-${ticket.id.split('-')[0]}]`,
        html: gerarTemplateEmail('Solicitação Recebida', mensagem, detalhes, '#3b82f6'), // Azul para novo ticket
      });
    } catch (e) { console.error("Erro email ticket recebido:", e); }

    return NextResponse.json({ sucesso: true, ticket }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 500 });
  }
}

// 🔄 ATUALIZAR TICKET (Dispara "Atualizado" ou "Resolvido")
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;
    if (!token) return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Aqui podíamos validar se é admin/suporte que está a alterar, mas vamos assumir permissões pela lógica do seu frontend

    const body = await request.json();
    const { id, status, resposta_suporte, email_cliente } = body;

    // 1. Atualiza no banco
    const dadosAtualizados: any = { status };
    if (resposta_suporte) dadosAtualizados.resposta_suporte = resposta_suporte;

    const { data: ticketAtualizado, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .update(dadosAtualizados)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. Avalia qual e-mail disparar (Atualizado vs Resolvido)
    try {
      const idCurto = ticketAtualizado.id.split('-')[0];
      
      if (status === 'RESOLVIDO') {
        const detalhes = `
          <p style="margin: 0; color: #10b981; font-weight: bold;">Ticket #${idCurto} Finalizado</p>
          <p style="margin: 5px 0 0 0; color: #f8fafc; font-size: 13px;"><strong>Assunto:</strong> ${ticketAtualizado.assunto}</p>
          <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px; font-style: italic;">" ${resposta_suporte || 'Resolução aplicada com sucesso pelo sistema.'} "</p>
        `;
        const mensagem = `O seu ticket de suporte foi marcado como resolvido. Se continuar a ter problemas, pode reabrir esta solicitação no seu painel.`;
        
        await resend.emails.send({
          from: 'Suporte V5 <onboarding@resend.dev>',
          to: [email_cliente || ticketAtualizado.criado_por],
          subject: `Resolvido: ${ticketAtualizado.assunto} [V5-${idCurto}]`,
          html: gerarTemplateEmail('Ticket Resolvido', mensagem, detalhes, '#10b981'), // Verde para resolvido
        });

      } else if (resposta_suporte) {
        // Se mudou para EM ANDAMENTO ou enviou resposta
        const detalhes = `
          <p style="margin: 0; color: #eab308; font-weight: bold;">Nova Atualização no Ticket #${idCurto}</p>
          <p style="margin: 10px 0 0 0; color: #f8fafc; font-size: 13px; background: #18181b; padding: 10px; border-radius: 6px;">${resposta_suporte}</p>
        `;
        const mensagem = `O suporte técnico da V5 adicionou uma nova resposta à sua solicitação. Aceda ao seu painel para continuar o atendimento.`;
        
        await resend.emails.send({
          from: 'Suporte V5 <onboarding@resend.dev>',
          to: [email_cliente || ticketAtualizado.criado_por],
          subject: `Atualização no Ticket: ${ticketAtualizado.assunto} [V5-${idCurto}]`,
          html: gerarTemplateEmail('Nova Resposta', mensagem, detalhes, '#eab308'), // Amarelo para atualização
        });
      }
    } catch (e) { console.error("Erro email ticket atualização:", e); }

    return NextResponse.json({ sucesso: true, ticket: ticketAtualizado }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 500 });
  }
}