import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    // Validate URL format
    const isValidUrl = (url: string) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname.includes('pinterest.') && 
          (parsed.pathname.includes('/pin/') || parsed.pathname.split('/').length >= 3);
      } catch {
        return false;
      }
    };

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid Pinterest URL format' },
        { status: 400 }
      );
    }

    // Configure axios with browser-like headers
    const http = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.pinterest.com/',
      },
    });

    // Fetch and parse page content
    const { data, status } = await http.get(url);
    
    // Check if the response status is Access Denied (e.g., 403)
    if (status === 403 || status === 401) {
      return NextResponse.json(
        { error: 'Access Denied while scraping Pinterest' },
        { status: 403 }
      );
    }

    const $ = cheerio.load(data);

    // Function to check if image URL is accessible (no Access Denied)
    const checkImageAccess = async (imageUrl: string) => {
      try {
        const response = await http.get(imageUrl);
        return response.status === 200; // Only consider valid (200) image responses
      } catch (error) {
        console.error('Image access error:', error.message || error);
        return false;
      }
    };

    // Extract images from the page
    const imageData = await Promise.all(
      $('[data-test-id="pin"]')
        .map(async (i, el) => {
          const pin = $(el);
          const imgSources = [
            pin.find('img').attr('src'),
            pin.find('img').attr('srcset')?.split(' ')[0],
            pin.find('source[type="image/jpeg"]').attr('srcset'),
            pin.find('source[type="image/webp"]').attr('srcset'),
          ].filter(Boolean) as string[];

          const imageUrl = imgSources[0]?.replace(/\/\d+x(\d+)?\//, '/originals/');
          
          // Check if the image URL is accessible
          const isAccessible = imageUrl && await checkImageAccess(imageUrl);

          return isAccessible
            ? {
                url: imageUrl || '',
                alt: pin.find('img').attr('alt')?.replace(/Pinterest|›››››/g, '').trim() || '',
              }
            : null;
        })
        .get()
    );

    // Filter out any null values (non-accessible images)
    const uniqueImages = imageData.filter(img => img !== null);

    if (uniqueImages.length === 0) {
      return NextResponse.json(
        { error: 'Found images but none passed quality checks' },
        { status: 404 }
      );
    }

    return NextResponse.json({ images: uniqueImages });

  } catch (error: any) {
    console.error('Scraping error:', error.message || error);
    return NextResponse.json(
      { error: 'Failed to scrape the Pinterest URL' },
      { status: 500 }
    );
  }
}
