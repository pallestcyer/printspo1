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
    
    // Clean and validate URL
    let pinterestUrl = url.trim();
    
    // Handle short URLs
    if (pinterestUrl.includes('pin.it')) {
      try {
        const response = await fetch(pinterestUrl, {
          method: 'HEAD',
          redirect: 'follow'
        });
        pinterestUrl = response.url;
        console.log('Resolved Pinterest URL:', pinterestUrl);
      } catch (error) {
        console.error('Error resolving short URL:', error);
        throw new Error('Unable to resolve Pinterest short URL');
      }
    }

    // Validate Pinterest URL
    if (!pinterestUrl.match(/^https?:\/\/(www\.)?pinterest\.(com|ca|it)/i)) {
      throw new Error('Invalid Pinterest URL');
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set a more realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate with longer timeout and wait for network idle
    await page.goto(pinterestUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for Pinterest content
    await page.waitForSelector('img[src*="pinimg.com"]', { timeout: 10000 });
    await autoScroll(page);

    // Enhanced image extraction
    const images = await page.evaluate(() => {
      const imgElements = document.querySelectorAll('img[src*="pinimg.com"]');
      return Array.from(imgElements, (img: Element) => {
        const imgEl = img as HTMLImageElement;
        // Get highest quality image URL
        let imgUrl = imgEl.src
          .replace(/\/[0-9]+x\//, '/originals/')
          .replace(/\?.*$/, ''); // Remove query parameters
        
        return {
          url: imgUrl,
          alt: imgEl.alt || '',
          width: imgEl.naturalWidth || 0,
          height: imgEl.naturalHeight || 0,
          id: imgUrl
        };
      }).filter(img => 
        img.width >= 100 && 
        img.height >= 100 && 
        !img.url.includes('profile_') && 
        !img.url.includes('avatar_') &&
        img.url.includes('pinimg.com')
      );
    });

    if (images.length === 0) {
      throw new Error('No images found on this Pinterest page');
    }

    return NextResponse.json({ 
      images: images.slice(0, MAX_PINS),
      total: images.length,
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