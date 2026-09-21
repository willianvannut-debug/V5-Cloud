import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializa o Stripe e o Supabase Admin (para ignorar o RLS)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    // Verifica se a mensagem veio mesmo do Stripe e não de um hacker
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`❌ Erro de Assinatura Webhook: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      
      // 1️⃣ Quando a pessoa paga pela primeira vez ou muda de plano
      // Guardamos o stripe_customer_id para sabermos quem ele é no futuro!
      case 'checkout.session.completed':
        const empresaId = session.metadata?.empresaId;
        const novoStripeCustomerId = session.customer;
        
        if (empresaId && novoStripeCustomerId) {
          await supabaseAdmin
            .from('empresas')
            .update({ 
              stripe_customer_id: novoStripeCustomerId,
              status_assinatura: 'ativa' 
            })
            .eq('id', empresaId);
            console.log(`✅ Cliente Stripe vinculado à Empresa: ${empresaId}`);
        }
        break;

      // 2️⃣ Quando a mensalidade bate no cartão e FALHA (sem limite, bloqueado, etc)
      case 'invoice.payment_failed':
        const failedCustomerId = session.customer;
        
        if (failedCustomerId) {
          await supabaseAdmin
            .from('empresas')
            .update({ status_assinatura: 'inadimplente' })
            .eq('stripe_customer_id', failedCustomerId);
            console.log(`⛔ Pagamento falhou! Empresa com Customer ID ${failedCustomerId} bloqueada.`);
        }
        break;

      // 3️⃣ Quando a assinatura é cancelada definitivamente
      case 'customer.subscription.deleted':
        const deletedCustomerId = session.customer;
        
        if (deletedCustomerId) {
          await supabaseAdmin
            .from('empresas')
            .update({ status_assinatura: 'cancelada' })
            .eq('stripe_customer_id', deletedCustomerId);
            console.log(`❌ Assinatura cancelada para o Customer ID ${deletedCustomerId}`);
        }
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Erro interno no processamento do webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}