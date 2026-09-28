import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend'; 

// Inicializa o Stripe, Supabase Admin e o Resend
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  
  // Aguarda os headers (boas práticas para o Next.js mais recente)
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;

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
      
      // 1️⃣ Quando a pessoa paga com sucesso
      case 'checkout.session.completed': {
        const metadata = session.metadata || {};
        const empresaId = metadata.empresaId || session.client_reference_id;
        const tipoProduto = metadata.tipo; // Verifica se veio da compra do iFrame
        const planoComprado = metadata.plano || 'pro';
        const novoStripeCustomerId = session.customer;
        const emailCliente = session.customer_email || session.customer_details?.email;
        const nomeCliente = session.customer_details?.name || 'Cliente V5';
        const subscriptionId = session.subscription;

        // Verifica se o iFrame foi comprado (seja via metadado ou se estiver presente na assinatura)
        let isAddonIframe = tipoProduto === 'addon_iframe';

        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['items.data.price'],
            });

            // ID do preço do iFrame configurado no teu .env.local
            const ID_PRECO_IFRAME = process.env.STRIPE_IFRAME_PRICE_ID;

            const temItemIframe = subscription.items.data.some(
              (item: any) => item.price.id === ID_PRECO_IFRAME
            );

            if (temItemIframe) {
              isAddonIframe = true;
            }
          } catch (subError) {
            console.error('⚠️ Não foi possível expandir a assinatura no webhook:', subError);
          }
        }

        // =========================================================
        // 🚀 LÓGICA DO ADD-ON IFRAME (Recorrente ou Único)
        // =========================================================
        if (isAddonIframe) {
          console.log(`🔓 A libertar o Add-on iFrame no Supabase para a empresa: ${empresaId || emailCliente}`);
          
          let updateData: any = { addon_iframe: true };
          if (novoStripeCustomerId) updateData.stripe_customer_id = novoStripeCustomerId;

          let query = supabaseAdmin.from('empresas').update(updateData);
          
          if (empresaId) {
            query = query.eq('id', empresaId);
          } else if (emailCliente) {
            query = query.eq('email', emailCliente);
          } else {
            console.warn('⚠️ Webhook do iFrame recebido sem ID nem e-mail.');
            break;
          }

          const { error } = await query;
            
          if (error) {
            console.error('❌ Erro ao atualizar o Supabase para o iFrame:', error);
          } else {
            console.log(`🎉 iFrame libertado com sucesso na Base de Dados!`);
          }
        } 
        
        // =========================================================
        // 📦 LÓGICA DO PLANO PRINCIPAL E BOAS-VINDAS (Com Fallback por E-mail)
        // =========================================================
        else {
          console.log(`📦 A processar plano principal: ${planoComprado}`);

          let updateData = {
            plano: planoComprado,
            status_assinatura: 'ativa',
            ...(novoStripeCustomerId && { stripe_customer_id: novoStripeCustomerId })
          };

          let query = supabaseAdmin.from('empresas').update(updateData);

          if (empresaId) {
            query = query.eq('id', empresaId);
          } else if (emailCliente) {
            query = query.eq('email', emailCliente);
          } else {
            console.warn('⚠️ Webhook de plano recebido sem ID nem e-mail.');
            break;
          }

          const { error } = await query;

          if (error) {
            console.error('❌ Erro ao atualizar o plano no Supabase via Webhook:', error);
          } else {
            console.log(`✅ Empresa/Cliente liberado no sistema com o plano ${planoComprado.toUpperCase()}!`);
          }

          // Dispara o e-mail de boas-vindas logo após confirmar o pagamento do plano
          if (emailCliente) {
            try {
              await resend.emails.send({
                from: 'V5 Cloud <onboarding@resend.dev>',
                to: [emailCliente],
                subject: 'Bem-vindo à V5 Cloud! 🚀',
                html: `
                  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: auto; background-color: #f9f9f9; border-radius: 8px;">
                    <h2 style="color: #0070f3;">Olá, ${nomeCliente}!</h2>
                    <p>É um enorme prazer ter você a bordo da <strong>V5 Cloud</strong>.</p>
                    <p>O seu pagamento foi aprovado com sucesso e a sua conta já está ativa para gerir a sua operação com total autonomia e controlo.</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                      <a href="https://v5-cloud.vercel.app/login" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Acessar o Sistema</a>
                    </div>

                    <p>Se precisar de ajuda ou tiver alguma dúvida, a nossa equipa está sempre à disposição.</p>
                    <p style="margin-top: 30px;">Atenciosamente,<br><strong>Equipe V5 Cloud</strong></p>
                  </div>
                `,
              });
              console.log(`📧 E-mail de boas-vindas enviado com sucesso para: ${emailCliente}`);
            } catch (emailError) {
              console.error('❌ Erro ao enviar e-mail de boas-vindas:', emailError);
            }
          }
        }
        break;
      }

      // 2️⃣ Quando a mensalidade bate no cartão e FALHA (sem limite, bloqueado, etc)
      case 'invoice.payment_failed': {
        const failedCustomerId = session.customer;
        
        if (failedCustomerId) {
          await supabaseAdmin
            .from('empresas')
            .update({ status_assinatura: 'inadimplente' })
            .eq('stripe_customer_id', failedCustomerId);
            console.log(`⛔ Pagamento falhou! Empresa com Customer ID ${failedCustomerId} bloqueada.`);
        }
        break;
      }

      // 3️⃣ Quando a assinatura é cancelada definitivamente
      case 'customer.subscription.deleted': {
        const deletedCustomerId = session.customer;
        
        if (deletedCustomerId) {
          await supabaseAdmin
            .from('empresas')
            .update({ 
              status_assinatura: 'cancelada',
              addon_iframe: false // Remove o acesso ao iFrame se cancelar a subscrição
            })
            .eq('stripe_customer_id', deletedCustomerId);
            console.log(`❌ Assinatura cancelada para o Customer ID ${deletedCustomerId}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Erro interno no processamento do webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}