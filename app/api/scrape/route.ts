/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import _cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
// import { _GenericObject, _ApiResponse, _ImageData } from '@/app/types';

// Configure route options
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'iad1';
export const maxDuration = 60;

// Determine environment
const isVercel = process.env.VERCEL === '1';
const isDev = process.env.NODE_ENV === 'development';

// Configure Chromium with minimal settings
const chromiumConfig = {
  args: [
    ...chromium.args,
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-extensions'
  ],
  executablePath: await chromium.executablePath(),
  headless: true,
  ignoreHTTPSErrors: true
};

if (isVercel) {
  chromium.setGraphicsMode = false;
  chromium.setHeadlessMode = true;
}

// Interfaces
interface PuppeteerPage {
  evaluate: <T>(fn: (...args: any[]) => T, ...args: any[]) => Promise<T>;
  evaluateHandle: (fn: (...args: any[]) => any, ...args: any[]) => Promise<any>;
  setViewport: (options: { width: number; height: number }) => Promise<void>;
  setDefaultNavigationTimeout: (timeout: number) => void;
  setUserAgent: (userAgent: string) => Promise<void>;
  goto: (url: string, options?: any) => Promise<any>;
  close: () => Promise<void>;
  waitForSelector: (selector: string, options?: { timeout: number }) => Promise<any>;
  waitForFunction: (fn: () => boolean, options?: { timeout: number }) => Promise<void>;
  content: () => Promise<string>;
  $: (selector: string) => Promise<any>;
  $$: (selector: string) => Promise<any[]>;
  $eval: <T>(selector: string, fn: (element: Element, ...args: any[]) => T, ...args: any[]) => Promise<T>;
  $$eval: <T>(selector: string, fn: (elements: Element[], ...args: any[]) => T, ...args: any[]) => Promise<T>;
  screenshot: (options?: { path?: string, type?: string, fullPage?: boolean }) => Promise<Buffer>;
}

interface PuppeteerBrowser {
  newPage: () => Promise<PuppeteerPage>;
  close: () => Promise<void>;
  pages: () => Promise<PuppeteerPage[]>;
  version: () => Promise<string>;
}

interface PinterestImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  id: string;
}

interface _PinterestResponse {
  resource_response: {
    data: {
      results: PinterestPin[];
    };
  };
}

interface PinterestPin {
  images: {
    [key: string]: {
      url: string;
      width: number;
      height: number;
    };
  };
  description: string;
  title: string;
  id: string;
  link: string;
}

interface _ScrapedImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  source: string;
}

