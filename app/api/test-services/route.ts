import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

export async function GET() {
  const results = {
    stripe: false,
    kv: false
  };
  
  try {
    // Test Stripe
    const stripeTest = await stripe.paymentIntents.list({ limit: 1 });
    results.stripe = !!stripeTest.data;

    // Test KV
    await kv.set('test-key', 'test-value');
    const kvTest = await kv.get('test-key');
    results.kv = kvTest === 'test-value';
    await kv.del('test-key');

    return NextResponse.json(results);
  } catch (error) {
    console.error('Service test error:', error);
    return NextResponse.json({
      results,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 