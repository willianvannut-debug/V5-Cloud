import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ehChavePlano, precoEmCentavos, PLANOS_V5 } from '@/lib/planos-v5';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, intervalo, empresaId, chavePlano, whatsapp, cep, nome } = body;

    // ✅ Valida o plano no servidor — ignora precoCentavos do browser
    const planoNormalizado = String(chavePlano || '').toLowerCase().trim();
    if (!ehChavePlano(planoNormalizado)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    const intervaloValido = intervalo === 'year' ? 'year' : 'month';

    // ✅ Preço calculado pelo servidor, nunca pelo cliente
    const precoCentavos = precoEmCentavos(planoNormalizado, intervaloValido);
    const nomePlano = PLANOS_V5[planoNormalizado].nome;

    console.log(`🛒 [API CHECKOUT] Email: ${email} | Plano: ${planoNormalizado} | Intervalo: ${intervaloValido} | Preço: R$ ${precoCentavos / 100}`);

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
            product_data: { name: nomePlano },
            unit_amount: precoCentavos,
            recurring: { interval: intervaloValido },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      metadata: {
        empresaId: empresaId || '',
        plano: planoNormalizado,
        whatsapp: whatsapp || '',
        cep: cep || '',
        nomeGestor: nome || '',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Erro no checkout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
