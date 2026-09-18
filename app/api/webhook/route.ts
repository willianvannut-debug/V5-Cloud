import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 1. Inicia o Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// A chave secreta do Webhook (whsec_...)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  // 2. Precisamos pegar o "texto puro" da requisição para verificar o selo de segurança
  const body = await req.text(); 
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // 3. Verifica a assinatura. Se for um hacker tentando forjar, essa linha dá erro e bloqueia.
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️ Tentativa de fraude ou erro no Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 4. Se a assinatura for válida, verificamos o tipo de aviso que o Stripe mandou
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Pegamos o e-mail de quem acabou de pagar
    const emailCliente = session.customer_details?.email;
    
    console.log(`💰 SUCESSO! Pagamento recebido do e-mail: ${emailCliente}`);

    // 5. ATUALIZAR O BANCO DE DADOS (SUPABASE)
    // Aqui usamos a chave SUPABASE_SERVICE_ROLE_KEY que vi no seu print.
    // Ela dá poder absoluto ao servidor para atualizar a conta do cliente sem precisar de login.
    if (emailCliente) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // <-- Usando a chave com superpoderes
      );

      // Exemplo: Atualiza a tabela 'usuarios', mudando o plano para 'pago' onde o e-mail bater
      const { error } = await supabase
        .from('usuarios') // Troque pelo nome real da sua tabela de usuários
        .update({ status_assinatura: 'ativo' })
        .eq('email', emailCliente);

      if (error) {
        console.error('Erro ao atualizar o Supabase:', error);
      } else {
        console.log(`✅ Cliente ${emailCliente} liberado no sistema!`);
      }
    }
  }

  // 6. Retorna 200 OK rápido pro Stripe não tentar reenviar a mensagem
  return NextResponse.json({ recebido: true }, { status: 200 });
}