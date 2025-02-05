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

export type PrintSize = PrintOrder['printSize']; 