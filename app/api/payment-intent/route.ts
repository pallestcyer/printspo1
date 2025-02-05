import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import crypto from 'crypto';
import { kv } from '@vercel/kv';
import { ORDER_STATUS, type Order } from '@/app/types/order';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

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
    });

    // Store order after successful payment intent creation
    const order: Order = {
      id: orderId,
      layout,
      printSize,
      status: ORDER_STATUS.PENDING,
      createdAt: new Date().toISOString()
    };

    await kv.set(`order:${orderId}`, order);

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