import { type NextRequest } from 'next/server';
import OrderConfirmationEmail from '@/components/emails/OrderConfirmationEmail';
import { type Order, type ShippingAddress } from '@/app/types/order';
import { getOrder } from '@/lib/stripe-helpers';
import { sendEmail } from '@/lib/email';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const stripeEvent = await request.json();
    const session = await getOrder(stripeEvent.data.object.id) as Stripe.Checkout.Session;

    // Transform shipping address from Stripe format to our format
    const shippingAddress: ShippingAddress = {
      street: session.shipping_details?.address?.line1 || '',
      city: session.shipping_details?.address?.city || '',
      state: session.shipping_details?.address?.state || '',
      zipCode: session.shipping_details?.address?.postal_code || '',
      country: session.shipping_details?.address?.country || ''
    };

    // Get shipping method name
    const shippingRate = typeof session.shipping_cost?.shipping_rate === 'string' 
      ? 'Standard Shipping'
      : session.shipping_cost?.shipping_rate?.display_name || 'Standard Shipping';

    // Create the order object that matches our Order type
    const order: Order = {
      id: session.id,
      status: session.status || 'pending',
      customerName: session.customer_details?.name || 'Valued Customer',
      email: session.customer_details?.email || undefined,
      shippingAddress,
      shippingMethod: shippingRate,
      items: session.line_items?.data.map(item => ({
        id: item.id,
        name: item.description || '',
        quantity: item.quantity || 1,
        price: (item.amount_total || 0) / 100
      })) || [],
      totalAmount: (session.amount_total || 0) / 100,
      metadata: session.metadata || {}
    };

    const emailProps = {
      orderId: order.id,
      customerName: order.customerName,
      shippingAddress: order.shippingAddress,
      shippingMethod: order.shippingMethod,
      orderDetails: {
        items: order.items,
        boards: order.boards
      },
      totalAmount: order.totalAmount,
      order,
      metadata: order.metadata
    };

    // Send email
    const emailComponent = OrderConfirmationEmail(emailProps);
    if (emailComponent) {
      await sendEmail({
        to: session.customer_details?.email || '',
        subject: `Order Confirmation - ${order.id}`,
        component: emailComponent
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500 }
    );
  }
}

// Configure to only accept POST requests
export const GET = () => new Response(null, { status: 405 });