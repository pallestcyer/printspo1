import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

const MAX_IMAGES = 50;

async function autoScroll(page: any) {
  try {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const maxScrolls = 50; // Limit scrolling
        let scrollCount = 0;
        
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  } catch (error) {
    console.log('Scroll completed or interrupted');
  }
}

export async function POST(request: Request) {
  let browser;
  try {
    const { url } = await request.json();
    console.log('Received URL:', url);
    const MAX_PINS = 42;
    
    // Handle short URLs first
    let pinterestUrl = url.trim();
    console.log('Processing URL:', pinterestUrl);

    if (pinterestUrl.includes('pin.it')) {
      console.log('Expanding short URL...');
      const response = await fetch(pinterestUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'
        }
      });
      pinterestUrl = response.url;
      console.log('Expanded URL:', pinterestUrl);
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to page...');
    await page.goto(pinterestUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for images to load
    console.log('Waiting for images...');
    try {
      await page.waitForSelector('img[src*="pinimg.com"]', { 
        timeout: 10000,
        visible: true 
      });
    } catch (error) {
      console.log('No Pinterest images found on initial load');
      throw new Error('No Pinterest images found. Please check the URL.');
    }

    // Get images with detailed logging
    const images = await page.evaluate(() => {
      console.log('Evaluating page content...');
      const images = document.querySelectorAll('img[src*="pinimg.com"]');
      console.log('Found', images.length, 'potential images');
      
      return Array.from(images, (img: Element) => {
        const imgEl = img as HTMLImageElement;
        return {
          url: imgEl.src,
          alt: imgEl.alt || '',
          width: imgEl.naturalWidth,
          height: imgEl.naturalHeight,
          id: imgEl.src
        };
      }).filter(img => {
        return img.width >= 200 && 
               img.height >= 200 && 
               !img.url.includes('profile_') && 
               !img.url.includes('avatar_');
      });
    });

    console.log('Filtered images count:', images.length);

    if (images.length === 0) {
      throw new Error('No valid images found in the board');
    }

    // Process and return images
    const processedImages = images
      .map(img => ({
        ...img,
        url: img.url.replace(/\/[0-9]+x\//g, '/736x/').split('?')[0]
      }))
      .slice(0, MAX_PINS);

    console.log('Returning', processedImages.length, 'images');

    return NextResponse.json({ 
      images: processedImages,
      total: processedImages.length,
      status: 'complete'
    });

  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json({ 
      error: error?.message || 'Failed to load Pinterest board',
      details: error?.stack || 'Unknown error'
    }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}