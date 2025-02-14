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
        allowed_countries: ['CA'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 999, // $9.99
              currency: 'cad',
            },
            display_name: 'Canada Post Standard',
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
        }
      ],
      automatic_tax: { enabled: true },
      line_items: boards.map((board, index) => ({
        price_data: {
          currency: 'cad',
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
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?canceled=true`,
      discounts: totalAmount >= 5900 ? [
        {
          coupon: (await stripe.coupons.create({
            name: 'Free Shipping',
            amount_off: 999,
            currency: 'cad',
            duration: 'once'
          })).id
        }
      ] : undefined
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