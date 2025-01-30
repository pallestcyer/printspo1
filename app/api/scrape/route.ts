import { NextResponse } from 'next/server'
import cheerio from 'cheerio'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'Pinterest board URL is required' },
        { status: 400 }
      )
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch Pinterest board' },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Find all image elements (Pinterest uses specific classes for their images)
    const images = []
    $('img.hCL.kVc.L4E.MIw').each((_, element) => {
      const img = $(element)
      const src = img.attr('src')
      if (src) {
        images.push({
          url: src,
          alt: img.attr('alt') || '',
          width: img.attr('width'),
          height: img.attr('height')
        })
      }
    })

    // Limit to first 20 images
    const limitedImages = images.slice(0, 20)

    return NextResponse.json({ images: limitedImages })
  } catch (error) {
    console.error('Error scraping Pinterest board:', error)
    return NextResponse.json(
      { error: 'Failed to process Pinterest board' },
      { status: 500 }
    )
  }
}