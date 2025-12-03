import { NextResponse } from 'next/server';
import { scrapeCategory } from '@/lib/scraper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { category, pincode, pincodes } = body;

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Support both single pincode and multiple pincodes
    const pincodesToScrape = pincodes || (pincode ? [pincode] : ['122018']);

    const results = await scrapeCategory(category, pincodesToScrape);

    return NextResponse.json({
      success: true,
      message: 'Category scraping completed',
      results
    }, { status: 200 });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({
      error: 'Failed to scrape categories',
      message: error.message
    }, { status: 500 });
  }
}
