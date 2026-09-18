import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nomePlano, precoCentavos, intervalo, empresaId, chavePlano } = body;

    // 🚀 Normaliza a chave do plano (ex: 'essencial', 'pro', 'scale', 'enterprise')
    const planoNormalizado = String(chavePlano || 'pro').toLowerCase().trim();

    console.log(`🛒 [API CHECKOUT] Empresa ID: ${empresaId} | Plano Nome: ${nomePlano} | Chave Plano: ${planoNormalizado}`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://v5-cloud.vercel.app';

    // 🚀 Monta a URL de sucesso injetando tanto o ID da empresa quanto a chave exata do plano
    const params = new URLSearchParams({
      session_id: '{CHECKOUT_SESSION_ID}'
    });
    if (empresaId) params.append('empresa_id', empresaId);
    if (planoNormalizado) params.append('plano', planoNormalizado);

    const successUrl = `${baseUrl}/pos-pagamento?${params.toString()}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
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
      // Metadados úteis caso você use webhooks do Stripe no futuro
      metadata: {
        empresaId: empresaId || '',
        plano: planoNormalizado,
      },
      success_url: successUrl,
      cancel_url: `${baseUrl}/planos?pagamento=cancelado`,
    });

    return NextResponse.json({ url: session.url });
    
  } catch (error: any) {
    console.error("Erro no checkout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}