import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { url, printSize } = await req.json();
    
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

    // Use the existing email utility with resend.dev domain
    const emailData = {
      from: 'Printspo <prints@printspo.ca>',  // Using Resend's default domain
      to: process.env.ADMIN_EMAIL!,
      subject: `Print Order - ${printSize.width}"x${printSize.height}"`,
      text: `New print order received for size ${printSize.width}"x${printSize.height}"`,
      attachments: [{
        filename: `print-${Date.now()}.pdf`,
        content: base64Pdf,
        contentType: 'application/pdf'
      }]
    };

    // Make the request directly to Resend's API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }

    console.log('Email sent successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 