// Constants
const MAX_IMAGES = 100;
const _MAX_RETRIES = 3;
const _RETRY_DELAY = 1000;
const _SCROLL_TIMEOUT = 15000;
const _PAGE_LOAD_TIMEOUT = 30000;
const IMAGE_SELECTOR_TIMEOUT = 10000;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Main image extraction function
const extractImagesFromPage = () => {
  const images: PinterestImage[] = [];
  const urlSet = new Set<string>();
  
  // Method 1: Direct DOM extraction
  // Target all possible image containers that Pinterest might use
  const imageSelectors = [
    'img[srcset*="pinimg.com"]',
    'img[src*="pinimg.com"]',
    'div[data-test-id="pin"] img',
    'div[role="listitem"] img',
    'div[data-grid-item="true"] img'
  ];
  
  const allImageElements = [];
  for (const selector of imageSelectors) {
    const elements = document.querySelectorAll(selector);
    allImageElements.push(...Array.from(elements));
  }
  
  // Process found images
  for (const imgElement of allImageElements as HTMLImageElement[]) {
    // Skip irrelevant images
    if (!imgElement.src || 
        imgElement.src.includes('avatar') || 
        imgElement.src.includes('profile') || 
        imgElement.width < 100 || 
        imgElement.height < 100) {
      continue;
    }
    
    // Get closest pin container to check if it's in an "explore" section
    const pinContainer = imgElement.closest('div[data-test-id="pin"]') || 
                        imgElement.closest('div[role="listitem"]') || 
                        imgElement.closest('div[data-grid-item="true"]');
                        
    if (pinContainer) {
      // Skip "More ideas" or "Explore" sections
      const parentSection = pinContainer.closest('div[role="region"][aria-label*="More ideas"]') ||
                           pinContainer.closest('div[role="region"][aria-label*="Explore"]') ||
                           pinContainer.closest('div[data-test-id="related-ideas-section"]');
      
      if (parentSection) continue;
    }
    
    // Extract the pin ID from containing link
    let pinId = '';
    const pinLink = imgElement.closest('a[href*="/pin/"]') as HTMLAnchorElement;
    if (pinLink?.href) {
      const match = pinLink.href.match(/\/pin\/(\d+)/);
      if (match && match[1]) {
        pinId = match[1];
      }
    }
    
    if (!pinId) {
      pinId = `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Get best quality image URL
    let imageUrl = imgElement.src;
    
    // Try to get higher resolution from srcset if available
    if (imgElement.srcset) {
      const srcsetParts = imgElement.srcset.split(',');
      for (let i = srcsetParts.length - 1; i >= 0; i--) {
        const part = srcsetParts[i].trim();
        const url = part.split(' ')[0];
        if (url && url.includes('pinimg.com')) {
          imageUrl = url;
          break;
        }
      }
    }
    
    // Ensure we get original quality
    if (!imageUrl.includes('/originals/')) {
      imageUrl = imageUrl.replace(/\/\d+x\//, '/originals/');
    }
    
    // Skip if we've already added this URL
    if (urlSet.has(imageUrl)) continue;
    urlSet.add(imageUrl);
    
    images.push({
      url: imageUrl,
      alt: imgElement.alt || '',
      width: imgElement.naturalWidth || imgElement.width || 800,
      height: imgElement.naturalHeight || imgElement.height || 1200,
      id: pinId
    });
  }
  
  // Method 2: JSON data extraction
  try {
    // Look for embedded JSON data
    const scripts = document.querySelectorAll('script[type="application/json"]');
    scripts.forEach(script => {
      try {
        if (!script.textContent) return;
        
        const data = JSON.parse(script.textContent);
        
        // Handle different Pinterest data structures
        let pins = [];
        
        // Structure 1: Redux state
        if (data.props?.initialReduxState?.pins) {
          pins = Object.values(data.props.initialReduxState.pins);
        } 
        // Structure 2: Direct pins array
        else if (data.pins) {
          pins = Array.isArray(data.pins) ? data.pins : [data.pins];
        } 
        // Structure 3: Resource response
        else if (data.resource_response?.data) {
          pins = Array.isArray(data.resource_response.data) 
            ? data.resource_response.data 
            : [data.resource_response.data];
        }
        // Structure 4: Resource data
        else if (data.resourceResponses) {
          data.resourceResponses.forEach((response: any) => {
            if (response?.response?.data) {
              const responseData = response.response.data;
              if (Array.isArray(responseData)) {
                pins.push(...responseData);
              } else if (responseData.pins) {
                pins.push(...responseData.pins);
              } else {
                pins.push(responseData);
              }
            }
          });
        }
        
        // Process found pins
        pins.forEach((pin: any) => {
          if (!pin || (!pin.images && !pin.image)) return;
          
          // Different image object locations
          const imageObj = pin.images || pin.image || {};
          
          // Find the best image
          let bestImage = imageObj.orig || imageObj.original || imageObj['736x'] || imageObj['474x'];
          
          // If standard sizes aren't available, find the largest
          if (!bestImage) {
            const sizeKeys = Object.keys(imageObj).sort((a, b) => {
              const aSize = parseInt(a, 10) || 0;
              const bSize = parseInt(b, 10) || 0;
              return bSize - aSize;
            });
            
            if (sizeKeys.length > 0) {
              bestImage = imageObj[sizeKeys[0]];
            }
          }
          
          if (bestImage?.url) {
            const imageUrl = bestImage.url.includes('/originals/')
              ? bestImage.url
              : bestImage.url.replace(/\/\d+x\//, '/originals/');
            
            // Skip if we've already added this URL
            if (urlSet.has(imageUrl)) return;
            urlSet.add(imageUrl);
            
            images.push({
              url: imageUrl,
              alt: pin.description || pin.title || '',
              width: bestImage.width || 800,
              height: bestImage.height || 1200,
              id: pin.id || `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
          }
        });
      } catch (_e) {
        // Silently ignore parsing errors
      }
    });
  } catch (_e) {
    // Ignore JSON extraction errors
  }
  
  // Method 3: Raw HTML parsing for image URLs
  if (images.length === 0) {
    try {
      // Look for image URLs directly in the HTML
      const html = document.documentElement.innerHTML;
      const origUrlRegex = /https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9\/\._-]+\.(?:jpg|jpeg|png|gif|webp)/g;
      const matches = html.match(origUrlRegex);
      
      if (matches) {
        let id = 1;
        matches.forEach(url => {
          if (!urlSet.has(url)) {
            urlSet.add(url);
            images.push({
              url,
              alt: '',
              width: 800,
              height: 1200,
              id: `pin_${id++}`
            });
          }
        });
      }
    } catch (_e) {
      // Ignore regex extraction errors
    }
  }
  
  return images;
};

