import { type PrintSize } from '@/app/types/order';
import Stripe from 'stripe';

const STRIPE_VARIANT_MAP = {
  '8.5x11': 'price_8x11',
  '11x14': 'price_11x14',
  '16x20': 'price_16x20',
  '20x30': 'price_20x30'
} as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15'
});

export function getPrintSizeVariantId(size: PrintSize): string {
  const variantId = STRIPE_VARIANT_MAP[size.name as keyof typeof STRIPE_VARIANT_MAP];
  if (!variantId) {
    throw new Error(`No Stripe variant ID found for print size: ${size.name}`);
  }
  return variantId;
}

export async function getOrder(orderId: string): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.retrieve(orderId, {
      expand: ['line_items', 'customer']
    });
    return session;
  } catch (error) {
    console.error('Failed to fetch order:', error);
    throw error;
  }
} 