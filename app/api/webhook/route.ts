import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import { ORDER_STATUS, type Order } from '@/app/types/order';
import { OrderConfirmationEmail } from '@/components/emails/OrderConfirmationEmail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.warn('Resend API key not configured, skipping email notification');
      return NextResponse.json({ message: 'Webhook processed (email disabled)' });
    }

    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature')!;

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Add null check for success_url
      if (!session.success_url) {
        throw new Error('Missing success_url in session');
      }

      const orderId = session?.metadata?.orderId;
      if (!orderId) {
        console.error('No order ID found in session metadata');
        return new Response('No order ID found', { status: 400 });
      }
      
      // Get order details from KV store
      const order = await kv.get(`order:${orderId}`) as Order;
      if (!order) throw new Error(`Order not found: ${orderId}`);

      // Update order status
      await kv.set(`order:${orderId}`, {
        ...order,
        status: ORDER_STATUS.PAID,
        shippingAddress: session.shipping_details,
        shippingOption: session.shipping_cost,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        updatedAt: new Date().toISOString()
      });

      // Get shipping method display name with proper null checks
      const shippingRate = session.shipping_cost?.shipping_rate;
      const shippingMethod = typeof shippingRate === 'object' && shippingRate
        ? shippingRate.display_name || 'Standard Shipping'
        : 'Standard Shipping';

      // Send confirmation email using sendEmail
      await resend.sendEmail({
        from: 'Printspo <orders@printspo.ca>',
        to: session.customer_details?.email || 'support@printspo.ca',
        subject: `Order Confirmed - ${orderId}`,
        react: OrderConfirmationEmail({
          orderId,
          customerName: session.shipping_details?.name,
          shippingAddress: session.shipping_details,
          shippingMethod,
          orderDetails: [order],  // Wrap the order in an array
          totalAmount: session.amount_total ? session.amount_total / 100 : 0,
        }),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Configure to only accept POST requests
export const GET = () => new Response(null, { status: 405 });