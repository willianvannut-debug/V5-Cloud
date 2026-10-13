// ================================================================================
// 🎫 ROTA DE TICKETS DE SUPORTE COM SUPORTE A ANEXOS SEGUROS E RESEND
// app/api/tickets/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
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

// 📋 LISTAR TICKETS DO USUÁRIO LOGADO
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;
    if (!token) return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const empresaId = payload.empresaId as string;
    const emailOperador = payload.email as string;
    const role = (payload.role || 'atendente').toLowerCase();

    let query = supabaseAdmin.from('tickets_ajuda').select('*');

    if (role === 'gerente' || role === 'superadmin' || role === 'dono') {
      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }
    } else {
      query = query.eq('criado_por', emailOperador);
    }

    const { data: tickets, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ sucesso: true, tickets: tickets || [] }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 500 });
  }
}

// 🆕 CRIAR NOVO TICKET COM ANEXO SEGURO (Multipart/FormData)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;
    if (!token) return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const empresaId = payload.empresaId as string;
    const emailOperador = payload.email as string;

    const formData = await request.formData();
    const assunto = formData.get('assunto') as string;
    const descricao = formData.get('descricao') as string;
    const prioridade = formData.get('prioridade') as string;
    const arquivo = formData.get('anexo') as File | null;

    let urlAnexo = null;

    // 🔒 VALIDAÇÃO DE SEGURANÇA DE UPLOAD DE IMAGEM
    if (arquivo && arquivo.size > 0) {
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
      if (!tiposPermitidos.includes(arquivo.type)) {
        return NextResponse.json({ sucesso: false, mensagem: 'Formato de ficheiro inválido. Apenas imagens PNG, JPG ou WEBP são permitidas.' }, { status: 400 });
      }

      // Limite máximo de 5MB
      if (arquivo.size > 5 * 1024 * 1024) {
        return NextResponse.json({ sucesso: false, mensagem: 'A imagem é demasiado grande. O limite máximo é de 5MB.' }, { status: 400 });
      }

      const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'png';
      const nomeSeguro = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extensao}`;
      const arrayBuffer = await arquivo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Envia para o Storage do Supabase (Bucket: 'tickets-anexos')
      const { error: uploadError } = await supabaseAdmin.storage
        .from('tickets-anexos')
        .upload(nomeSeguro, buffer, {
          contentType: arquivo.type,
          upsert: false
        });

      if (uploadError) {
        console.error("Erro no upload storage:", uploadError);
        throw new Error("Falha ao salvar o anexo no servidor.");
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('tickets-anexos')
        .getPublicUrl(nomeSeguro);

      urlAnexo = publicUrlData.publicUrl;
    }

    // 1. Salva no banco de dados com a URL do anexo
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .insert([{ 
        empresa_id: empresaId, 
        assunto, 
        descricao, 
        prioridade: prioridade || 'Média',
        status: 'ABERTO',
        criado_por: emailOperador,
        anexo_url: urlAnexo 
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Dispara e-mail de "Ticket Recebido"
    try {
      const detalhes = `
        <p style="margin: 0; color: #10b981; font-weight: bold;">Ticket #${ticket.id.split('-')[0]}</p>
        <p style="margin: 5px 0 0 0; color: #f8fafc; font-size: 13px;"><strong>Assunto:</strong> ${assunto}</p>
        <p style="margin: 5px 0 0 0; color: #f8fafc; font-size: 13px;"><strong>Prioridade:</strong> ${prioridade || 'Média'}</p>
        ${urlAnexo ? `<p style="margin: 10px 0 0 0;"><a href="${urlAnexo}" target="_blank" style="color: #3b82f6;">Ver print / anexo enviado</a></p>` : ''}
      `;
      const mensagem = `Olá! Recebemos a sua solicitação. A nossa equipa de suporte técnico já foi notificada e irá analisar o seu caso o mais rápido possível.`;
      
      await resend.emails.send({
        from: 'Suporte V5 <onboarding@resend.dev>',
        to: [emailOperador],
        subject: `Ticket Recebido: ${assunto} [V5-${ticket.id.split('-')[0]}]`,
        html: gerarTemplateEmail('Solicitação Recebida', mensagem, detalhes, '#3b82f6'),
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

    const body = await request.json();
    const { id, status, resposta_suporte, email_cliente } = body;

    const dadosAtualizados: any = { status };
    if (resposta_suporte) dadosAtualizados.resposta_suporte = resposta_suporte;

    const { data: ticketAtualizado, error } = await supabaseAdmin
      .from('tickets_ajuda')
      .update(dadosAtualizados)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

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
          html: gerarTemplateEmail('Ticket Resolvido', mensagem, detalhes, '#10b981'),
        });

      } else if (resposta_suporte) {
        const detalhes = `
          <p style="margin: 0; color: #eab308; font-weight: bold;">Nova Atualização no Ticket #${idCurto}</p>
          <p style="margin: 10px 0 0 0; color: #f8fafc; font-size: 13px; background: #18181b; padding: 10px; border-radius: 6px;">${resposta_suporte}</p>
        `;
        const mensagem = `O suporte técnico da V5 adicionou uma nova resposta à sua solicitação. Aceda ao seu painel para continuar o atendimento.`;
        
        await resend.emails.send({
          from: 'Suporte V5 <onboarding@resend.dev>',
          to: [email_cliente || ticketAtualizado.criado_por],
          subject: `Atualização no Ticket: ${ticketAtualizado.assunto} [V5-${idCurto}]`,
          html: gerarTemplateEmail('Nova Resposta', mensagem, detalhes, '#eab308'),
        });
      }
    } catch (e) { console.error("Erro email ticket atualização:", e); }

    return NextResponse.json({ sucesso: true, ticket: ticketAtualizado }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 500 });
  }
}