// Define a proper autoScroll function that works with Puppeteer's Page type
async function autoScroll(page: Page): Promise<void> {
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

// Ensure images are fully loaded
async function ensureImagesLoaded(page: Page): Promise<void> {
  console.log('Waiting for page to load completely');
  
  // First wait for page load
  try {
    await page.waitForFunction(() => document.readyState === 'complete', { 
      timeout: 10000 
    });
  } catch (_e) {
    console.log('Page load timeout, continuing anyway');
  }
  
  // Look for any Pinterest image
  console.log('Waiting for Pinterest images to appear');
  try {
    await page.waitForSelector('img[src*="pinimg.com"]', { timeout: IMAGE_SELECTOR_TIMEOUT });
  } catch (_e) {
    console.log('No Pinterest images found in initial load, trying alternative selectors');
    
    // Try alternative selectors
    const alternativeSelectors = [
      'div[data-test-id="pin"]',
      'div[role="listitem"]',
      'div[data-grid-item="true"]'
    ];
    
    let selectorFound = false;
    for (const selector of alternativeSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        selectorFound = true;
        console.log(`Found alternative selector: ${selector}`);
        break;
      } catch {
        continue;
      }
    }
    
    if (!selectorFound) {
      console.log('No Pinterest content selectors found');
    }
  }
  
  // Wait a bit for initial content to render
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Scroll to trigger lazy loading
  console.log('Scrolling to load more images');
  await autoScroll(page);
  
  // Final pause to let any remaining images load
  await new Promise(resolve => setTimeout(resolve, 1500));
}

// Function to get browser instance
async function getBrowser(): Promise<Browser> {
  try {
    if (isVercel) {
      return await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ],
        executablePath: await chromium.executablePath(),
        headless: true,
        ignoreHTTPSErrors: true
      });
    } else {
      // Development configuration
      return await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--headless=new'
        ],
        ignoreHTTPSErrors: true
      });
    }
  } catch (error) {
    console.error('Failed to launch browser:', error);
    throw error;
  }
}

// Verify image URL is valid
async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    // First clean the URL if needed
    const cleanUrl = url
      .replace(/\\u002F/g, '/')
      .replace(/\\/g, '')
      .replace(/^http:/, 'https:');
      
    const response = await fetch(cleanUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://www.pinterest.com/'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') ?? false;
  } catch (_e) {
    return false;
  }
}

// Expand shortened pin.it URLs
async function expandShortUrl(shortUrl: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.url;
  } catch (_error) {
    console.error('URL expansion error:', _error);
    throw new Error('Failed to expand shortened Pinterest URL');
  }
}

