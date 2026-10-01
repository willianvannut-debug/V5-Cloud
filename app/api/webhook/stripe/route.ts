import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

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
  
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
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
        const tipoProduto = metadata.tipo;
        const planoComprado = metadata.plano || 'pro';
        const novoStripeCustomerId = session.customer;
        const emailCliente = session.customer_email || session.customer_details?.email;
        const nomeCliente = session.customer_details?.name || metadata.nomeGestor || 'Cliente V5';
        const subscriptionId = session.subscription;

        // 🚀 Recolhe o WhatsApp e o CEP vindos do metadata do Stripe
        const whatsappCliente = metadata.whatsapp || null;
        const cepCliente = metadata.cep || null;

        let isAddonIframe = tipoProduto === 'addon_iframe';

        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ['items.data.price'],
            });

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
        else {
          console.log(`📦 A processar plano principal: ${planoComprado}`);

          // 🚀 Se a empresa já existir (mudança de plano), atualiza. Se não existir (novo cadastro), criamos logo aqui!
          if (empresaId) {
            let updateData = {
              plano: planoComprado,
              status_assinatura: 'ativa',
              ...(novoStripeCustomerId && { stripe_customer_id: novoStripeCustomerId }),
              ...(whatsappCliente && { telefone: whatsappCliente }),
              ...(cepCliente && { cep: cepCliente })
            };

            const { error } = await supabaseAdmin.from('empresas').update(updateData).eq('id', empresaId);

            if (error) {
              console.error('❌ Erro ao atualizar o plano no Supabase via Webhook:', error);
            } else {
              console.log(`✅ Empresa atualizada com sucesso com o plano ${planoComprado.toUpperCase()}!`);
            }
          } else if (emailCliente) {
            // 🆕 NOVO CADASTRO VIA STRIPE: Procura ou cria a empresa com o WhatsApp e CEP do metadata
            const { data: empresaExistente } = await supabaseAdmin
              .from('empresas')
              .select('id')
              .eq('email', emailCliente.toLowerCase())
              .maybeSingle();

            let targetEmpresaId = empresaExistente?.id;

            if (!targetEmpresaId) {
              const codigoConviteGerado = Math.random().toString(36).substring(2, 8).toUpperCase();
              const { data: novaEmpresa, error: errEmpresa } = await supabaseAdmin
                .from('empresas')
                .insert([{
                  nome_empresa: nomeCliente ? `Provedor de ${nomeCliente}` : 'Minha Provedora',
                  plano: planoComprado,
                  status_assinatura: 'ativa',
                  codigo_convite: codigoConviteGerado,
                  ...(novoStripeCustomerId && { stripe_customer_id: novoStripeCustomerId }),
                  ...(whatsappCliente && { telefone: whatsappCliente }),
                  ...(cepCliente && { cep: cepCliente })
                }])
                .select()
                .single();

              if (!errEmpresa && novaEmpresa) {
                targetEmpresaId = novaEmpresa.id;

                // Cria o operador gestor vinculado
                await supabaseAdmin.from('operadores').insert([{
                  nome: nomeCliente,
                  email: emailCliente.toLowerCase(),
                  senha_hash: await bcrypt.hash('V5@2026Secure', 10), // Senha padrão temporária caso venha direto do checkout
                  role: 'gerente',
                  empresa_id: targetEmpresaId
                }]);
              }
            } else {
              await supabaseAdmin.from('empresas').update({
                plano: planoComprado,
                status_assinatura: 'ativa',
                ...(novoStripeCustomerId && { stripe_customer_id: novoStripeCustomerId }),
                ...(whatsappCliente && { telefone: whatsappCliente }),
                ...(cepCliente && { cep: cepCliente })
              }).eq('id', targetEmpresaId);
            }
          }

          // Dispara o e-mail de boas-vindas
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

      // 2️⃣ Pagamento falhou
      case 'invoice.payment_failed': {
        const failedCustomerId = session.customer;
        if (failedCustomerId) {
          await supabaseAdmin
            .from('empresas')
            .update({ status_assinatura: 'inadimplente' })
            .eq('stripe_customer_id', failedCustomerId);
        }
        break;
      }

      // 3️⃣ Assinatura cancelada
      case 'customer.subscription.deleted': {
        const deletedCustomerId = session.customer;
        if (deletedCustomerId) {
          await supabaseAdmin
            .from('empresas')
            .update({ 
              status_assinatura: 'cancelada',
              addon_iframe: false 
            })
            .eq('stripe_customer_id', deletedCustomerId);
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