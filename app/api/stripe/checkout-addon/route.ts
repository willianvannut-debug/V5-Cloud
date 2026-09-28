import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inicializa o Stripe com a tua chave secreta do .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2023-10-16' as any 
});

export async function POST(req: Request) {
  try {
    const { empresaId } = await req.json();

    if (!empresaId) {
      return NextResponse.json({ error: "ID da empresa em falta." }, { status: 400 });
    }

    const PRICE_ID_ADDON = process.env.STRIPE_PRICE_ADDON_IFRAME;

    if (!PRICE_ID_ADDON) {
      return NextResponse.json({ error: "Preço do Add-on não configurado." }, { status: 500 });
    }

    // A url do teu site (localhost no desenvolvimento, domínio real em produção)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Cria a sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], 
      mode: 'subscription',
      line_items: [
        {
          price: PRICE_ID_ADDON,
          quantity: 1,
        },
      ],
      client_reference_id: empresaId,
      // 🚀 PARTE 1 ADICIONADA: Metadados para identificar o tipo de compra no Webhook
      metadata: {
        tipo: 'addon_iframe',
        empresaId: empresaId
      },
      success_url: `${baseUrl}/dashboard/viabilidade?addon_sucesso=true`,
      cancel_url: `${baseUrl}/dashboard/viabilidade`,
    });

    // Devolve o link seguro do Stripe para o navegador
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Erro no Stripe Checkout Addon:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}