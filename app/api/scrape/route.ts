import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    console.log('Received URL:', url);

    if (!url || !url.includes('pinterest.com')) {
      console.error('Invalid URL:', url);
      return NextResponse.json(
        { error: 'Valid Pinterest board URL is required' },
        { status: 400 }
      );
    }

    const response = await fetch('http://www.printspo.ca/api/scrape-pinterest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    console.log('Response from external API:', response);

    if (!response.ok) {
      throw new Error(`External API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Data received from external API:', data);

    if (!data.images || !Array.isArray(data.images)) {
      throw new Error('Invalid response format from external API');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error scraping Pinterest board:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}