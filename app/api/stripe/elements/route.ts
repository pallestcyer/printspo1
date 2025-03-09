import { NextResponse } from 'next/server';
import { stripe } from '../../../../lib/api-clients';

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true
      }
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Stripe elements error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
} 