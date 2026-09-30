// ================================================================================
// 💳 ROTA DE UPGRADE DE PLANO COM PRÓ-RATA AUTOMÁTICO E ATUALIZAÇÃO LGPD/IFRAME
// app/api/assinatura/upgrade/route.ts
// ================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

// 1. Inicializa o Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// 2. Chaves de segurança
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'v5_cloud_secret_key_super_segura_2026'
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    // 1. Validar a sessão do utilizador (segurança primeiro)
    const cookieStore = await cookies();
    const token = cookieStore.get('v5_session')?.value;

    if (!token) {
      return NextResponse.json({ sucesso: false, mensagem: 'Não autenticado.' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const empresaId = payload.empresaId as string;

    if (!empresaId) {
       return NextResponse.json({ sucesso: false, mensagem: 'Sessão inválida: Empresa não encontrada.' }, { status: 400 });
    }

    // 2. Pegar os dados que o Frontend enviou (Novo Price ID do Stripe e Nome do Plano)
    const body = await request.json();
    const { novo_price_id, novo_plano } = body;

    if (!novo_price_id || !novo_plano) {
       return NextResponse.json({ sucesso: false, mensagem: 'Faltam os dados do novo plano.' }, { status: 400 });
    }

    // 3. Buscar os dados da empresa no Supabase para pegar o Customer ID do Stripe
    const { data: empresa, error } = await supabaseAdmin
      .from('empresas')
      .select('stripe_customer_id, plano')
      .eq('id', empresaId)
      .single();

    if (error || !empresa?.stripe_customer_id) {
       return NextResponse.json({ sucesso: false, mensagem: 'Cliente Stripe não encontrado para esta empresa.' }, { status: 404 });
    }

    // 4. Buscar a assinatura ATUAL do cliente no Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: empresa.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ sucesso: false, mensagem: 'Nenhuma assinatura ativa encontrada no Stripe para fazer upgrade.' }, { status: 404 });
    }

    const subscriptionAtual = subscriptions.data[0];
    const itemDaAssinatura = subscriptionAtual.items.data[0];

    // 5. Fazer o Upgrade no Stripe com Pró-rata automático!
    const updatedSubscription = await stripe.subscriptions.update(subscriptionAtual.id, {
      items: [
        {
          id: itemDaAssinatura.id, // ID do item atual que vamos substituir
          price: novo_price_id,    // O novo Price ID do Stripe (ex: price_xxxxxx do plano Scale)
        },
      ],
      // 🚀 A MÁGICA ESTÁ AQUI: Cria o crédito dos dias não usados do plano anterior!
      proration_behavior: 'create_prorations', 
    });

    // 6. Atualizar o plano E AS PERMISSÕES DO ADDON no Supabase imediatamente
    const planoLimpo = novo_plano.toLowerCase();
    
    // O addon do iframe só é liberado para Pro, Scale e Enterprise
    const liberaAddon = planoLimpo === 'pro' || planoLimpo === 'scale' || planoLimpo === 'enterprise';

    await supabaseAdmin
      .from('empresas')
      .update({ 
        plano: planoLimpo,
        addon_iframe: liberaAddon 
      })
      .eq('id', empresaId);

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Upgrade realizado com sucesso! O valor será ajustado proporcionalmente.',
      subscription: updatedSubscription
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erro no upgrade da assinatura:', error.message);
    return NextResponse.json({ sucesso: false, mensagem: error.message }, { status: 500 });
  }
}