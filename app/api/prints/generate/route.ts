import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fetch from 'node-fetch';

export async function POST(request: Request) {
  try {
    const { images, layout, printSize } = await request.json();
    
    // Create a new PDF document
    const doc = new PDFDocument({
      size: [printSize.width * 72, printSize.height * 72], // Convert inches to points
      margin: 0
    });

    // Buffer to store PDF
    const chunks: Buffer[] = [];
    doc.on('data', chunks.push.bind(chunks));

    // Process each image
    for (const image of images) {
      // Fetch image
      const response = await fetch(image.url);
      const buffer = await response.arrayBuffer();

      // Process image with sharp
      const processedImage = await sharp(buffer)
        .rotate(image.rotation || 0)
        .resize({
          width: Math.round(image.position.w * 72 * 4), // High resolution for print
          height: Math.round(image.position.h * 72 * 4),
          fit: 'cover'
        })
        .toBuffer();

      // Add image to PDF
      doc.image(processedImage, 
        image.position.x * 72,
        image.position.y * 72,
        {
          width: image.position.w * 72,
          height: image.position.h * 72
        }
      );
    }

    doc.end();

    // Combine chunks into final PDF buffer
    const pdfBuffer = Buffer.concat(chunks);

    // Return PDF as base64
    return NextResponse.json({
      pdf: pdfBuffer.toString('base64'),
      success: true
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 