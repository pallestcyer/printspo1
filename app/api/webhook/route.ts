import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';
import { ORDER_STATUS, type Order, type OrderStatus } from '@/app/types/order';
import { sendOrderConfirmation, sendAdminNotification } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;
    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      
      if (!orderId) throw new Error('No order ID in session metadata');

      const order = await kv.get(`order:${orderId}`) as Order | null;
      if (!order) throw new Error('Order not found');

      // Clean and validate shipping address data
      const shippingAddress = session.shipping_details ? {
        name: session.shipping_details.name || undefined,
        line1: session.shipping_details.address?.line1 || '',
        line2: session.shipping_details.address?.line2 || undefined,
        city: session.shipping_details.address?.city || '',
        state: session.shipping_details.address?.state || '',
        postal_code: session.shipping_details.address?.postal_code || '',
        country: session.shipping_details.address?.country || ''
      } : undefined;

      const updatedOrder: Order = {
        ...order,
        status: ORDER_STATUS.PROCESSING,
        paymentId: session.payment_intent as string,
        customerEmail: session.customer_details?.email || undefined,
        shippingAddress,
        printJobCreatedAt: new Date().toISOString()
      };

      await kv.set(`order:${orderId}`, updatedOrder);

      const customerEmail = session.customer_details?.email;
      if (customerEmail) {
        await sendOrderConfirmation(updatedOrder);
        await sendAdminNotification(updatedOrder);
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