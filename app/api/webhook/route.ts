import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/api-clients';
import { sendOrderConfirmation } from '@/lib/email';
import { createPrintJob } from '@/lib/print-service';
import { ORDER_STATUS, type Order } from '@/app/types/order';

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
        const order = await kv.get(`order:${orderId}`) as Order | null;
        if (!order) throw new Error('Order not found');

        if (!order.printFile) {
          throw new Error('Print file not found for order');
        }

        const customerEmail = session.customer_details?.email || undefined;

        await createPrintJob({
          orderId,
          printFile: order.printFile,
          printSize: order.printSize,
          customerEmail
        });

        const updatedOrder = {
          ...order,
          status: ORDER_STATUS.PROCESSING,
          paymentId: session.payment_intent ? session.payment_intent.toString() : undefined,
          email: customerEmail
        };

        await kv.set(`order:${orderId}`, updatedOrder);

        if (customerEmail) {
          await sendOrderConfirmation(updatedOrder);
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