import type { PrintSize } from '@/app/types/order';

export const PRINT_SIZES = [
  {
    name: '5x7"',
    width: 5,
    height: 7,
    price: 3
  },
  {
    name: '8.5x11"',
    width: 8.5,
    height: 11,
    price: 4
  },
  {
    name: '12x18"',
    width: 12,
    height: 18,
    price: 5
  }
];

export const DEFAULT_PRINT_SIZE = PRINT_SIZES[0];

export type PrintSizeKey = keyof typeof PRINT_SIZES;

export const PATHS = {
  types: '@/app/types/index',
  orders: '@/app/types/order',
} as const; 