import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { PrintSize } from '@/app/types/order';

interface PrintImage {
  url: string;
  alt?: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotation: number;
}

interface GenerateRequest {
  images: PrintImage[];
  printSize: PrintSize;
  spacing: number;
  containMode?: boolean;
  cornerRounding?: number;
  isPortrait?: boolean;
  isPreview?: boolean;
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    console.log('Starting print generation...');
    const body = await req.json();
    
    const { images, printSize, spacing, containMode = false, cornerRounding = 0, isPortrait = false, isPreview = false }: GenerateRequest = body;
    
    if (!images?.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

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
    const imageCount = images.length;
    let cols: number = 1;  // Initialize with a default value
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
    .composite(await Promise.all(images.map(async (image: PrintImage, index: number) => {
      try {
        const response = await fetch(image.url, {
          headers: {
            'Accept': 'image/*'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const row = Math.floor(index / cols);
        const col = index % cols;

        // Process the image first
        const processedImage = await sharp(buffer, { failOnError: false })
          .resize({
            width: cellWidth,
            height: cellHeight,
            fit: containMode ? 'contain' : 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .rotate(image.rotation || 0)
          .toFormat('png')
          .toBuffer();

        // Create rounded corner mask
        const mask = Buffer.from(
          `<svg><rect x="0" y="0" width="${cellWidth}" height="${cellHeight}" rx="${Math.min(cornerRounding * 2, 24)}" ry="${Math.min(cornerRounding * 2, 24)}" fill="white"/></svg>`
        );

        // Apply mask and ensure white background
        const finalImage = await sharp(processedImage)
          .composite([{
            input: mask,
            blend: 'dest-in'
          }])
          .extend({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .toBuffer();

        return {
          input: finalImage,
          top: spacingPx + (row * (cellHeight + spacingPx)),
          left: spacingPx + (col * (cellWidth + spacingPx))
        };
      } catch (error) {
        console.error(`Error processing image ${index + 1}:`, error);
        // Return a white placeholder with rounded corners
        return {
          input: await sharp({
            create: {
              width: cellWidth,
              height: cellHeight,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
          }).toBuffer(),
          top: spacingPx + (Math.floor(index / cols) * (cellHeight + spacingPx)),
          left: spacingPx + ((index % cols) * (cellWidth + spacingPx))
        };
      }
    })))
    .jpeg({ 
      quality: isPreview ? 85 : 90,
      chromaSubsampling: '4:4:4',
      force: true
    })
    .toBuffer();

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${compositeImage.toString('base64')}`,
      { folder: 'print-previews' }
    );

    return NextResponse.json({
      images: [{
        previewUrl: uploadResponse.secure_url
      }]
    });

  } catch (error) {
    console.error('Generate route error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      error: 'Failed to process images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}