// Define status constants
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export interface PrintOrder {
  id: string;
  layout: {
    images: {
      url: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }[];
  };
  printSize: {
    width: number;
    height: number;
    name: string;
    price: number;
  };
  spacing: number;
  printFile?: Buffer;
  status: OrderStatus;
  createdAt: string;
  paymentId?: string;
  customerEmail?: string;
  trackingNumber?: string;
  printJobCreatedAt?: string;
}

export interface Order {
  id: string;
  layout: {
    images: Array<{
      url: string;
      alt?: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }>;
  };
  printSize: {
    width: number;
    height: number;
    price: number;
    name?: string;
  };
  status: OrderStatus;
  createdAt: string;
  printFile?: string;
  previewUrl?: string;
  email?: string;
  customerEmail?: string;
  paymentId?: string;
  spacing: number;
  containMode?: boolean;
  shippingAddress?: {
    name?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  trackingNumber?: string;
  printJobCreatedAt?: string;
}

export interface PrintSize {
  width: number;
  height: number;
  price: number;
  name: string;
  label?: string;
}

export const PRINT_SIZES: PrintSize[] = [
  {
    width: 8,
    height: 10,
    price: 2499,
    name: '8x10',
    label: '8" × 10"'
  },
  {
    width: 11,
    height: 14,
    price: 3499,
    name: '11x14',
    label: '11" × 14"'
  },
  {
    width: 16,
    height: 20,
    price: 4999,
    name: '16x20',
    label: '16" × 20"'
  }
];

export interface Layout {
  images: Array<{
    url: string;
    alt?: string;
    position: { x: number; y: number; w: number; h: number };
    rotation: number;
  }>;
}

export interface PrintJob {
  orderId: string;
  printFile: string;
  printSize: PrintSize;
  customerEmail?: string;
} 