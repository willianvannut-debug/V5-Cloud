//app/api/tecnicos/route.ts

import { NextResponse } from 'next/server';
import { verificarLimiteTecnicos } from '@/lib/verificarLimites';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // ATENÇÃO: Aqui você pegaria os dados reais do seu banco de dados
    const planoProvedor = 'pro'; // Simulação do plano do banco
    const totalTecnicosNoBanco = 10; // Simulação de quantos ele já tem
    
    // Chama o nosso porteiro
    const checagem = await verificarLimiteTecnicos(planoProvedor, totalTecnicosNoBanco);

    // Se estiver bloqueado, devolve o erro 403 sem salvar nada
    if (checagem.bloqueado) {
      return NextResponse.json({ erro: checagem.mensagem }, { status: 403 });
    }

    // Se passou, aqui você salva no banco de dados!
    return NextResponse.json({ sucesso: "Técnico cadastrado com sucesso!" }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ erro: "Erro interno no servidor" }, { status: 500 });
  }
}