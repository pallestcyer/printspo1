import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Add proper type for page parameter
interface PuppeteerPage {
  evaluate: (fn: () => any) => Promise<any>;
  setViewport: (options: { width: number; height: number }) => void;
  setDefaultNavigationTimeout: (timeout: number) => void;
  setUserAgent: (userAgent: string) => Promise<void>;
  goto: (url: string, options?: any) => Promise<any>;
  close: () => Promise<void>;
}

// Update the browser return type
interface PuppeteerBrowser {
  newPage: () => Promise<PuppeteerPage>;
  close: () => Promise<void>;
}

interface PinterestImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  id: string;
}

interface RawPinterestImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  id: string;
}

const _MAX_IMAGES = 50;
const _MAX_RETRIES = 3;
const _RETRY_DELAY = 2000;

async function autoScroll(page: PuppeteerPage): Promise<void> {
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

async function _waitForTimeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced image validation function
async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
        'Referer': 'https://www.pinterest.com/'
      }
    });
    
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return false;
    }

    // Check for reasonable file size (between 10KB and 20MB)
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength);
      if (size < 10 * 1024 || size > 20 * 1024 * 1024) {
        return false;
      }
    }

    // Verify we can actually fetch the image
    const imageResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
        'Referer': 'https://www.pinterest.com/'
      }
    });

    return imageResponse.ok;
  } catch {
    return false;
  }
}

// Add proper return type for getBrowser
async function getBrowser(): Promise<PuppeteerBrowser> {
  if (process.env.NODE_ENV === 'development') {
    const puppeteer = await import('puppeteer');
    return puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }) as Promise<PuppeteerBrowser>;
  } else {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    }) as Promise<PuppeteerBrowser>;
  }
}

// Add proper type for page parameter
async function scrapeImages(page: PuppeteerPage): Promise<PinterestImage[]> {
  // Get initial images quickly
  const rawImages = await page.evaluate(() => {
    const images = document.querySelectorAll('img[src*="pinimg.com"]');
    return Array.from(images, (img: Element) => ({
      url: (img as HTMLImageElement).src.replace(/\/\d+x\//, '/originals/'),
      alt: (img as HTMLImageElement).alt || '',
      width: (img as HTMLImageElement).naturalWidth || parseInt((img as HTMLImageElement).getAttribute('width') || '0'),
      height: (img as HTMLImageElement).naturalHeight || parseInt((img as HTMLImageElement).getAttribute('height') || '0'),
      id: (img as HTMLImageElement).closest('a[href*="/pin/"]') instanceof HTMLAnchorElement 
          ? ((img as HTMLImageElement).closest('a[href*="/pin/"]') as HTMLAnchorElement).href?.split('/pin/')[1]?.split('/')[0]
          || `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          : `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })).filter(img => img.width >= 200 && !img.url.includes('avatar') && !img.url.includes('profile'));
  }) as RawPinterestImage[];

  // Validate each image URL
  const validatedImages = await Promise.all(
    rawImages.map(async (img: RawPinterestImage) => {
      const isValid = await isValidImageUrl(img.url);
      return isValid ? img : null;
    })
  );

  // Filter out invalid images
  const images = validatedImages.filter((img): img is PinterestImage => img !== null);

  if (images.length === 0) {
    // If no valid images found, try scrolling and searching again
    await autoScroll(page);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const moreRawImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="pinimg.com"]');
      return Array.from(images, (img: Element) => ({
        url: (img as HTMLImageElement).src.replace(/\/\d+x\//, '/originals/'),
        alt: (img as HTMLImageElement).alt || '',
        width: (img as HTMLImageElement).naturalWidth || parseInt((img as HTMLImageElement).getAttribute('width') || '0'),
        height: (img as HTMLImageElement).naturalHeight || parseInt((img as HTMLImageElement).getAttribute('height') || '0'),
        id: (img as HTMLImageElement).closest('a[href*="/pin/"]') instanceof HTMLAnchorElement 
            ? ((img as HTMLImageElement).closest('a[href*="/pin/"]') as HTMLAnchorElement).href?.split('/pin/')[1]?.split('/')[0]
            || `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            : `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })).filter(img => img.width >= 200 && !img.url.includes('avatar') && !img.url.includes('profile'));
    });

    // Validate new images
    const validatedMoreImages = await Promise.all(
      moreRawImages.map(async (img: RawPinterestImage) => {
        const isValid = await isValidImageUrl(img.url);
        return isValid ? img : null;
      })
    );

    const moreImages = validatedMoreImages.filter((img): img is PinterestImage => img !== null);

    if (moreImages.length === 0) {
      throw new Error('No valid Pinterest images found. Please check if the board is public and try again.');
    }

    return moreImages;
  }

  return images;
}

function _isValidPinterestBoardUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('pinterest.')) {
      return false;
    }
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    return pathParts.length >= 2;
  } catch (_e) {
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let browser;
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const images = await scrapeImages(page);

    await browser.close();
    return NextResponse.json({ images, total: images.length });

  } catch (error) {
    if (browser) await browser.close();
    console.error('Error scraping Pinterest:', error);
    return NextResponse.json(
      { error: 'Failed to scrape Pinterest board', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}