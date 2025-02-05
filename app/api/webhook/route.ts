import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/api-clients';
import { sendOrderConfirmation } from '@/lib/email';
import { createPrintJob } from '@/lib/print-service';

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get('stripe-signature')!;

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        // Get order details
        const order = await kv.get(`order:${orderId}`);
        if (!order) throw new Error('Order not found');

        // Create print job
        await createPrintJob({
          orderId,
          printFile: order.printFile,
          printSize: order.printSize,
          customerEmail: session.customer_details?.email
        });

        // Update order status
        const updatedOrder = {
          ...order,
          status: 'processing',
          paymentId: session.payment_intent,
          customerEmail: session.customer_details?.email,
        };

        await kv.set(`order:${orderId}`, updatedOrder);

        // Send confirmation email
        if (session.customer_details?.email) {
          await sendOrderConfirmation({
            orderId,
            customerEmail: session.customer_details.email,
            orderDetails: updatedOrder,
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}