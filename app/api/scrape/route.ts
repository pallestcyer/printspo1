import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    console.log('Received URL:', url);

    // Validate the URL
    const validatePinterestUrl = (url: string) => {
      return url.includes('pinterest.com') && url.trim() !== '';
    };

    if (!validatePinterestUrl(url)) {
      console.error('Invalid URL:', url);
      return NextResponse.json(
        { error: 'Valid Pinterest board URL is required' },
        { status: 400 }
      );
    }

    // Fetch the Pinterest page
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Extract image URLs (skip the first image)
    const images: { url: string; alt: string }[] = [];
    $('img').each((index, element) => {
      if (index === 0) return; // Skip the first image (profile picture)
      const src = $(element).attr('src');
      const alt = $(element).attr('alt') || '';
      if (src) {
        images.push({ url: src, alt });
      }
    });

    // Return the extracted images
    return NextResponse.json({ images });
  } catch (error: unknown) {
    // Only ONE errorMessage declaration needed
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to scrape Pinterest board';

    console.error('Error scraping Pinterest board:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}