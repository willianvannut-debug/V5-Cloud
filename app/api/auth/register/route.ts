import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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