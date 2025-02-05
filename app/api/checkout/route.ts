import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export async function POST(req: Request) {
  try {
    const { images, printSize } = await req.json();
    
    // Generate unique order ID
    const orderId = crypto.randomUUID();

    // Create order record
    const order = {
      id: orderId,
      images,
      printSize,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Store order in KV database
    await kv.set(`order:${orderId}`, order);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${printSize.width}x${printSize.height} Print`,
            description: `Custom photo print (${printSize.width}"x${printSize.height}")`,
          },
          unit_amount: printSize.price * 100, // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/cancel`,
      metadata: {
        orderId,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      orderId,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 