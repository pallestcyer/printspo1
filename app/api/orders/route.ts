import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import Stripe from 'stripe';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const { layout, printSize, spacing, printFile } = await req.json();
    const orderId = crypto.randomUUID();

    // Store order with print file
    const order = {
      id: orderId,
      layout,
      printSize,
      spacing,
      printFile,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await kv.set(`order:${orderId}`, order);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'apple_pay'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${printSize.width}x${printSize.height} Custom Print`,
            description: `High-quality print layout (${printSize.width}"×${printSize.height}")`,
            images: [printFile], // Use actual print preview
            metadata: { orderId }
          },
          unit_amount: Math.round(printSize.price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/orders/${orderId}/success`,
      cancel_url: `${baseUrl}/orders/${orderId}/cancel`,
      metadata: { orderId }
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      orderId,
      success: true 
    });

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({
      error: 'Failed to create order',
      details: error.message
    }, { status: 500 });
  }
} 