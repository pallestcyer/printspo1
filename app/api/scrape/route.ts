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
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
    '--js-flags=--max-old-space-size=384',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-experiments',
    '--aggressive-cache-discard',
    '--disable-features=site-per-process',
    '--disable-features=TranslateUI',
    '--disable-features=BlinkGenPropertyTrees'
  ]
};

if (isVercel) {
  // Additional Vercel-specific optimizations
  chromiumConfig.args.push(
    '--disable-javascript',
    '--disable-images',
    '--lite-mode'
  );
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
  // Get all Pinterest images, filtering out avatars/profiles early
  const images = document.querySelectorAll('img[src*="pinimg.com"]');
  const results = [];
  
  for (const img of images) {
    const imgElement = img as HTMLImageElement;
    const url = imgElement.src.replace(/\/\d+x\//, '/originals/');
    
    // Skip non-pin images early
    if (url.includes('avatar') || url.includes('profile')) continue;
    
    // Get minimal required data
    const pinLink = imgElement.closest('a[href*="/pin/"]') as HTMLAnchorElement;
    const id = pinLink ? pinLink.href?.split('/pin/')[1]?.split('/')[0] : 
               `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    results.push({
      url,
      alt: imgElement.alt || '',
      width: 0, // We'll determine this when validating
      height: 0,
      id
    });
  }
  
  return results;
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

// Modify validation to handle more images efficiently
async function validateImages(images: PinterestImage[]): Promise<PinterestImage[]> {
  const validatedImages: PinterestImage[] = [];
  const batchSize = 4; // Validate in small batches to manage memory
  
  // First validate a small batch quickly for initial display
  const initialBatch = images.slice(0, batchSize);
  for (const img of initialBatch) {
    try {
      const isValid = await isValidImageUrl(img.url);
      if (isValid) {
        validatedImages.push(img);
      }
    } catch {
      continue;
    }
  }

  // Then validate the rest in batches
  if (images.length > batchSize) {
    const remaining = images.slice(batchSize);
    for (let i = 0; i < remaining.length; i += batchSize) {
      const batch = remaining.slice(i, i + batchSize);
      const batchPromises = batch.map(async (img) => {
        try {
          const isValid = await isValidImageUrl(img.url);
          return isValid ? img : null;
        } catch {
          return null;
        }
      });
      
      const validBatch = (await Promise.all(batchPromises)).filter((img): img is PinterestImage => img !== null);
      validatedImages.push(...validBatch);
    }
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

    // Even shorter timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 20000);
    });

    const scrapePromise = async () => {
      browser = await getBrowser();
      page = await browser.newPage();
      
      await page.setDefaultNavigationTimeout(8000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');

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
          setTimeout(() => reject(new Error('Image extraction timed out')), 6000) // Increased slightly for more images
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

      // Validate all images in batches
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