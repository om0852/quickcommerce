import { NextResponse } from 'next/server';
import { scrapeCategory, CATEGORY_URLS, ALL_PINCODES } from '@/lib/scraper';

export async function POST(request) {
  try {
    const categories = Object.keys(CATEGORY_URLS);
    const pincodes = ALL_PINCODES;
    
    const results = {
      startedAt: new Date(),
      categories: {},
      summary: {
        total: categories.length,
        successful: 0,
        failed: 0
      }
    };

    // Process categories ONE AT A TIME
    for (const category of categories) {
      try {
        console.log(`\n📦 Testing scrape for category: ${category}`);
        
        // Call the scraping function directly
        const data = await scrapeCategory(category, pincodes);
        
        results.categories[category] = {
          success: true,
          message: 'Scraping completed',
          platforms: data.platforms || {}
        };

        results.summary.successful++;
        console.log(`✅ ${category} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Error scraping ${category}:`, error);
        results.categories[category] = {
          success: false,
          error: error.message
        };
        results.summary.failed++;
      }
      
      // Wait 10 seconds between categories to avoid overwhelming Apify
      if (categories.indexOf(category) < categories.length - 1) {
        console.log(`⏳ Waiting 10 seconds before next category...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    results.completedAt = new Date();
    results.duration = `${Math.round((new Date(results.completedAt) - new Date(results.startedAt)) / 1000)}s`;

    return NextResponse.json({
      success: true,
      message: 'Test scraping completed',
      results
    }, { status: 200 });

  } catch (error) {
    console.error('Test scraping error:', error);
    return NextResponse.json({
      error: 'Failed to run test scraping',
      message: error.message
    }, { status: 500 });
  }
}
