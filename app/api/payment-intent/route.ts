import { NextResponse } from 'next/server';
import { stripe } from '@/lib/api-clients';
import { storeOrderData } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const { printSize, layout } = await req.json();
    const orderId = crypto.randomUUID();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: printSize.price * 100,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: { orderId }
    }, {
      apiVersion: '2023-10-16',
      stripeAccount: process.env.STRIPE_ACCOUNT_ID
    });

    // Store order after successful payment intent creation
    const order = {
      id: orderId,
      layout,
      printSize,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await storeOrderData(orderId, order);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
} 