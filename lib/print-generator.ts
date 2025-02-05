import sharp from 'sharp';
import { PrintSize } from '@/app/types/order';

interface PrintLayout {
  images: { url: string; position: { x: number; y: number; w: number; h: number } }[];
  printSize: PrintSize;
  spacing: number;
}

export async function generatePrintFile(layout: PrintLayout): Promise<Buffer> {
  try {
    console.log('Starting print generation with layout:', {
      imageCount: layout.images.length,
      printSize: layout.printSize,
      spacing: layout.spacing
    });

    const width = layout.printSize.width * 300;
    const height = layout.printSize.height * 300;
    
    console.log('Canvas dimensions:', { width, height });

    const canvas = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    const compositeOperations = await Promise.all(
      layout.images.map(async (image, index) => {
        try {
          console.log(`Processing image ${index + 1}:`, {
            url: image.url,
            position: image.position
          });

          const response = await fetch(image.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch image ${index + 1}: ${response.statusText}`);
          }
          
          const imageBuffer = await response.arrayBuffer();
          console.log(`Image ${index + 1} fetched, size: ${imageBuffer.byteLength} bytes`);

          const processedImage = await sharp(imageBuffer)
            .resize({
              width: Math.round(image.position.w * width),
              height: Math.round(image.position.h * height),
              fit: 'cover'
            })
            .toBuffer();

          console.log(`Image ${index + 1} processed successfully`);

          return {
            input: processedImage,
            top: Math.round(image.position.y * height),
            left: Math.round(image.position.x * width),
          };
        } catch (err: unknown) {
          console.error(`Error processing image ${index + 1}:`, {
            error: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
            imageUrl: image.url
          });
          throw err;
        }
      })
    );

    console.log('All images processed, compositing final image');

    const finalImage = await canvas
      .composite(compositeOperations)
      .jpeg({ quality: 100 })
      .toBuffer();

    console.log('Print generation completed successfully');
    return finalImage;
  } catch (error) {
    console.error('Print generation error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error,
      layout: {
        printSize: layout.printSize,
        imageCount: layout.images.length,
        imageUrls: layout.images.map(img => img.url)
      }
    });
    throw error;
  }
} 