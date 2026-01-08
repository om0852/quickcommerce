import { NextResponse } from 'next/server';
import { scrapeCategory, scrapeCustomCategory } from '@/lib/scraper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { category, categories, pincode, pincodes } = body;

    // Support both single pincode and multiple pincodes
    const pincodesToScrape = pincodes || (pincode ? [pincode] : ['122018']);

    const allResults = [];

    // Handle new "categories" array format (for custom URLs)
    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log(`\n🚀 Received batch request for ${categories.length} categories`);

      for (const catObj of categories) {
        try {
          // Process each category sequentially to ensure isolation
          // (Note: scrapeCustomCategory runs platforms in PARALLEL internally)
          const result = await scrapeCustomCategory(catObj, pincodesToScrape);
          allResults.push({ success: true, category: catObj.name, result });
        } catch (err) {
          console.error(`❌ Failed to scrape category '${catObj.name}':`, err);
          allResults.push({ success: false, category: catObj.name, error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Batch category scraping completed',
        results: allResults
      }, { status: 200 });

    } else if (category) {
      // Fallback to legacy single category mode
      const result = await scrapeCategory(category, pincodesToScrape);
      return NextResponse.json({
        success: true,
        message: 'Category scraping completed',
        results: result
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Category or categories list is required' }, { status: 400 });
    }

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({
      error: 'Failed to scrape categories',
      message: error.message
    }, { status: 500 });
  }
}
