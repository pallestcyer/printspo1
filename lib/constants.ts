export const PRINT_SIZES = {
  '5x7': {
    name: '5x7',
    width: 5,
    height: 7,
    pixelWidth: 1500,
    pixelHeight: 2100,
    price: 3
  },
  '8.5x11': {
    name: '8.5x11',
    width: 8.5,
    height: 11,
    pixelWidth: 2550,
    pixelHeight: 3300,
    price: 5
  },
  '12x18': {
    name: '12x18',
    width: 12,
    height: 18,
    pixelWidth: 3600,
    pixelHeight: 5400,
    price: 6
  }
} as const;

export type PrintSizeKey = keyof typeof PRINT_SIZES; 