import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Configure route options
export const runtime = 'nodejs';
export const maxDuration = 300;

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

const extractImagesFromPage = () => {
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
};

async function getBrowser(): Promise<PuppeteerBrowser> {
  try {
    await chromium.font('https://raw.githubusercontent.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf');
    
    return puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    }) as Promise<PuppeteerBrowser>;
  } catch (error) {
    console.error('Browser launch error:', error);
    throw new Error('Failed to launch browser');
  }
}

async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
        'Referer': 'https://www.pinterest.com/'
      }
    });
    
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') ?? false;
  } catch {
    return false;
  }
}

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

    if (!url.includes('pinterest.')) {
      return NextResponse.json({ error: 'Invalid Pinterest URL' }, { status: 400 });
    }

    browser = await getBrowser();
    const page = await browser.newPage();
    
    // Configure page settings
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setDefaultNavigationTimeout(30000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');

    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Extract images
    const images = await page.evaluate(extractImagesFromPage);

    // Close browser before validation to free up memory
    await browser.close();
    browser = undefined;

    // Validate images
    const validatedImages = await Promise.all(
      images.map(async (img: PinterestImage) => {
        const isValid = await isValidImageUrl(img.url);
        return isValid ? img : null;
      })
    );

    const filteredImages = validatedImages.filter((img): img is PinterestImage => img !== null);

    if (filteredImages.length === 0) {
      return NextResponse.json(
        { error: 'No valid Pinterest images found. Please check if the board is public and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      images: filteredImages,
      total: filteredImages.length
    });

  } catch (error) {
    console.error('Error scraping Pinterest:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scrape Pinterest board',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }
}