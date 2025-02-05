import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

interface PrintImage {
  url: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotation: number;
}

interface PrintSize {
  width: number;
  height: number;
  price: number;
}

interface GenerateRequest {
  images: PrintImage[];
  printSize: PrintSize;
  spacing: number;
  isPreview?: boolean;
}

export async function POST(req: Request) {
  try {
    const { images, printSize, spacing, isPreview = false } = await req.json() as GenerateRequest;
    
    if (!images?.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Process images using Cloudinary
    const processedImages = await Promise.all(images.map(async (image: PrintImage) => {
      const uploadResponse = await cloudinary.uploader.upload(image.url, {
        folder: isPreview ? 'print-previews' : 'print-originals',
        quality: isPreview ? 80 : 100,
        format: 'png'
      });

      return {
        ...image,
        printUrl: uploadResponse.secure_url
      };
    }));

    return NextResponse.json({
      images: processedImages,
      printSize,
      spacing
    });
  } catch (error) {
    console.error('Print generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate print', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}