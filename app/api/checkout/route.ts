import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, nomePlano, precoCentavos, intervalo, empresaId, chavePlano } = body;

    const planoNormalizado = String(chavePlano || 'pro').toLowerCase().trim();

    console.log(`🛒 [API CHECKOUT] Empresa ID: ${empresaId} | Email: ${email} | Plano: ${planoNormalizado}`);

    // 🚀 DETECÇÃO INTELIGENTE DE URL LOCAL OU PRODUÇÃO
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // 🚀 AQUI ESTÁ A MÁGICA: Se tem empresaId, força o redirecionamento para o Dashboard com os parâmetros certos!
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
      metadata: {
        empresaId: empresaId || '',
        plano: planoNormalizado,
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