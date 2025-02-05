import { NextResponse } from 'next/server';
import { stripe } from '@/lib/api-clients';
import { resend } from '@/lib/api-clients';
import { kv } from '@vercel/kv';

export async function GET() {
  const results = {
    stripe: false,
    resend: false,
    kv: false,
  };

  try {
    console.log('Testing Stripe connection...');
    try {
      // Simpler Stripe test
      const balance = await stripe.balance.retrieve();
      results.stripe = true;
      console.log('✅ Stripe connection successful');
    } catch (e) {
      console.error('❌ Stripe error:', e);
    }

    console.log('Testing Resend connection...');
    try {
      // Simpler Resend test
      const domains = await resend.domains.list();
      results.resend = true;
      console.log('✅ Resend connection successful');
    } catch (e) {
      console.error('❌ Resend error:', e);
    }

    console.log('Testing KV connection...');
    try {
      await kv.set('test', 'value');
      results.kv = true;
      console.log('✅ KV connection successful');
    } catch (e) {
      console.error('❌ KV error:', e);
    }

    return NextResponse.json({
      message: 'Service check complete',
      results
    });
  } catch (error) {
    console.error('Service check error:', error);
    return NextResponse.json({
      message: 'Service check failed',
      results,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 