// Validate Pinterest URL format
function _validatePinterestUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // List of valid Pinterest domains
    const validDomains = [
      'pinterest.com', 'www.pinterest.com',
      'pinterest.ca', 'www.pinterest.ca',
      'pinterest.co.uk', 'www.pinterest.co.uk',
      'pinterest.fr', 'www.pinterest.fr',
      'pinterest.de', 'www.pinterest.de',
      'pinterest.es', 'www.pinterest.es',
      'pinterest.it', 'www.pinterest.it',
      'pinterest.jp', 'www.pinterest.jp',
      'pin.it'
    ];
    
    const domain = urlObj.hostname.toLowerCase();
    if (!validDomains.includes(domain) && !domain.endsWith('pinterest.com')) {
      return false;
    }
    
    // Check URL path patterns
    const path = urlObj.pathname;
    
    // Valid pin.it URLs (short URLs)
    if (domain === 'pin.it' && path.length > 1) {
      return true;
    }
    
    // Valid pin URLs
    if (path.includes('/pin/')) {
      return true;
    }
    
    // Valid board URLs: /{username}/{boardname}/
    const pathParts = path.split('/').filter(Boolean);
    return pathParts.length >= 2;
  } catch (_error) {
    return false;
  }
}

// Validate image URLs and remove duplicates
async function validateImages(images: PinterestImage[]): Promise<PinterestImage[]> {
  if (!images || images.length === 0) return [];
  
  console.log(`Validating ${images.length} images`);
  const batchSize = 5;
  const validatedImages: PinterestImage[] = [];
  const processedUrls = new Set<string>();
  
  for (let i = 0; i < Math.min(images.length, MAX_IMAGES); i += batchSize) {
    const batch = images.slice(i, Math.min(i + batchSize, images.length));
    
    const validBatch = await Promise.all(
      batch.map(async img => {
        try {
          if (!img.url || processedUrls.has(img.url)) return null;
          processedUrls.add(img.url);
          
          // Clean and normalize URL
          const cleanUrl = img.url
            .replace(/\\u002F/g, '/')
            .replace(/\\/g, '')
            .replace(/^http:/, 'https:');
          
          // Make sure it points to originals
          const finalUrl = cleanUrl.includes('/originals/') 
            ? cleanUrl 
            : cleanUrl.replace(/\/\d+x\//, '/originals/');
          
          // Check if image URL is valid
          const isValid = await isValidImageUrl(finalUrl);
          return isValid ? { ...img, url: finalUrl } : null;
        } catch (_error) {
          console.error('Image validation error:', _error);
          return null;
        }
      })
    );
    
    // Filter out failed validations
    const filteredBatch = validBatch.filter((img): img is PinterestImage => img !== null);
    validatedImages.push(...filteredBatch);
    
    // Allow garbage collection between batches
    if (global.gc) global.gc();
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return validatedImages;
}

// Main API handler
export async function POST(req: Request) {
  let browser: Browser | null = null;
  
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Initialize browser
    browser = await getBrowser();
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(USER_AGENT);
    await page.setDefaultNavigationTimeout(_PAGE_LOAD_TIMEOUT);

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: _PAGE_LOAD_TIMEOUT
    });

    // Wait for images to load
    await page.waitForSelector('img', { timeout: IMAGE_SELECTOR_TIMEOUT });

    // Extract images using client-side script
    const images = await page.evaluate(extractImagesFromPage);

    // Close browser
    await browser.close();
    browser = null;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No images found' },
        { status: 404 }
      );
    }

    // Return the scraped images
    return NextResponse.json({
      images: images.slice(0, MAX_IMAGES),
      name: url.split('/').pop() || 'Pinterest Board'
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scrape Pinterest board',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}

// Helper function to extract board name from URL
function extractBoardName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // For board URLs like pinterest.com/username/boardname/
    if (pathParts.length >= 2) {
      return pathParts[1].replace(/-/g, ' ');
    }
    
    // For pin URLs, use a generic name
    if (url.includes('/pin/')) {
      return 'Pinterest Collection';
    }
    
    return 'Pinterest Board';
  } catch (_error) {
    return 'Pinterest Board';
  }
}