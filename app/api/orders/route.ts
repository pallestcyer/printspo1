import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { ORDER_STATUS } from '@/app/types/order';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
  typescript: true,
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface ScrapedImage {
  url: string;
  alt?: string;
}

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
    scrapedImages: ScrapedImage[];
  };
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function generatePreview(board: BoardOrder) {
  try {
    const { printSize, settings } = board;
    const { selectedIndices, scrapedImages, spacing, containMode, isPortrait, cornerRounding } = settings;

    // Calculate dimensions based on print size aspect ratio
    const baseWidth = 700;
    const baseHeight = 500;
    
    let width, height;
    if (isPortrait) {
      height = baseHeight;
      width = Math.floor((printSize.width / printSize.height) * height);
    } else {
      width = baseWidth;
      height = Math.floor((printSize.height / printSize.width) * width);
    }

    // Calculate grid dimensions
    const imageCount = selectedIndices.length;
    let cols: number;
    switch (imageCount) {
      case 1: cols = 1; break;
      case 2: cols = 2; break;
      case 3: cols = 3; break;
      case 4: cols = 2; break;
      default: cols = Math.ceil(Math.sqrt(imageCount));
    }
    const rows = Math.ceil(imageCount / cols);
    
    const spacingPx = Math.floor(spacing * 16);
    const cellWidth = Math.floor((width - (spacingPx * (cols + 1))) / cols);
    const cellHeight = Math.floor((height - (spacingPx * (rows + 1))) / rows);

    // Generate the composite image
    const compositeImage = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite(await Promise.all(selectedIndices.map(async (index, i) => {
      try {
        const imageUrl = scrapedImages[index].url;
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const row = Math.floor(i / cols);
        const col = i % cols;

        // Process the image
        const processedImage = await sharp(buffer)
          .resize({
            width: cellWidth,
            height: cellHeight,
            fit: containMode ? 'contain' : 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .toFormat('png')
          .toBuffer();

        // Create rounded corner mask if needed
        if (cornerRounding > 0) {
          const mask = Buffer.from(
            `<svg><rect x="0" y="0" width="${cellWidth}" height="${cellHeight}" rx="${Math.min(cornerRounding * 2, 24)}" ry="${Math.min(cornerRounding * 2, 24)}" fill="white"/></svg>`
          );

          return {
            input: await sharp(processedImage)
              .composite([{
                input: mask,
                blend: 'dest-in'
              }])
              .toBuffer(),
            top: spacingPx + (row * (cellHeight + spacingPx)),
            left: spacingPx + (col * (cellWidth + spacingPx))
          };
        }

        return {
          input: processedImage,
          top: spacingPx + (row * (cellHeight + spacingPx)),
          left: spacingPx + (col * (cellWidth + spacingPx))
        };
      } catch (error) {
        console.error(`Error processing image ${index}:`, error);
        // Return a white placeholder
        return {
          input: await sharp({
            create: {
              width: cellWidth,
              height: cellHeight,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
          }).toBuffer(),
          top: spacingPx + (Math.floor(i / cols) * (cellHeight + spacingPx)),
          left: spacingPx + ((i % cols) * (cellWidth + spacingPx))
        };
      }
    })))
    .jpeg({ quality: 85 })
    .toBuffer();

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${compositeImage.toString('base64')}`,
      { folder: 'print-previews' }
    );

    return uploadResponse.secure_url;
  } catch (error) {
    console.error('Preview generation error:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    console.log("Received order request");
    const { boards } = await request.json() as { boards: BoardOrder[] };
    console.log("Request boards count:", boards?.length);
    
    if (!boards || !Array.isArray(boards) || boards.length === 0) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    // Generate preview images for each board
    console.log("Generating previews...");
    const previewUrls = await Promise.all(
      boards.map(async (board) => {
        console.log(`Generating preview for board with ${board.settings.selectedIndices.length} images`);
        return generatePreview(board);
      })
    );
    console.log("All previews generated successfully");

    // Calculate total price for all boards
    const totalAmount = boards.reduce((sum, board) => sum + board.printSize.price, 0);
    console.log("Total amount:", totalAmount);

    // Generate order ID
    const orderId = crypto.randomBytes(16).toString('hex');

    // Create Stripe session with the generated previews
    console.log("Creating Stripe session...");
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
              amount: 999,
              currency: 'cad',
            },
            display_name: 'Canada Post Standard (Final Price)',
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
      line_items: boards.map((board, index) => ({
        price_data: {
          currency: 'cad',
          product_data: {
            name: `Custom Print ${index + 1}`,
            description: `${board.printSize.width}" × ${board.printSize.height}" Print - Final Price (No Additional Tax)`,
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
    console.log("Stripe session created:", session.id);

    // Store order data
    console.log("Storing order data in KV store...");
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
    console.log("Order data stored successfully");

    return NextResponse.json({
      sessionId: session.id,
      orderId,
    });

  } catch (error: unknown) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create order', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 