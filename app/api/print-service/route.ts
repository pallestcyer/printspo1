import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface PrintJob {
  orderId: string;
  images: {
    url: string;
    position: { x: number; y: number; w: number; h: number };
    rotation: number;
  }[];
  printSize: {
    width: number;
    height: number;
    name: string;
  };
}

interface Order {
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
  };
  status: string;
  createdAt: string;
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();
    const order = await kv.get(`order:${orderId}`) as Order | null;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create print job
    const printJob: PrintJob = {
      orderId,
      images: order.layout.images,
      printSize: order.printSize
    };

    // Here you would integrate with your print service
    // For example: Printful, Gooten, etc.
    
    // Update order status
    await kv.hset(`order:${orderId}`, {
      status: 'processing',
      printJobCreatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, printJob });
  } catch (error) {
    console.error('Print service error:', error);
    return NextResponse.json(
      { error: 'Failed to create print job' },
      { status: 500 }
    );
  }
} 