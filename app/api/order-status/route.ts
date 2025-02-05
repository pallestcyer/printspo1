import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { config } from '@/lib/config';

export async function GET(
  request: Request,
  { searchParams }: { searchParams: URLSearchParams }
) {
  try {
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 }
    );
  }
} 