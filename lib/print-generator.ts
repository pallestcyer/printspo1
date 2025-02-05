import sharp from 'sharp';
import { PrintSize } from '@/app/types/order';

interface PrintLayout {
  images: { url: string; position: { x: number; y: number; w: number; h: number } }[];
  printSize: PrintSize;
  spacing: number;
}

export async function generatePrintFile(layout: PrintLayout): Promise<Buffer> {
  // Create a canvas based on print size (300 DPI)
  const width = layout.printSize.width * 300; // Convert inches to pixels at 300 DPI
  const height = layout.printSize.height * 300;
  
  // Create base canvas
  const canvas = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  });

  // Process each image
  const compositeOperations = await Promise.all(
    layout.images.map(async (image) => {
      const imageBuffer = await fetch(image.url).then(res => res.arrayBuffer());
      const processedImage = await sharp(imageBuffer)
        .resize({
          width: Math.round(image.position.w * width),
          height: Math.round(image.position.h * height),
          fit: 'cover'
        })
        .toBuffer();

      return {
        input: processedImage,
        top: Math.round(image.position.y * height),
        left: Math.round(image.position.x * width),
      };
    })
  );

  // Compose final image
  const finalImage = await canvas
    .composite(compositeOperations)
    .jpeg({ quality: 100 })
    .toBuffer();

  return finalImage;
} 