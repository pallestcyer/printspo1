import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';

// Configure route options
export const runtime = 'nodejs';
export const preferredRegion = 'iad1'; // Use US East (N. Virginia) for better performance
export const maxDuration = 60;

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
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // In development, use the locally installed Chrome
      return await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--hide-scrollbars',
          '--disable-extensions',
          '--force-color-profile=srgb',
          '--font-render-hinting=none',
          '--js-flags=--max-old-space-size=460',
          '--memory-pressure-off',
          '--single-process'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
        },
        headless: true,
        ignoreHTTPSErrors: true,
      }) as PuppeteerBrowser;
    } else {
      // In production (Vercel), use @sparticuz/chromium
      await chromium.font('https://raw.githubusercontent.com/googlefonts/noto-emoji/main/fonts/NotoColorEmoji.ttf');
      
      return await puppeteer.launch({
        args: chromium.args,
        defaultViewport: {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
        },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      }) as PuppeteerBrowser;
    }
  } catch (error) {
    console.error('Browser launch error:', error);
    throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Add timeout wrapper for fetch operations
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0',
        'Referer': 'https://www.pinterest.com/'
      }
    }, 5000);
    
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

async function expandShortUrl(shortUrl: string): Promise<string> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'
      }
    });
    return response.url;
  } catch (error) {
    console.error('Error expanding URL:', error);
    throw new Error('Failed to expand shortened URL');
  }
}

function validatePinterestUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Accept both pin.it and pinterest domains
    if (!urlObj.hostname.includes('pinterest.') && !urlObj.hostname.includes('pin.it')) {
      return false;
    }
    // For pin.it URLs, just verify basic structure
    if (urlObj.hostname.includes('pin.it')) {
      return true;
    }
    // For full Pinterest URLs, check path structure
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    return pathParts.length >= 2;
  } catch (_e) {
    return false;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  let browser: PuppeteerBrowser | undefined;
  let page: PuppeteerPage | undefined;
  
  try {
    const { url: inputUrl } = await req.json();
    
    if (!inputUrl) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    if (!validatePinterestUrl(inputUrl)) {
      return NextResponse.json({ 
        error: 'Invalid Pinterest URL. Please make sure you\'re using a valid Pinterest board or pin.it URL.' 
      }, { status: 400 });
    }

    // Expand shortened URL if necessary
    let expandedUrl = inputUrl;
    if (inputUrl.includes('pin.it')) {
      try {
        expandedUrl = await expandShortUrl(inputUrl);
      } catch (error) {
        return NextResponse.json({ 
          error: 'Failed to process shortened URL. Please try using the full Pinterest URL.' 
        }, { status: 400 });
      }
    }

    // Add global timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 55000);
    });

    const scrapePromise = async () => {
      browser = await getBrowser();
      page = await browser.newPage();
      
      // Configure page settings
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setDefaultNavigationTimeout(25000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');

      // Navigate to the page with better error handling
      try {
        await page.goto(expandedUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
      } catch (error) {
        throw new Error('Failed to load Pinterest board. Please check if the board is public and try again.');
      }

      // Extract images with timeout and memory cleanup
      const images = await Promise.race([
        page.evaluate(extractImagesFromPage).then(async (imgs) => {
          // Clean up page after extraction
          if (page) {
            await page.close();
            page = undefined;
          }
          return imgs;
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image extraction timed out')), 20000)
        )
      ]) as PinterestImage[];

      // Close browser and page after extraction
      if (page) await page.close();
      if (browser) {
        await browser.close();
        browser = undefined;
      }

      if (!images || images.length === 0) {
        return NextResponse.json(
          { error: 'No images found on this Pinterest board. Please check if the board is public and contains images.' },
          { status: 400 }
        );
      }

      // Validate first few images only to stay within time limit
      const imagesToValidate = images.slice(0, 12);
      const validationPromises = imagesToValidate.map(async (img: PinterestImage) => {
        try {
          const isValid = await isValidImageUrl(img.url);
          return isValid ? img : null;
        } catch {
          return null;
        }
      });

      // Add timeout for the entire validation process
      const validatedImages = await Promise.race([
        Promise.all(validationPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image validation timed out')), 10000)
        )
      ]) as (PinterestImage | null)[];

      const filteredImages = validatedImages.filter((img): img is PinterestImage => img !== null);

      if (filteredImages.length === 0) {
        return NextResponse.json(
          { error: 'Could not access any images from this board. Please check if the images are publicly accessible.' },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        images: filteredImages,
        total: filteredImages.length
      });
    };

    // Race between the scraping operation and the global timeout
    return await Promise.race([scrapePromise(), timeoutPromise]) as NextResponse;

  } catch (error) {
    console.error('Error scraping Pinterest:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import from Pinterest. Please check the URL and try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Ensure everything is cleaned up
    try {
      if (page) await page.close();
      if (browser) await browser.close();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}