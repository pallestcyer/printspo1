import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';
import fs from 'fs';

// Configure route options
export const runtime = 'nodejs';
export const preferredRegion = 'iad1'; // Use US East (N. Virginia) for better performance
export const maxDuration = 60;

// Determine environment
const isVercel = process.env.VERCEL === '1';

// Configure Chromium differently based on environment
const chromiumConfig = {
  args: [
    ...chromium.args,
    '--js-flags=--max-old-space-size=512',
    '--memory-pressure-off',
    '--single-process',
    '--no-zygote',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--no-first-run',
    '--no-sandbox',
    '--aggressive-cache-discard',
    '--disable-features=site-per-process',
    '--js-flags="--expose-gc"'
  ]
};

if (isVercel) {
  chromium.setGraphicsMode = false;
  chromium.setHeadlessMode = true;
}

// Add proper type for page parameter
interface PuppeteerPage {
  evaluate: (fn: () => any) => Promise<any>;
  setViewport: (options: { width: number; height: number }) => void;
  setDefaultNavigationTimeout: (timeout: number) => void;
  setUserAgent: (userAgent: string) => Promise<void>;
  goto: (url: string, options?: any) => Promise<any>;
  close: () => Promise<void>;
  waitForSelector: (selector: string, options?: { timeout: number }) => Promise<any>;
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

// Prefix unused interface with underscore
interface _RawPinterestImage {
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
  const images = Array.from(document.querySelectorAll('img[src*="pinimg.com"]'))
    .slice(0, 50) // Limit initial collection
    .map(img => {
      const imgElement = img as HTMLImageElement;
      const url = imgElement.src.replace(/\/\d+x\//, '/originals/');
      if (url.includes('avatar') || url.includes('profile')) return null;
      
      const pinLink = imgElement.closest('a[href*="/pin/"]') as HTMLAnchorElement;
      const id = pinLink?.href?.split('/pin/')[1]?.split('/')[0] || 
                `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove element property before returning
      const result = { url, alt: imgElement.alt || '', width: 0, height: 0, id };
      return result;
    })
    .filter((img): img is PinterestImage => img !== null);

  return images;
};

// Prefix unused function with underscore
async function _ensureChromiumInTemp(): Promise<string> {
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
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--single-process',
        '--no-zygote',
        '--js-flags=--max-old-space-size=512'
      ],
      executablePath,
      defaultViewport: {
        width: 600,
        height: 800,
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

// Prefix unused function with underscore
async function _fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
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

// Prefix unused function with underscore
async function _autoScroll(page: PuppeteerPage): Promise<void> {
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
  } catch (_error) {
    console.error('Error expanding URL:', _error);
    throw new Error('Failed to expand shortened URL');
  }
}

function validatePinterestUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Accept both pin.it and pinterest domains
    const validDomains = ['pinterest.com', 'pinterest.ca', 'pin.it'];
    const isValidDomain = validDomains.some(domain => urlObj.hostname.includes(domain));
    
    if (!isValidDomain) {
      return false;
    }
    
    // For pin.it URLs, just verify basic structure
    if (urlObj.hostname.includes('pin.it')) {
      return true;
    }
    
    // For Pinterest boards, check for username/boardname pattern
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    return pathParts.length >= 2;
  } catch (_e) {
    return false;
  }
}

// Update error variable name to match convention
async function validateImages(images: PinterestImage[]): Promise<PinterestImage[]> {
  const batchSize = 5;
  const validatedImages: PinterestImage[] = [];
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, Math.min(i + batchSize, images.length));
    const validBatch = await Promise.all(
      batch.map(async img => {
        try {
          return await isValidImageUrl(img.url) ? img : null;
        } catch (_error) {
          return null;
        }
      })
    );
    
    // Fix type error by explicitly typing the filter operation
    const filteredBatch = validBatch.filter((img): img is PinterestImage => img !== null);
    validatedImages.push(...filteredBatch);
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return validatedImages;
}

export async function POST(request: Request): Promise<NextResponse> {
  let browser = null;
  let page = null;
  
  try {
    const { url } = await request.json();
    
    if (!validatePinterestUrl(url)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Pinterest URL. Please provide a valid Pinterest board or pin URL.' },
        { status: 400 }
      );
    }

    // Expand short URLs if needed
    const fullUrl = url.includes('pin.it') ? await expandShortUrl(url) : url;
    
    browser = await getBrowser();
    page = await browser.newPage();
    
    // Set minimal viewport and timeout
    await page.setViewport({ width: 800, height: 600 });
    await page.setDefaultNavigationTimeout(15000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');
    
    // Navigate with optimized settings
    await page.goto(fullUrl, { 
      waitUntil: 'domcontentloaded',  // Don't wait for full load
      timeout: 15000
    });

    // Quick check for images with short timeout
    try {
      await page.waitForSelector('img[src*="pinimg.com"]', { timeout: 5000 });
    } catch (_error) {
      // Continue even if timeout - some images might still be there
    }
    
    const rawImages = await page.evaluate(extractImagesFromPage);
    await page.close();
    page = null;
    
    if (!rawImages || rawImages.length === 0) {
      throw new Error('No images found on the Pinterest board');
    }

    // Validate images in smaller batches
    const validatedImages = await validateImages(rawImages);
    
    if (validatedImages.length === 0) {
      throw new Error('No valid images found on the Pinterest board');
    }

    return NextResponse.json({
      success: true,
      images: validatedImages
    });

  } catch (error) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to import from Pinterest. Please check the URL and try again.';
      
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  } finally {
    if (page) await page.close().catch(console.error);
    if (browser) await browser.close().catch(console.error);
  }
}

function extractImagesFromPinterestHtml(html: string) {
  // Try multiple regex patterns to find image URLs
  const patterns = [
    /"orig":{"url":"([^"]+)"/g,
    /https:\/\/[^"']*?\.pinimg\.com\/originals\/[^"']+/g
  ];
  
  let matches: string[] = [];
  
  for (const pattern of patterns) {
    const found = [...html.matchAll(pattern)].map(match => match[1] || match[0]);
    if (found.length > 0) {
      matches = found;
      break;
    }
  }
  
  return matches.map(url => ({
    url: url.replace(/\\u002F/g, '/'),
    alt: '',
    width: 1200,
    height: 1200
  }));
}