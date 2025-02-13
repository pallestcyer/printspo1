import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { Resend } from 'resend';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { url, printSize, customerEmail } = await req.json();
    
    // Extract public ID from URL
    const matches = url.match(/\/v\d+\/(.+)\.pdf$/);
    if (!matches) {
      throw new Error('Invalid Cloudinary URL format');
    }
    
    const publicId = matches[1];
    console.log('Public ID:', publicId);
    
    // Generate a signed URL
    const signedUrl = cloudinary.utils.private_download_url(
      publicId,
      'pdf',
      { 
        resource_type: 'image',
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 300
      }
    );

    // Fetch the PDF using signed URL
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error('Failed to fetch PDF from Cloudinary');
    
    const pdfBuffer = await response.arrayBuffer();
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    // Send to admin
    await resend.sendEmail({
      from: 'Printspo <orders@printspo.ca>',
      to: process.env.ADMIN_EMAIL!,
      subject: `New Print Order - ${printSize.width}"x${printSize.height}"`,
      text: `New print order received for size ${printSize.width}"x${printSize.height}"`,
      attachments: [{
        content: base64Pdf,
        filename: `print-${Date.now()}.pdf`
      }]
    });

    // Send to customer
    if (customerEmail) {
      await resend.sendEmail({
        from: 'Printspo <orders@printspo.ca>',
        to: customerEmail,
        subject: 'Your Print Order Confirmation',
        text: `Thank you for your order! Your ${printSize.width}"x${printSize.height}" print is being prepared.`,
        html: `
          <h1>Thank you for your order!</h1>
          <p>Your ${printSize.width}"x${printSize.height}" print is being prepared.</p>
          <p>We'll email you again when your order ships.</p>
        `
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 