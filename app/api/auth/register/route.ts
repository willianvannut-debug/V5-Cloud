import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';

// 🚀 1. Inicializa o Resend com a sua chave
const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const nomeOperador = body.usuario || body.nome;
    const email = body.email;
    const senha = body.senha;
    const nomeEmpresa = body.nomeEmpresa;
    const enderecoEmpresa = body.enderecoEmpresa;
    const lat = body.lat;
    const lon = body.lon;
    
    // 🚀 Normalização avançada: apanha o plano de qualquer propriedade onde o frontend possa enviar
    const planoBruto = body.plano || body.chavePlano || body.selectedPlan || 'essencial';
    const planoComprado = planoBruto !== 'pendente' ? planoBruto.toLowerCase() : 'essencial';

    if (!nomeOperador || !email || !senha || !nomeEmpresa) {
      return NextResponse.json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    const emailLimpo = email.trim().toLowerCase();
    const senhaHash = await bcrypt.hash(senha, 10);
    const ipCliente = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'IP Desconhecido';
    const userAgentCliente = request.headers.get('user-agent') || 'Dispositivo Desconhecido';
    const versaoTermo = body.termo_versao || '1.0';
    const hashDocumento = body.termo_hash || 'hash_padrao_v5';

    // 1. Verifica se já existe um operador cadastrado com este e-mail
    const { data: operadorExistente } = await supabaseAdmin
      .from('operadores')
      .select('id, empresa_id')
      .eq('email', emailLimpo)
      .maybeSingle();

    let empresaIdFinal = '';
    let isNovoCadastro = false; // Flag para sabermos se devemos mandar o e-mail de boas-vindas

    if (operadorExistente) {
      // 🔄 SE O OPERADOR JÁ EXISTE: Atualizamos os dados da empresa (incluindo o plano correto) e a senha de forma limpa
      empresaIdFinal = operadorExistente.empresa_id;

      if (empresaIdFinal) {
        await supabaseAdmin
          .from('empresas')
          .update({
            nome_empresa: nomeEmpresa.trim(),
            endereco: enderecoEmpresa || 'Não informado',
            lat: lat || -15.8193,
            lon: lon || -48.1133,
            plano: planoComprado, // Atualiza para o plano exato selecionado
            termo_aceito: true,
            termo_versao: versaoTermo,
            termo_data_aceite: new Date().toISOString(),
            termo_ip: ipCliente,
            termo_user_agent: userAgentCliente,
            termo_hash: hashDocumento
          })
          .eq('id', empresaIdFinal);
      }

      await supabaseAdmin
        .from('operadores')
        .update({
          nome: nomeOperador.trim(),
          senha_hash: senhaHash
        })
        .eq('id', operadorExistente.id);

    } else {
      // 🆕 SE NÃO EXISTE: Criamos a empresa com o plano correto escolhido e depois o operador associado
      isNovoCadastro = true;
      const codigoConviteGerado = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data: empresaCriada, error: erroEmpresa } = await supabaseAdmin
        .from('empresas')
        .insert([
          {
            nome_empresa: nomeEmpresa.trim(),
            endereco: enderecoEmpresa || 'Não informado',
            lat: lat || -15.8193,
            lon: lon || -48.1133,
            codigo_convite: codigoConviteGerado,
            plano: planoComprado, // Grava rigorosamente o plano escolhido pelo utilizador
            termo_aceito: true,
            termo_versao: versaoTermo,
            termo_data_aceite: new Date().toISOString(),
            termo_ip: ipCliente,
            termo_user_agent: userAgentCliente,
            termo_hash: hashDocumento
          }
        ])
        .select()
        .single();

      if (erroEmpresa) {
        return NextResponse.json({ sucesso: false, mensagem: `Erro ao registrar empresa: ${erroEmpresa.message}` }, { status: 500 });
      }

      empresaIdFinal = empresaCriada.id;

      const { error: erroOperador } = await supabaseAdmin
        .from('operadores')
        .insert([
          {
            nome: nomeOperador.trim(),
            email: emailLimpo,
            senha_hash: senhaHash,
            role: 'gerente',
            empresa_id: empresaIdFinal
          }
        ]);

      if (erroOperador) {
        // Se houver falha ao inserir o operador, removemos a empresa criada para manter a consistência
        await supabaseAdmin.from('empresas').delete().eq('id', empresaIdFinal);
        return NextResponse.json({ sucesso: false, mensagem: `Erro ao criar operador: ${erroOperador.message}` }, { status: 500 });
      }
    }

    // 🚀 2. ENVIO DO E-MAIL DE BOAS-VINDAS (Só se for uma conta nova)
    if (isNovoCadastro) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        await resend.emails.send({
          from: 'V5 SaaS <onboarding@resend.dev>', // ⚠️ Altere para o seu domínio quando o verificar no Resend
          to: [emailLimpo],
          subject: `Bem-vindo à V5 Cloud, ${nomeOperador}! 🚀`,
          html: `
            <div style="font-family: monospace; background-color: #09090b; color: #f8fafc; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e3b29;">
              <h2 style="color: #10b981; text-transform: uppercase;">Conta Criada com Sucesso!</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                Olá <strong>${nomeOperador}</strong>,
              </p>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                É um prazer ter você na V5. A conta da sua empresa <strong>${nomeEmpresa}</strong> foi configurada com o plano <strong style="color: #3b82f6; text-transform: uppercase;">${planoComprado}</strong> e o seu perfil de Gerente já está ativo.
              </p>
              
              <div style="margin: 35px 0;">
                <a href="${appUrl}/login" 
                   style="background-color: #10b981; color: #000; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-transform: uppercase; font-size: 13px; display: inline-block;">
                  Acessar o Painel Agora
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 12px; border-top: 1px dashed #333; padding-top: 20px;">
                Dica: Explore a aba de Viabilidade e o Mapa interativo para começar a organizar as suas vendas!
              </p>
            </div>
          `,
        });
        console.log(`✅ E-mail de boas-vindas enviado para ${emailLimpo}`);
      } catch (emailError) {
        console.error("Aviso: Falha ao enviar e-mail de boas-vindas:", emailError);
      }
    }

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Conta criada e sincronizada com sucesso!',
      empresaId: empresaIdFinal
    });

  } catch (err: any) {
    console.error("ERRO NO REGISTRO:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno no servidor.' }, { status: 500 });
  }
}