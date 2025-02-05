import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ORDER_STATUS, type PrintJob, type Order } from '@/app/types/order';

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
      printFile: order.printFile || '',
      printSize: order.printSize,
      customerEmail: order.customerEmail
    };

    // Here you would integrate with your print service
    // For example: Printful, Gooten, etc.
    
    // Update order status
    await kv.hset(`order:${orderId}`, {
      status: ORDER_STATUS.PROCESSING,
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