import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 🚀 LIMITES CORRIGIDOS E ALINHADOS COM O PAINEL DE PLANOS
const PLANOS_LIMITES: Record<string, { max_usuarios: number; max_tecnicos: number }> = {
  essencial: { max_usuarios: 1, max_tecnicos: 2 },
  pro: { max_usuarios: 3, max_tecnicos: 10 },
  scale: { max_usuarios: 10, max_tecnicos: 30 },
  enterprise: { max_usuarios: 9999, max_tecnicos: 9999 } // 9999 representa ilimitado
};

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
    const codigoConvite = body.codigoConvite;
    
    // 🚀 Puxa o plano que veio da tela de pós-pagamento (ou cai pro essencial por segurança)
    const planoComprado = (body.plano || 'essencial').toLowerCase();
    
    // 🛠️ Recebe o tipo/cargo escolhido no cadastro (ex: 'atendente' ou 'tecnico')
    const tipoColaborador = body.tipo || body.cargo || 'atendente';

    if (!nomeOperador || !email || !senha) {
      return NextResponse.json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    const emailLimpo = email.trim().toLowerCase();

    // 1. Verifica se já existe um operador com esse e-mail
    const { data: operadorExistente } = await supabaseAdmin
      .from('operadores')
      .select('id')
      .eq('email', emailLimpo)
      .maybeSingle();

    if (operadorExistente) {
      return NextResponse.json({ sucesso: false, mensagem: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 });
    }

    let empresaIdFinal: string;
    let cargoFinal = 'gerente';

    const codigoLimpo = codigoConvite ? String(codigoConvite).trim() : '';

    // 2. Lógica de Convite vs Nova Empresa
    if (codigoLimpo !== '' && codigoLimpo !== 'undefined' && codigoLimpo !== 'null') {
      const codigoBusca = codigoLimpo.toUpperCase();

      const { data: empresaEncontrada, error: erroBuscaEmpresa } = await supabaseAdmin
        .from('empresas')
        .select('id, codigo_convite, plano')
        .eq('codigo_convite', codigoBusca)
        .maybeSingle();

      if (erroBuscaEmpresa || !empresaEncontrada) {
        return NextResponse.json({ sucesso: false, mensagem: 'Código de convite inválido ou empresa não encontrada.' }, { status: 400 });
      }

      empresaIdFinal = empresaEncontrada.id;
      
      // Define se vai entrar como técnico ou atendente/vendedor
      const isTecnico = tipoColaborador.toLowerCase().includes('tec') || tipoColaborador.toLowerCase().includes('campo');
      cargoFinal = isTecnico ? 'tecnico' : 'atendente';

      // 🔒 VALIDAÇÃO DE LIMITE ESPECÍFICA (Vendedores vs Técnicos)
      const planoEmpresa = (empresaEncontrada as any).plano || 'essencial';
      const limitesPermitidos = PLANOS_LIMITES[planoEmpresa] || PLANOS_LIMITES['essencial'];

      if (cargoFinal === 'tecnico') {
        // Conta quantos técnicos já existem
        const { count: totalTecnicosAtuais, error: erroContagemTec } = await supabaseAdmin
          .from('operadores')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaIdFinal)
          .eq('role', 'tecnico');

        if (!erroContagemTec && totalTecnicosAtuais !== null) {
          if (totalTecnicosAtuais >= limitesPermitidos.max_tecnicos) {
            return NextResponse.json({ 
              sucesso: false, 
              mensagem: `Limite de Técnicos atingido para o plano atual (${totalTecnicosAtuais}/${limitesPermitidos.max_tecnicos}).` 
            }, { status: 400 });
          }
        }
      } else {
        // Conta quantos atendentes/vendedores já existem
        const { count: totalAtendentesAtuais, error: erroContagemAtend } = await supabaseAdmin
          .from('operadores')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresaIdFinal)
          .in('role', ['atendente', 'vendedor']);

        if (!erroContagemAtend && totalAtendentesAtuais !== null) {
          if (totalAtendentesAtuais >= limitesPermitidos.max_usuarios) {
            return NextResponse.json({ 
              sucesso: false, 
              mensagem: `Limite de Vendedores/Atendentes atingido para o plano atual (${totalAtendentesAtuais}/${limitesPermitidos.max_usuarios}).` 
            }, { status: 400 });
          }
        }
      }

    } else {
      // 👑 Fluxo de Nova Assinatura (Gerente)
      if (!nomeEmpresa || nomeEmpresa.trim() === '') {
        return NextResponse.json({ sucesso: false, mensagem: 'O nome da empresa é obrigatório para novas assinaturas.' }, { status: 400 });
      }

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
            plano: planoComprado // Salva "pro", "scale" ou "essencial" dependendo do link
          }
        ])
        .select()
        .single();

      if (erroEmpresa) {
        return NextResponse.json({ sucesso: false, mensagem: `Erro ao registrar empresa: ${erroEmpresa.message}` }, { status: 500 });
      }

      empresaIdFinal = empresaCriada.id;
      cargoFinal = 'gerente';
    }

    // 3. Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // 4. Cria o Operador com o cargo correto ('gerente', 'atendente' ou 'tecnico')
    const { error: erroOperador } = await supabaseAdmin
      .from('operadores')
      .insert([
        {
          nome: nomeOperador.trim(),
          email: emailLimpo,
          senha_hash: senhaHash,
          role: cargoFinal,
          empresa_id: empresaIdFinal
        }
      ]);

    if (erroOperador) {
      return NextResponse.json({ sucesso: false, mensagem: `Erro ao criar operador: ${erroOperador.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: cargoFinal === 'gerente' ? 'Empresa e conta de gerente criadas com sucesso!' : 'Cadastro realizado com sucesso na equipe!' 
    });

  } catch (err: any) {
    console.error("ERRO NO REGISTRO:", err);
    return NextResponse.json({ sucesso: false, mensagem: 'Erro interno no servidor.' }, { status: 500 });
  }
}