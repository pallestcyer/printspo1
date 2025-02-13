import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

const MAX_IMAGES = 50;

async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

export async function POST(request: Request) {
  let browser;
  try {
    const { url } = await request.json();
    const MAX_PINS = 42;
    
    // Validate URL
    const isPinterestUrl = url.match(/pin(terest)?\.(it|com)/i);
    if (!isPinterestUrl) {
      throw new Error('Invalid Pinterest URL');
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Initial page load
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Get initial images quickly
    const initialImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="pinimg.com"]');
      return Array.from(images, (img: Element) => ({
        url: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt || '',
        width: (img as HTMLImageElement).naturalWidth,
        height: (img as HTMLImageElement).naturalHeight,
        id: (img as HTMLImageElement).src
      })).filter(img => img.width >= 100 && img.height >= 100);
    });

    // Send initial images immediately if we have any
    if (initialImages.length > 0) {
      return NextResponse.json({ 
        images: initialImages,
        total: initialImages.length,
        status: 'partial'
      });
    }

    // Continue with full scraping...
    // (rest of the scraping logic)
  } catch (error: any) {
    console.error('Error scraping Pinterest:', error);
    return NextResponse.json({ 
      error: 'Failed to load Pinterest board',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}