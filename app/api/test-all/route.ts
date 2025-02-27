import { NextResponse } from 'next/server';
import { stripe } from '@/lib/api-clients';
import { Resend } from 'resend';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  const results = {
    stripe: false,
    resend: false,
    pdf: false,
    details: {} as Record<string, any>
  };
  
  try {
    // Test Stripe
    try {
      const stripeTest = await stripe.paymentIntents.list({ limit: 1 });
      results.stripe = !!stripeTest.data;
      results.details.stripe = 'Successfully connected to Stripe API';
    } catch (error) {
      results.details.stripe = `Stripe error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Test Resend
    try {
      const _resendTest = await resend.sendEmail({
        from: 'Printspo <orders@printspo.ca>',
        to: process.env.ADMIN_EMAIL!,
        subject: 'Test Email',
        text: 'This is a test email to verify Resend functionality'
      });
      results.resend = true;
      results.details.resend = 'Successfully sent test email';
    } catch (error) {
      results.details.resend = `Resend error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Test PDF Generation
    try {
      // Create a simple test image
      const testImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
      .jpeg()
      .toBuffer();

      // Upload to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${testImage.toString('base64')}`,
        { folder: 'test' }
      );

      results.pdf = !!uploadResponse.secure_url;
      results.details.pdf = 'Successfully generated and uploaded test image';
    } catch (error) {
      results.details.pdf = `PDF generation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Service test error:', error);
    return NextResponse.json({
      results,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 