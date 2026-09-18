import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { email, codigo, nome, senha } = await request.json();

    if (!email || !codigo || !nome || !senha) {
      return NextResponse.json({ sucesso: false, mensagem: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    const emailLimpo = email.trim().toLowerCase();
    const codigoLimpo = codigo.trim().toUpperCase();

    // 1. Verifica se existe um convite pendente para este e-mail
    const { data: convite, error: erroConvite } = await supabaseAdmin
      .from('convites_equipe')
      .select('*')
      .eq('email', emailLimpo)
      .eq('codigo_verificacao', codigoLimpo)
      .eq('status', 'PENDENTE')
      .single();

    if (erroConvite || !convite) {
      return NextResponse.json({ sucesso: false, mensagem: 'Código de convite inválido ou e-mail incorreto.' }, { status: 400 });
    }

    // =======================================================
    // 2. VALIDAÇÃO DE EXPIRAÇÃO DE 15 MINUTOS E DELEÇÃO
    // =======================================================
    const tempoCriacao = new Date(convite.criado_em).getTime();
    const tempoAtual = new Date().getTime();
    const diferencaMinutos = (tempoAtual - tempoCriacao) / (1000 * 60);

    if (diferencaMinutos > 15) {
      // Se passou de 15 minutos, DELETA o convite automaticamente do banco!
      await supabaseAdmin.from('convites_equipe').delete().eq('id', convite.id);
      
      return NextResponse.json({ 
        sucesso: false, 
        mensagem: 'Este convite expirou (limite de 15 minutos excedido). O convite foi cancelado, peça ao gerente para enviar um novo.' 
      }, { status: 400 });
    }
    // =======================================================

    // 3. Cria o hash seguro da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // 4. Cadastra o operador na tabela oficial vinculado à empresa
    const { error: erroCriacao } = await supabaseAdmin
      .from('operadores')
      .insert([{
        nome: nome.trim(),
        email: emailLimpo,
        senha_hash: senhaHash,
        empresa_id: convite.empresa_id,
        role: 'atendente' // Aqui você pode depois resgatar o cargo exato se quiser
      }]);

    if (erroCriacao) {
      return NextResponse.json({ sucesso: false, mensagem: 'Erro ao criar conta no banco de dados.' }, { status: 500 });
    }

    // 5. Como o funcionário se cadastrou com sucesso, deletamos o convite (ou mudamos para ACEITO)
    // Para manter a tabela limpa como você pediu, vamos deletar o convite usado!
    await supabaseAdmin
      .from('convites_equipe')
      .delete()
      .eq('id', convite.id);

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Conta ativada com sucesso!' 
    });

  } catch (err) {
    console.error("ERRO AO ACEITAR CONVITE:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno no servidor.' }, { status: 500 });
  }
}