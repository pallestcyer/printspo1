import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const preview = await kv.get(`preview:${params.orderId}`);
    
    if (!preview) {
      return new Response('Preview not found', { status: 404 });
    }

    // Convert base64 to buffer
    const base64Data = preview.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Preview fetch error:', error);
    return new Response('Error fetching preview', { status: 500 });
  }
} 