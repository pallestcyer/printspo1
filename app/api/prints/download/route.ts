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
    const { url } = await req.json();
    
    // Extract folder and public ID from URL
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
        expires_at: Math.floor(Date.now() / 1000) + 300 // 5 minute expiry
      }
    );

    console.log('Signed URL:', signedUrl);

    // Fetch the signed URL
    const response = await fetch(signedUrl);
    
    if (!response.ok) {
      console.error('PDF fetch failed:', response.status, response.statusText);
      throw new Error('Failed to fetch PDF');
    }

    const pdfBuffer = await response.arrayBuffer();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=print.pdf'
      }
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json(
      { error: 'Failed to download PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 