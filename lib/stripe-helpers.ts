import { PrintSize } from '@/app/types/order';

const STRIPE_VARIANT_MAP = {
  '8.5x11': 'price_8x11',
  '11x14': 'price_11x14',
  '16x20': 'price_16x20',
  '20x30': 'price_20x30'
} as const;

export function getPrintSizeVariantId(size: PrintSize): string {
  const variantId = STRIPE_VARIANT_MAP[size.name as keyof typeof STRIPE_VARIANT_MAP];
  if (!variantId) {
    throw new Error(`No Stripe variant ID found for print size: ${size.name}`);
  }
  return variantId;
} 