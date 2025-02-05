import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { PrintSize } from '@/app/types/order';

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

interface GenerateRequest {
  images: PrintImage[];
  printSize: PrintSize;
  spacing: number;
  containMode?: boolean;
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
    const { images, printSize, spacing, containMode = false, isPreview = false } = await req.json();
    
    if (!images?.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const dpi = isPreview ? 150 : 200;
    console.log('Using DPI:', dpi);
    
    const paddingRem = 1;
    const paddingInches = paddingRem * 0.0625;
    const paddingPx = Math.floor(paddingInches * dpi);
    
    const width = Math.floor(printSize.width * dpi) + (paddingPx * 2);
    const height = Math.floor(printSize.height * dpi) + (paddingPx * 2);
    
    console.log('Canvas dimensions:', { width, height });

    // Calculate grid dimensions
    const imageCount = images.length;
    let cols: number;
    switch (imageCount) {
      case 1: cols = 1; break;
      case 2: cols = 2; break;
      case 3: cols = 3; break;
      case 4: cols = 2; break;
      default: cols = Math.ceil(Math.sqrt(imageCount));
    }
    const rows = Math.ceil(imageCount / cols);
    
    const spacingPx = Math.floor(spacing * 0.0625 * dpi);
    
    const cellWidth = Math.floor((width - (paddingPx * 2) - (spacingPx * (cols - 1))) / cols);
    const cellHeight = Math.floor((height - (paddingPx * 2) - (spacingPx * (rows - 1))) / rows);

    // Generate the composite image
    const compositeImage = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite(await Promise.all(images.map(async (image, index) => {
      try {
        console.log(`Processing image ${index + 1}:`, image.url);
        const response = await fetch(image.url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        let imageWidth = cellWidth;
        let imageHeight = cellHeight;
        
        if (imageCount === 5 && index === 0) {
          imageWidth = cellWidth * 2 + spacingPx;
        } else if (imageCount === 7 && index === 0) {
          imageWidth = cellWidth * 2 + spacingPx;
          imageHeight = cellHeight * 2 + spacingPx;
        }

        const processedImage = await sharp(buffer)
          .resize({
            width: imageWidth,
            height: imageHeight,
            fit: containMode ? 'contain' : 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .rotate(image.rotation)
          .toBuffer();

        return {
          input: processedImage,
          top: paddingPx + (row * (cellHeight + spacingPx)),
          left: paddingPx + (col * (cellWidth + spacingPx))
        };
      } catch (error) {
        console.error(`Error processing image ${index + 1}:`, error);
        throw error;
      }
    })))
    .jpeg({ 
      quality: isPreview ? 80 : 90,
      chromaSubsampling: '4:4:4'
    })
    .toBuffer();

    console.log('Uploading to Cloudinary...');
    const uploadResponse = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${compositeImage.toString('base64')}`,
      {
        folder: isPreview ? 'print-previews' : 'print-originals',
        format: isPreview ? 'jpg' : 'pdf',
        transformation: [
          { dpr: "2.0" },
          { quality: isPreview ? "auto:good" : "90" },
          ...(!isPreview ? [{ flags: "attachment" }] : [])
        ]
      }
    );

    console.log('Upload response:', {
      format: uploadResponse.format,
      url: uploadResponse.secure_url,
      resourceType: uploadResponse.resource_type
    });

    if (isPreview) {
      return NextResponse.json({
        images: [{
          printUrl: uploadResponse.secure_url,
          previewUrl: uploadResponse.secure_url
        }]
      });
    } else {
      // For print files, ensure we're getting a PDF
      if (uploadResponse.format !== 'pdf') {
        throw new Error('Failed to generate PDF format');
      }
      
      // Generate a separate preview JPG
      const previewResponse = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${compositeImage.toString('base64')}`,
        {
          folder: 'print-previews',
          format: 'jpg',
          transformation: [
            { dpr: "2.0" },
            { quality: "auto:good" }
          ]
        }
      );

      return NextResponse.json({
        images: [{
          printUrl: uploadResponse.secure_url,
          previewUrl: previewResponse.secure_url
        }]
      });
    }
  } catch (error) {
    console.error('Generate route error:', error);
    return NextResponse.json(
      { error: 'Failed to process images', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}