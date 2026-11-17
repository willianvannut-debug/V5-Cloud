// app/api/operators/[id]/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { verificarLimite } from '@/lib/verificarLimite';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getOperadorLogado(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('v5_session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { data: operador } = await supabaseAdmin
      .from('operadores')
      .select('*')
      .eq('email', payload.email)
      .single();
    return operador;
  } catch (e) {
    return null;
  }
}

// 🟢 POST: CRIAR NOVO OPERADOR (com verificação de limite por plano)
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    const operadorLogado = await getOperadorLogado(request);

    if (!operadorLogado || operadorLogado.role !== 'gerente') {
      await logger.aviso('ACESSO_CRIAR_OPERADOR_NAO_AUTORIZADO', 'operador',
        'Tentativa de criar operador sem permissão de gerente',
        { ip, emailTentativa: operadorLogado?.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Apenas gerentes podem criar novos colaboradores.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome, email, role, senha } = body;

    if (!nome || !email || !role || !senha) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'Dados incompletos. Preencha nome, email, role e senha.' },
        { status: 400 }
      );
    }

    // ✅ Verificar limite de acordo com o role sendo criado
    const empresaId = operadorLogado.empresa_id;

    if (role === 'tecnico') {
      const limite = await verificarLimite(empresaId, 'max_tecnicos');
      if (!limite.permitido) {
        return NextResponse.json({ sucesso: false, mensagem: limite.mensagem }, { status: 403 });
      }
    } else if (role === 'vendedor') {
      const limite = await verificarLimite(empresaId, 'max_vendedores');
      if (!limite.permitido) {
        return NextResponse.json({ sucesso: false, mensagem: limite.mensagem }, { status: 403 });
      }
    }
    // gerente e outros roles não têm limite de plano

    // Verifica email duplicado
    const { data: emailExistente } = await supabaseAdmin
      .from('operadores')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (emailExistente) {
      await logger.aviso('OPERADOR_EMAIL_JA_EXISTE', 'operador',
        `Tentativa de criar operador com email já existente: ${email}`,
        { emailDuplicado: email, gerente: operadorLogado.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Este email já está cadastrado.' },
        { status: 400 }
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const { data: novoOperador, error } = await supabaseAdmin
      .from('operadores')
      .insert([{
        nome, email, role,
        empresa_id: empresaId,
        senha_hash: senhaHash,
        criado_em: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    await logger.sucesso('OPERADOR_CRIADO', 'operador', `Novo operador criado: ${nome}`, {
      operadorId: novoOperador.id,
      operadorNome: novoOperador.nome,
      operadorEmail: novoOperador.email,
      operadorRole: novoOperador.role,
      gerenteCriador: operadorLogado.email,
      empresaId,
      ip,
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Operador criado com sucesso!',
      operador: {
        id: novoOperador.id,
        nome: novoOperador.nome,
        email: novoOperador.email,
        role: novoOperador.role,
      },
    });

  } catch (err: any) {
    console.error('Erro ao criar operador:', err);
    await logger.erro('ERRO_CRIAR_OPERADOR', 'operador', 'Erro ao criar novo operador', err, { ip });
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno ao criar operador.' },
      { status: 500 }
    );
  }
}

// 🟡 PUT: ATUALIZAR OPERADOR
export async function PUT(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    const operadorLogado = await getOperadorLogado(request);

    if (!operadorLogado || operadorLogado.role !== 'gerente') {
      await logger.aviso('ACESSO_ATUALIZAR_OPERADOR_NAO_AUTORIZADO', 'operador',
        'Tentativa de atualizar operador sem permissão de gerente',
        { ip, emailTentativa: operadorLogado?.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Apenas gerentes podem atualizar colaboradores.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { operadorId, nome, email, role } = body;

    if (!operadorId) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'ID do operador não informado.' },
        { status: 400 }
      );
    }

    const { data: operadorAtual } = await supabaseAdmin
      .from('operadores')
      .select('*')
      .eq('id', operadorId)
      .eq('empresa_id', operadorLogado.empresa_id)
      .single();

    if (!operadorAtual) {
      await logger.aviso('OPERADOR_NAO_ENCONTRADO_ATUALIZACAO', 'operador',
        `Tentativa de atualizar operador inexistente: ${operadorId}`,
        { operadorId, gerente: operadorLogado.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Operador não encontrado.' },
        { status: 404 }
      );
    }

    if (operadorAtual.role === 'gerente' && role && role !== 'gerente') {
      await logger.aviso('TENTATIVA_ALTERAR_GERENTE', 'operador',
        'Tentativa de alterar role do gerente principal',
        { operadorId, operadorAtual: operadorAtual.nome, gerente: operadorLogado.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Você não pode alterar a role do gerente principal.' },
        { status: 400 }
      );
    }

    const dadosAtualizacao: any = {};
    if (nome) dadosAtualizacao.nome = nome;
    if (email) dadosAtualizacao.email = email;
    if (role) dadosAtualizacao.role = role;

    const { error } = await supabaseAdmin
      .from('operadores')
      .update(dadosAtualizacao)
      .eq('id', operadorId);

    if (error) throw error;

    await logger.info('OPERADOR_ATUALIZADO', 'operador', `Operador atualizado: ${operadorAtual.nome}`, {
      operadorId,
      operadorNome: operadorAtual.nome,
      dadosAntigos: { nome: operadorAtual.nome, email: operadorAtual.email, role: operadorAtual.role },
      dadosNovos: dadosAtualizacao,
      gerenteResponsavel: operadorLogado.email,
      ip,
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Operador atualizado com sucesso!' });

  } catch (err: any) {
    console.error('Erro ao atualizar operador:', err);
    await logger.erro('ERRO_ATUALIZAR_OPERADOR', 'operador', 'Erro ao atualizar operador', err, { ip });
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno ao atualizar operador.' },
      { status: 500 }
    );
  }
}

// 🔴 DELETE: REMOVER OPERADOR
export async function DELETE(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    const operadorLogado = await getOperadorLogado(request);

    if (!operadorLogado || operadorLogado.role !== 'gerente') {
      await logger.aviso('ACESSO_DELETAR_OPERADOR_NAO_AUTORIZADO', 'operador',
        'Tentativa de deletar operador sem permissão de gerente',
        { ip, emailTentativa: operadorLogado?.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Apenas gerentes podem remover colaboradores.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const operadorId = searchParams.get('id');

    if (!operadorId) {
      return NextResponse.json(
        { sucesso: false, mensagem: 'ID do operador não informado.' },
        { status: 400 }
      );
    }

    const { data: alvo } = await supabaseAdmin
      .from('operadores')
      .select('*')
      .eq('id', operadorId)
      .eq('empresa_id', operadorLogado.empresa_id)
      .single();

    if (!alvo) {
      await logger.aviso('OPERADOR_NAO_ENCONTRADO_DELECAO', 'operador',
        `Tentativa de deletar operador inexistente: ${operadorId}`,
        { operadorId, gerente: operadorLogado.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Colaborador não encontrado.' },
        { status: 404 }
      );
    }

    if (alvo.role === 'gerente') {
      await logger.aviso('TENTATIVA_DELETAR_GERENTE', 'operador',
        'Tentativa de deletar gerente principal',
        { operadorId: alvo.id, operadorNome: alvo.nome, gerente: operadorLogado.email });
      return NextResponse.json(
        { sucesso: false, mensagem: 'Você não pode remover a conta do gerente principal por aqui.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('operadores')
      .delete()
      .eq('id', operadorId);

    if (error) throw error;

    await logger.aviso('OPERADOR_DELETADO', 'operador', `Operador removido: ${alvo.nome}`, {
      operadorId: alvo.id, operadorNome: alvo.nome, operadorEmail: alvo.email,
      operadorRole: alvo.role, gerenteResponsavel: operadorLogado.email,
      operadorBackup: alvo, ip,
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Colaborador removido com sucesso!' });

  } catch (err: any) {
    console.error('Erro ao deletar operador:', err);
    await logger.erro('ERRO_DELETAR_OPERADOR', 'operador', 'Erro ao deletar operador', err, { ip });
    return NextResponse.json(
      { sucesso: false, mensagem: 'Erro interno ao remover colaborador.' },
      { status: 500 }
    );
  }
}