export interface PrintOrder {
  id: string;
  userId?: string;
  layout: {
    name: string;
    template: number[][];
    images: {
      url: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }[];
  };
  printSize: {
    name: string;
    width: number;
    height: number;
    price: number;
  };
  status: 'pending' | 'paid' | 'processing' | 'shipped';
  createdAt: number;
  sessionId?: string;
}

export type PrintSize = PrintOrder['printSize']; 