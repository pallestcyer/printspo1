import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import Stripe from 'stripe';
import { generatePrintFile } from '@/lib/print-generator';
import { uploadToS3 } from '@/lib/storage';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { layout, printSize, spacing } = await req.json();
    const orderId = crypto.randomUUID();

    // Generate print-ready file
    const printFile = await generatePrintFile({
      images: layout.images,
      printSize,
      spacing
    });

    // Upload to S3
    const fileUrl = await uploadToS3(printFile, `orders/${orderId}/print.jpg`);

    // Create order record
    const order = {
      id: orderId,
      layout,
      printSize,
      spacing,
      printFileUrl: fileUrl,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Store in KV
    await kv.set(`order:${orderId}`, order);

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${printSize.width}x${printSize.height} Custom Print`,
            description: `High-quality print layout (${printSize.width}"×${printSize.height}")`,
            images: [layout.images[0].url],
            metadata: { orderId }
          },
          unit_amount: printSize.price * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/cancel`,
      metadata: { orderId },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'], // Adjust as needed
      },
    });

    return NextResponse.json({ sessionId: session.id, orderId });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
} 