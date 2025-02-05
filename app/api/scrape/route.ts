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
      timeout: 15000, // Increased timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.pinterest.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
      },
    });

    // Fetch and parse page content
    const { data, status } = await http.get(url);

    if (status === 403 || status === 401) {
      return NextResponse.json(
        { error: 'Access Denied while scraping Pinterest' },
        { status: 403 }
      );
    }

    const $ = cheerio.load(data);

    // Enhanced image selector patterns
    const selectors = [
      '[data-test-id="pin"]',
      '[data-test-id="pinrep"]',
      '[data-test-id="pinWrapper"]',
      '.Grid__Item',
      '.gridCentered',
      '.Collection-Item',
    ];

    // Function to check if image URL is accessible
    const checkImageAccess = async (imageUrl: string) => {
      try {
        const response = await http.head(imageUrl);
        return response.status === 200;
      } catch (error) {
        return false;
      }
    };

    // Extract images using multiple selectors
    const imagePromises = selectors.flatMap(selector => {
      return $(selector).map(async (i, el) => {
        const element = $(el);
        const imgSources = [
          element.find('img').attr('src'),
          element.find('img').attr('srcset')?.split(' ')[0],
          element.find('source[type="image/jpeg"]').attr('srcset'),
          element.find('source[type="image/webp"]').attr('srcset'),
          element.find('[role="img"]').attr('src'),
          element.find('[data-pin-id]').attr('src'),
        ].filter(Boolean) as string[];

        // Get the highest quality image URL
        const imageUrl = imgSources[0]?.replace(/\/\d+x(\d+)?\//, '/originals/');

        if (!imageUrl) return null;

        // Check if the image URL is accessible
        const isAccessible = await checkImageAccess(imageUrl);

        return isAccessible
          ? {
              url: imageUrl,
              alt: element.find('img').attr('alt')?.replace(/Pinterest|›››››/g, '').trim() || '',
            }
          : null;
      }).get();
    });

    const imageResults = await Promise.all(imagePromises);
    
    // Remove duplicates and null values
    const uniqueImages = Array.from(new Set(
      imageResults
        .filter((img): img is NonNullable<typeof img> => img !== null)
        .map(img => JSON.stringify(img))
    )).map(str => JSON.parse(str));

    if (uniqueImages.length === 0) {
      return NextResponse.json(
        { error: 'No valid images found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ images: uniqueImages });

  } catch (error) {
    if (error instanceof Error) {
      console.error('Scraping error:', error.message);
    } else {
      console.error('Unknown scraping error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to scrape the Pinterest URL' },
      { status: 500 }
    );
  }
}
