import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';
import sharp from 'sharp';
import { createCanvas, loadImage } from 'canvas';

export async function POST(request: Request) {
  try {
    const { images, printSize, spacing, containMode, isPreview } = await request.json();
    
    if (!images?.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Create canvas with print dimensions
    const canvas = createCanvas(
      printSize.width * 300, // 300 DPI
      printSize.height * 300
    );
    const ctx = canvas.getContext('2d');

    // Process and layout images
    const processedImages = await Promise.all(images.map(async (image) => {
      // Upload to Cloudinary for optimization
      const uploadResponse = await cloudinary.uploader.upload(image.url, {
        folder: isPreview ? 'print-previews' : 'print-originals',
        quality: isPreview ? 80 : 100,
        format: isPreview ? 'jpg' : 'png',
        transformation: [{
          width: Math.round(image.position.w * printSize.width * 300),
          height: Math.round(image.position.h * printSize.height * 300),
          crop: containMode ? 'fit' : 'fill'
        }]
      });

      // Draw image on canvas
      const img = await loadImage(uploadResponse.secure_url);
      ctx.save();
      ctx.translate(
        image.position.x * printSize.width * 300,
        image.position.y * printSize.height * 300
      );
      ctx.rotate(image.rotation * Math.PI / 180);
      ctx.drawImage(
        img,
        0, 0,
        image.position.w * printSize.width * 300,
        image.position.h * printSize.height * 300
      );
      ctx.restore();

      return {
        ...image,
        cloudinaryId: uploadResponse.public_id,
        printUrl: uploadResponse.secure_url,
        previewUrl: cloudinary.url(uploadResponse.public_id, {
          width: 800,
          quality: 80,
          format: 'jpg'
        })
      };
    }));

    // Upload final composite
    const finalImage = await cloudinary.uploader.upload(
      canvas.toDataURL(),
      {
        folder: isPreview ? 'print-previews' : 'print-finals',
        quality: isPreview ? 80 : 100,
        format: isPreview ? 'jpg' : 'png'
      }
    );

    return NextResponse.json({
      preview: isPreview ? finalImage.secure_url : null,
      printUrl: !isPreview ? finalImage.secure_url : null,
      images: processedImages,
      success: true
    });

  } catch (error) {
    console.error('Print generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate print',
      details: error.message
    }, { status: 500 });
  }
}