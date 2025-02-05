import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface OrderPreview {
  id: string;
  preview?: string;
  layout: {
    images: Array<{
      url: string;
      position: { x: number; y: number; w: number; h: number };
      rotation: number;
    }>;
  };
  printSize: {
    width: number;
    height: number;
    price: number;
  };
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
}

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const order = await kv.get(`order:${params.orderId}`) as OrderPreview | null;
    
    if (!order?.preview) {
      return NextResponse.json(
        { error: 'Preview not found' },
        { status: 404 }
      );
    }

    // Convert base64 to buffer
    const base64Data = order.preview.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Failed to get preview' },
      { status: 500 }
    );
  }
} 