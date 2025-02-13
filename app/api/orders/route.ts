import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { ORDER_STATUS } from '@/app/types/order';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

interface BoardOrder {
  printFile: string;
  previewUrl: string;
  printSize: {
    width: number;
    height: number;
    price: number;
  };
  settings: {
    selectedIndices: number[];
    spacing: number;
    containMode: boolean;
    isPortrait: boolean;
    cornerRounding: number;
    scrapedImages: any[];
  };
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const { boards } = await request.json() as { boards: BoardOrder[] };
    
    if (!boards || !Array.isArray(boards) || boards.length === 0) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    // Generate preview images for each board first
    const previewPromises = boards.map(async (board) => {
      const response = await fetch(`${baseUrl}/api/prints/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: board.settings.selectedIndices.map(index => ({
            url: board.settings.scrapedImages[index].url,
            alt: board.settings.scrapedImages[index].alt,
            position: { x: 0, y: 0, w: 1, h: 1 },
            rotation: 0
          })),
          printSize: board.printSize,
          spacing: board.settings.spacing,
          containMode: board.settings.containMode,
          isPortrait: board.settings.isPortrait,
          cornerRounding: board.settings.cornerRounding,
          isPreview: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      return data.images[0].previewUrl;
    });

    const previewUrls = await Promise.all(previewPromises);

    // Calculate total price for all boards
    const totalAmount = boards.reduce((sum, board) => sum + board.printSize.price, 0);

    // Generate order ID
    const orderId = crypto.randomBytes(16).toString('hex');

    // Create Stripe session with the generated previews
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'NZ'], // Add or remove countries as needed
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // Free shipping
              currency: 'usd',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 2,
              },
              maximum: {
                unit: 'business_day',
                value: 3,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500, // $15.00
              currency: 'usd',
            },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 1,
              },
              maximum: {
                unit: 'business_day',
                value: 2,
              },
            },
          },
        },
      ],
      line_items: boards.map((board, index) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Custom Print ${index + 1}`,
            description: `${board.printSize.width}" × ${board.printSize.height}" Print`,
            images: [previewUrls[index]],
          },
          unit_amount: Math.round(board.printSize.price * 100),
        },
        quantity: 1,
      })),
      mode: 'payment',
      success_url: `${baseUrl}/success?order=${orderId}`,
      cancel_url: `${baseUrl}`,
    });

    // Store order data with the generated previews
    await kv.set(`order:${orderId}`, {
      id: orderId,
      status: ORDER_STATUS.PENDING,
      boards: boards.map((board, index) => ({
        settings: board.settings,
        previewUrl: previewUrls[index],
        printSize: board.printSize,
      })),
      sessionId: session.id,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      sessionId: session.id,
      orderId,
    });

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
} 