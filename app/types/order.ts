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
  status: 'pending' | 'paid' | 'processing' | 'shipped';
  createdAt: string;
  paymentId?: string;
  customerEmail?: string;
  trackingNumber?: string;
  printJobCreatedAt?: string;
}

export type PrintSize = {
  width: number;
  height: number;
  price: number;
  label: string;
};

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