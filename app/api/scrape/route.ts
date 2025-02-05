import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    // Add a longer timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    const html = await response.text();
    
    // Enhanced regex to extract image URLs
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    const images = [];
    let match;
    let isFirstImage = true;
    
    while ((match = imgRegex.exec(html)) !== null) {
      if (isFirstImage) {
        isFirstImage = false;
        continue;  // Skip the first image (profile picture)
      }
      
      const imageUrl = match[1];
      // Only add images that are likely to be pins (usually larger images)
      if (imageUrl.includes('pinimg.com') && !imageUrl.includes('_75x75_')) {
        images.push({
          url: imageUrl,
          alt: 'Pinterest image'
        });
      }
      
      // Increase limit to 24 images
      if (images.length >= 24) break;
    }

    return NextResponse.json({ 
      images,
      total: images.length 
    });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape images' },
      { status: 500 }
    );
  }
}
