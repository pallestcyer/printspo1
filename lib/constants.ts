import type { PrintSize } from '@/app/types/order';

export const PRINT_SIZES: PrintSize[] = [
  {
    width: 5,
    height: 7,
    price: 4,
    label: '5" × 7"'
  },
  {
    width: 8.5,
    height: 11,
    price: 5,
    label: '8.5" × 11"'
  },
  {
    width: 12,
    height: 18,
    price: 6,
    label: '12" × 18"'
  }
];

export const DEFAULT_PRINT_SIZE = PRINT_SIZES[0];

export type PrintSizeKey = keyof typeof PRINT_SIZES;

export const PATHS = {
  types: '@/app/types/index',
  orders: '@/app/types/order',
} as const; 