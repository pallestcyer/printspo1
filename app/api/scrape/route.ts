import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const response = await fetch(url);
    const html = await response.text();
    
    // Basic regex to extract image URLs
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const images = [];
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      images.push({
        url: match[1],
        alt: 'Image from webpage'
      });
    }

    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to scrape images' }, { status: 500 });
  }
}
