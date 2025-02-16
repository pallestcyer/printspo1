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
    let executablePath: string | undefined;
    const options: any = {
      args: chromiumConfig.args,
      defaultViewport: {
        width: 600,
        height: 800,
        deviceScaleFactor: 1,
      },
      headless: true,
      ignoreHTTPSErrors: true,
      protocolTimeout: 15000
    };

    if (isVercel) {
      // Use @sparticuz/chromium on Vercel
      executablePath = await chromium.executablePath();
    } else {
      // In local development, try to use locally installed Chrome/Chromium
      if (process.platform === 'win32') {
        // Windows paths
        const possiblePaths = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          process.env.CHROME_PATH // Allow custom path via env variable
        ].filter(Boolean);

        for (const path of possiblePaths) {
          if (path && fs.existsSync(path)) {
            executablePath = path;
            break;
          }
        }
      } else {
        // Linux/Mac paths (for completeness)
        const possiblePaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          process.env.CHROME_PATH
        ].filter(Boolean);

        for (const path of possiblePaths) {
          if (path && fs.existsSync(path)) {
            executablePath = path;
            break;
          }
        }
      }
    }

    if (!executablePath) {
      throw new Error('Chrome not found. Please install Google Chrome or set CHROME_PATH environment variable.');
    }

    options.executablePath = executablePath;
    const browser = await puppeteer.launch(options);
    return browser as PuppeteerBrowser;
  } catch (_browserError: unknown) {
    console.error('Browser launch error:', _browserError);
    if (_browserError instanceof Error) {
      throw new Error(`Failed to launch browser: ${_browserError.message}`);
    }
    throw _browserError;
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

    // Shorter timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 20000);
    });

    const scrapePromise = async () => {
      browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setDefaultNavigationTimeout(8000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');
      
      // Set minimal viewport
      await page.setViewport({
        width: 800,
        height: 600
      });

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
          timeout: 8000
        });
      } catch (_navigationError) {
        throw new Error('Failed to load Pinterest board. Please check if the board is public and try again.');
      }

      const images = await Promise.race([
        page.evaluate(extractImagesFromPage),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image extraction timed out')), 6000)
        )
      ]) as PinterestImage[];

      // Close browser immediately after getting images
      await page.close();
      await browser.close();
      page = undefined;
      browser = undefined;

      if (!images || images.length === 0) {
        throw new Error('No images found on this Pinterest board. Please check if the board is public and contains images.');
      }

      // Validate images in batches
      const validatedImages = await validateImages(images);

      if (validatedImages.length === 0) {
        throw new Error('Could not access any images from this board. Please check if the images are publicly accessible.');
      }

      return { 
        images: validatedImages,
        total: validatedImages.length
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
    } catch (_cleanupError) {
      console.error('Error during cleanup:', _cleanupError);
    }
  }
}