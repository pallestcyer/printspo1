import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';
import { sendOrderConfirmation } from '@/lib/email';
import { createPrintJob } from '@/lib/print-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          // Get order details
          const order = await kv.get(`order:${orderId}`);
          if (!order) throw new Error('Order not found');

          // Update order status
          const updatedOrder = {
            ...order,
            status: 'paid',
            paymentId: session.payment_intent,
            shippingAddress: session.shipping_details,
            customerEmail: session.customer_details?.email,
          };
          
          await kv.set(`order:${orderId}`, updatedOrder);

          // Send to print service
          await createPrintJob({
            orderId,
            printFileUrl: order.printFileUrl,
            printSize: order.printSize,
            shippingAddress: session.shipping_details,
          });

          // Send confirmation email
          await sendOrderConfirmation({
            orderId,
            customerEmail: session.customer_details?.email!,
            orderDetails: updatedOrder,
          });
        }
        break;
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

export const config = {
  api: {
    bodyParser: false,
  },
};