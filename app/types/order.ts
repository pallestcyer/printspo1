// Define status constants
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  PAID: 'paid',
  SHIPPED: 'shipped'
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
  name?: string;
  label?: string;
}

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