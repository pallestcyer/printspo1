export const PRINT_SIZES = [
  { width: 5, height: 7, price: 9, name: '5x7' },
  { width: 8.5, height: 11, price: 12, name: '8.5x11' },
  { width: 11, height: 14, price: 16, name: '11x14' },
] as const;

export const DEFAULT_PRINT_SIZE = PRINT_SIZES[0];

export type PrintSizeKey = keyof typeof PRINT_SIZES;

export const PATHS = {
  types: '@/app/types/index',
  orders: '@/app/types/order',
} as const; 