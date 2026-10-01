import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 🚀 Incluímos whatsapp e cep no desmembramento do body
    const { email, nomePlano, precoCentavos, intervalo, empresaId, chavePlano, whatsapp, cep, nome, senha } = body;

    const planoNormalizado = String(chavePlano || 'pro').toLowerCase().trim();

    console.log(`🛒 [API CHECKOUT] Email: ${email} | Plano: ${planoNormalizado}`);

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const successUrl = empresaId 
      ? `${baseUrl}/dashboard?mudanca_plano_sucesso=true&novo_plano=${planoNormalizado}&empresa_id=${empresaId}`
      : `${baseUrl}/login?pagamento=sucesso&plano=${planoNormalizado}`;

    const cancelUrl = `${baseUrl}/planos?pagamento=cancelado`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: nomePlano,
            },
            unit_amount: precoCentavos,
            recurring: {
              interval: intervalo || 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // 🚀 Guardamos os dados essenciais de cadastro no metadata do Stripe
      metadata: {
        empresaId: empresaId || '',
        plano: planoNormalizado,
        whatsapp: whatsapp || '',
        cep: cep || '',
        nomeGestor: nome || '',
        // Nota: A senha não deve ir para o Stripe por segurança, vamos guardá-la de outra forma ou criamos a conta na rota de registo antes.
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
    
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}