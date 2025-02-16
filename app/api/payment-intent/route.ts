import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import Stripe from 'stripe';
import crypto from 'crypto';
import type { Order, OrderStatus, Layout, PrintSize } from '@/app/types/order';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

interface _CreatePaymentIntentRequest {
  layout: Layout;
  printSize: PrintSize;
  spacing?: number;
  containMode?: boolean;
  printFile?: string;
  previewUrl?: string;
}

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
      status: 'pending' as OrderStatus,
      createdAt: new Date().toISOString(),
      spacing: 0,
      containMode: false,
      customerEmail: undefined,
      printFile: undefined,
      previewUrl: undefined
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