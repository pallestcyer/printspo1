import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    
    // Convert short Pinterest URL to full URL if needed
    const fullUrl = url.includes('pin.it') 
      ? await expandShortUrl(url)
      : url;
    
    // Use Pinterest API or web scraping to get image data
    const response = await fetch(fullUrl);
    const html = await response.text();
    
    // Extract image URLs from Pinterest page
    const imageUrls = extractImagesFromPinterestHtml(html);
    
    return NextResponse.json({ images: imageUrls });
  } catch (error) {
    console.error('Pinterest fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch Pinterest images' }, { status: 500 });
  }
}

async function expandShortUrl(shortUrl: string) {
  const response = await fetch(shortUrl, { redirect: 'follow' });
  return response.url;
}

function extractImagesFromPinterestHtml(html: string) {
  // Basic regex to find image URLs in Pinterest HTML
  const imgRegex = /"orig":{"url":"([^"]+)"/g;
  const matches = [...html.matchAll(imgRegex)];
  
  return matches.map(match => ({
    url: match[1],
    alt: '',
    width: 1200,  // Default width
    height: 1200  // Default height
  }));
} 