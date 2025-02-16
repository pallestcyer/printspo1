import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';
import fs from 'fs';

// Configure route options
export const runtime = 'nodejs';
export const preferredRegion = 'iad1'; // Use US East (N. Virginia) for better performance
export const maxDuration = 60;

// Configure Chromium for Vercel environment
chromium.setGraphicsMode = false;
chromium.setHeadlessMode = true;
chromium.args.push(
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--single-process',
  '--no-zygote'
);

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

async function ensureChromiumInTemp(): Promise<string> {
  try {
    // Ensure /tmp exists
    if (!fs.existsSync('/tmp')) {
      fs.mkdirSync('/tmp', { recursive: true });
    }

    // Get the path where Chromium should be
    const chromiumPath = await chromium.executablePath();
    const chromiumDir = path.dirname(chromiumPath);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(chromiumDir)) {
      fs.mkdirSync(chromiumDir, { recursive: true });
    }

    return chromiumPath;
  } catch (error) {
    console.error('Error ensuring Chromium directory:', error);
    throw new Error('Failed to setup Chromium directory');
  }
}

async function getBrowser(): Promise<PuppeteerBrowser> {
  try {
    const executablePath = await chromium.executablePath();
    
    const options = {
      args: [
        ...chromium.args,
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
      ],
      executablePath,
      defaultViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
      },
      headless: true,
      ignoreHTTPSErrors: true
    };

    const browser = await puppeteer.launch(options);
    return browser as PuppeteerBrowser;
  } catch (error: unknown) {
    console.error('Browser launch error:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to launch browser: ${error.message}`);
    }
    throw error;
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

    // Add global timeout to ensure we stay within serverless limits
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 50000);
    });

    const scrapePromise = async () => {
      browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setDefaultNavigationTimeout(15000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');

      // Expand shortened URL if necessary
      let expandedUrl = inputUrl;
      if (inputUrl.includes('pin.it')) {
        try {
          expandedUrl = await expandShortUrl(inputUrl);
        } catch (error) {
          throw new Error('Failed to process shortened URL. Please try using the full Pinterest URL.');
        }
      }

      try {
        await page.goto(expandedUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      } catch (navigationError) {
        throw new Error('Failed to load Pinterest board. Please check if the board is public and try again.');
      }

      const images = await Promise.race([
        page.evaluate(extractImagesFromPage),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image extraction timed out')), 10000)
        )
      ]) as PinterestImage[];

      // Close page early to free up memory
      await page.close();
      page = undefined;

      if (!images || images.length === 0) {
        throw new Error('No images found on this Pinterest board. Please check if the board is public and contains images.');
      }

      // Validate only first 6 images to stay within time limits
      const imagesToValidate = images.slice(0, 6);
      const validationPromises = imagesToValidate.map(async (img: PinterestImage) => {
        try {
          const isValid = await isValidImageUrl(img.url);
          return isValid ? img : null;
        } catch {
          return null;
        }
      });

      const validatedImages = await Promise.all(validationPromises);
      const filteredImages = validatedImages.filter((img): img is PinterestImage => img !== null);

      if (filteredImages.length === 0) {
        throw new Error('Could not access any images from this board. Please check if the images are publicly accessible.');
      }

      return { 
        images: filteredImages,
        total: filteredImages.length
      };
    };

    const result = await Promise.race([scrapePromise(), timeoutPromise]);
    return NextResponse.json(result);

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
    try {
      if (page) await page.close();
      if (browser) await browser.close();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}