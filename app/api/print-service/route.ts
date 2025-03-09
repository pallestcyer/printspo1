import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ORDER_STATUS, type PrintJob, type PrintOrder, type PrintSize } from '@/app/types/order';

interface _OrderData {
  orderId: string;
  printFile: string;
  printSize: PrintSize;
  customerEmail: string;
}

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await kv.get(`order:${orderId}`) as PrintOrder;

    // Create a copy of printSize with guaranteed name
    const printSize: PrintSize = {
      ...order.printSize,
      name: order.printSize.name || `${order.printSize.width}x${order.printSize.height}`
    };

    // Create print job
    const printJob: PrintJob = {
      orderId: order.id,
      printFile: order.printFile || '',
      printSize,
      customerEmail: order.customerEmail || ''
    };

    // Update order status
    await kv.set(`order:${orderId}`, {
      ...order,
      status: ORDER_STATUS.PROCESSING
    });

    return NextResponse.json(printJob);
  } catch (error) {
    console.error('Print service error:', error);
    return NextResponse.json(
      { error: 'Failed to process print job' },
      { status: 500 }
    );
  }
} 