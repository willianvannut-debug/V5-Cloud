import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text(); 
  
  // No Next.js moderno, headers() pode requerer await
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️ Tentativa de fraude ou erro no Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const emailCliente = session.customer_details?.email;
    const metadata = session.metadata || {};
    const empresaId = metadata.empresaId;
    const planoComprado = metadata.plano || 'pro';
    
    console.log(`💰 SUCESSO! Pagamento recebido do e-mail: ${emailCliente} | Empresa ID: ${empresaId} | Plano: ${planoComprado}`);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      let error = null;

      // Se tivermos o ID da empresa guardado nos metadados, atualizamos diretamente por ele
      if (empresaId) {
        const updateRes = await supabase
          .from('empresas') // Certifique-se se a tabela é 'empresas' ou 'usuarios'
          .update({ 
            plano: planoComprado,
            status_assinatura: 'ativo' 
          })
          .eq('id', empresaId);
        error = updateRes.error;
      } else if (emailCliente) {
        // Fallback caso o ID venha vazio: atualiza pelo e-mail
        const updateRes = await supabase
          .from('empresas')
          .update({ 
            plano: planoComprado,
            status_assinatura: 'ativo' 
          })
          .eq('email', emailCliente);
        error = updateRes.error;
      }

      if (error) {
        console.error('Erro ao atualizar o Supabase via Webhook:', error);
      } else {
        console.log(`✅ Empresa/Cliente liberado no sistema com o plano ${planoComprado.toUpperCase()}!`);
      }
    }
  }

  return NextResponse.json({ recebido: true }, { status: 200 });
}