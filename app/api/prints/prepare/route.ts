import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { print_size, images, layout_id } = body;

    // Create print record in your database
    const printOrder = {
      id: crypto.randomUUID(),
      status: 'pending',
      layout: layout_id,
      size: print_size,
      images: images,
      created_at: new Date().toISOString()
    };

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${print_size.name} Print Layout`,
            description: `Custom print layout (${print_size.width}x${print_size.height})`,
          },
          unit_amount: print_size.price * 100, // Convert to cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/prints/${printOrder.id}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/prints/${printOrder.id}/cancel`,
      metadata: {
        print_id: printOrder.id
      }
    });

    return NextResponse.json({
      printId: printOrder.id,
      sessionUrl: session.url
    });
  } catch (error) {
    console.error('Print preparation error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare print order' },
      { status: 500 }
    );
  }
} 