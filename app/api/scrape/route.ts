import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface PinterestImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  id: string;
}

const MAX_IMAGES = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

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

async function waitForTimeout(ms: number): Promise<void> {
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

export async function POST(request: Request) {
  let browser;
  try {
    const { url } = await request.json();
    console.log('Received URL:', url);
    
    let pinterestUrl = url.trim();
    
    // Handle pin.it URLs
    if (pinterestUrl.includes('pin.it')) {
      try {
        const response = await fetch(pinterestUrl, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'
          }
        });
        pinterestUrl = response.url;
      } catch (error) {
        throw new Error('Unable to expand Pinterest short URL');
      }
    }

    // Updated browser launch configuration with correct types
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0');
    await page.setViewport({ width: 1920, height: 1080 });

    let initialImages: PinterestImage[] = [];
    let retryCount = 0;

    while (retryCount < MAX_RETRIES && initialImages.length === 0) {
      try {
        await page.goto(pinterestUrl, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        // Enhanced access denied check
        const accessDenied = await page.evaluate(() => {
          const bodyText = document.body.textContent || '';
          return bodyText.includes('Access Denied') || 
                 bodyText.includes('Please verify you are a human') ||
                 bodyText.includes('<Error>') ||
                 bodyText.includes('<Code>AccessDenied</Code>');
        });

        if (accessDenied) {
          console.log(`Attempt ${retryCount + 1}: Access denied, retrying...`);
          await waitForTimeout(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
          retryCount++;
          continue;
        }

        await page.waitForSelector('img[src*="pinimg.com"]', { timeout: 10000 });
        
        // Get initial images with enhanced filtering
        initialImages = await page.evaluate(() => {
          const images = document.querySelectorAll('img[src*="pinimg.com"]');
          return Array.from(images, (img: Element) => {
            const imgEl = img as HTMLImageElement;
            const alt = imgEl.alt || '';
            
            // Skip images with error messages in alt text
            if (alt.includes('Access Denied') || 
                alt.includes('XML') || 
                alt.includes('<Error>') ||
                alt.includes('RequestId')) {
              return null;
            }

            return {
              url: imgEl.src,
              alt: alt,
              width: imgEl.naturalWidth,
              height: imgEl.naturalHeight,
              id: imgEl.src
            };
          }).filter((img): img is PinterestImage => 
            img !== null && 
            img.width >= 200 && 
            img.height >= 200 && 
            !img.url.includes('profile_') && 
            !img.url.includes('avatar_') &&
            !img.url.includes('75x75_') &&
            !img.url.includes('236x')
          );
        });

      } catch (error) {
        console.log(`Attempt ${retryCount + 1} failed:`, error);
        if (retryCount === MAX_RETRIES - 1) throw error;
        await waitForTimeout(RETRY_DELAY * (retryCount + 1));
        retryCount++;
      }
    }

    if (initialImages.length === 0) {
      throw new Error('Unable to access Pinterest board after multiple attempts');
    }

    // Process and validate images with more thorough checks
    console.log('Validating images...');
    const processedImages: PinterestImage[] = [];
    for (const img of initialImages) {
      const highQualityUrl = img.url.replace(/\/[0-9]+x\//g, '/originals/').split('?')[0];
      
      // Skip common error patterns in URLs
      if (highQualityUrl.includes('error') || 
          highQualityUrl.includes('placeholder') ||
          highQualityUrl.includes('default')) {
        continue;
      }

      // Validate the high-quality URL
      console.log(`Validating image: ${highQualityUrl}`);
      if (await isValidImageUrl(highQualityUrl)) {
        processedImages.push({
          ...img,
          url: highQualityUrl
        });
      } else {
        console.log(`Skipping invalid image: ${highQualityUrl}`);
        // Try fallback to original URL if high quality fails
        if (await isValidImageUrl(img.url)) {
          processedImages.push(img);
        }
      }
    }

    // Remove duplicates and limit
    const uniqueImages = processedImages
      .filter((img, index, self) => 
        index === self.findIndex(t => t.url === img.url)
      )
      .slice(0, MAX_IMAGES);

    if (uniqueImages.length === 0) {
      throw new Error('No valid images found in the Pinterest board');
    }

    console.log(`Successfully validated ${uniqueImages.length} images`);
    return NextResponse.json({ 
      images: uniqueImages,
      total: uniqueImages.length,
      status: 'complete'
    });

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