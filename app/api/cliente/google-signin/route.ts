import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assinarTokenCliente } from '@/lib/cliente-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Verifica o token do Google chamando a API do Google
async function verificarTokenGoogle(idToken: string) {
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );
    if (!response.ok) return null;
    const payload = await response.json();
    // Verificar se o token é válido e tem email
    if (!payload.email || !payload.email_verified) return null;
    return {
      email: payload.email.toLowerCase(),
      nome: payload.name || '',
      picture: payload.picture || '',
      googleId: payload.sub,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_token, access_token } = body;

    if (!id_token && !access_token) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Token não fornecido' },
        { status: 400 }
      );
    }

    // Tentar verificar com id_token primeiro, senão usar access_token para buscar userinfo
    let googleUser: { email: string; nome: string; picture: string; googleId: string } | null = null;

    if (id_token) {
      googleUser = await verificarTokenGoogle(id_token);
    }

    if (!googleUser && access_token) {
      // Fallback: usar access_token para buscar dados do usuário
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.email && data.email_verified) {
            googleUser = {
              email: data.email.toLowerCase(),
              nome: data.name || '',
              picture: data.picture || '',
              googleId: data.sub,
            };
          }
        }
      } catch {
        // Ignora e segue para o erro abaixo
      }
    }

    if (!googleUser) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Token do Google inválido ou email não verificado' },
        { status: 401 }
      );
    }

    console.log('[GOOGLE-SIGNIN] Email verificado:', googleUser.email);

    // Buscar cliente pelo email verificado
    const { data: cliente, error: clienteError } = await supabaseAdmin
      .from('clientes')
      .select('id, nome, cpf, email, email_verificado, empresa_id, telefone, endereco, plano_id, status, foto_url, senha')
      .eq('email', googleUser.email)
      .eq('email_verificado', true)
      .maybeSingle();

    if (clienteError) {
      console.error('[GOOGLE-SIGNIN] Erro ao buscar cliente:', clienteError);
      return NextResponse.json(
        { sucesso: false, mensagem: 'Erro interno ao buscar cliente' },
        { status: 500 }
      );
    }

    if (!cliente) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: 'Nenhuma conta encontrada com esse email do Google. Faça o primeiro acesso para vincular seu email.',
          codigo: 'EMAIL_NAO_ENCONTRADO',
        },
        { status: 404 }
      );
    }

    // Verificar se o cliente tem senha (conta ativada)
    if (!cliente.senha || cliente.senha === '') {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: 'Sua conta ainda não foi ativada. Faça o primeiro acesso para ativar.',
          codigo: 'CONTA_NAO_ATIVADA',
        },
        { status: 403 }
      );
    }

    // Buscar dados da empresa
    let empresa: any = {
      id: cliente.empresa_id,
      nome: 'Provedor',
      logo_url: null,
      cor_primaria: null,
      cor_secundaria: null,
    };

    try {
      const { data: emp } = await supabaseAdmin
        .from('empresas')
        .select('id, nome_empresa, logo_url, cor_primaria, cor_secundaria')
        .eq('id', cliente.empresa_id)
        .single();

      if (emp) {
        empresa = {
          id: emp.id,
          nome: emp.nome_empresa || 'Provedor',
          logo_url: emp.logo_url,
          cor_primaria: emp.cor_primaria,
          cor_secundaria: emp.cor_secundaria,
        };
      }
    } catch {
      // Usa valores padrão
    }

    // Remover senha do retorno
    const { senha: _, ...clienteSemSenha } = cliente;

    console.log('[GOOGLE-SIGNIN] ✅ Login Google bem-sucedido para:', cliente.nome);

    return NextResponse.json({
      sucesso: true,
      token: await assinarTokenCliente(cliente.id, cliente.empresa_id),
      cliente: clienteSemSenha,
      empresa,
    });
  } catch (err) {
    console.error('[GOOGLE-SIGNIN] Erro:', err);
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
