import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { ORDER_STATUS, type Order } from '@/app/types/order';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const { layout, printSize } = await req.json();
    const orderId = crypto.randomUUID();

    const order: Order = {
      id: orderId,
      layout,
      printSize,
      status: ORDER_STATUS.PENDING,
      createdAt: new Date().toISOString()
    };

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'], // Add countries you want to ship to
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0,
              currency: 'usd',
            },
            display_name: 'Free shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 5,
              },
              maximum: {
                unit: 'business_day',
                value: 7,
              },
            },
          },
        },
      ],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Print ${printSize.width}" × ${printSize.height}"`,
          },
          unit_amount: printSize.price * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/orders/${orderId}/success`,
      cancel_url: `${baseUrl}/orders/${orderId}/cancel`,
      metadata: {
        orderId
      }
    });

    // Store order in KV
    await kv.set(`order:${orderId}`, order);

    return NextResponse.json({
      sessionId: session.id,
      orderId
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
} 