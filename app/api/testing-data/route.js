import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

// Test parameters
const TEST_CATEGORY = 'milk';
const TEST_PINCODE = '122018';

export async function GET(request) {
  try {
    await dbConnect();

    console.log(`\n🔍 Fetching data for category: ${TEST_CATEGORY}, pincode: ${TEST_PINCODE}\n`);

    // Get total count
    const totalCount = await ProductSnapshot.countDocuments({
      category: TEST_CATEGORY,
      pincode: TEST_PINCODE
    });

    console.log(`📊 Total documents found: ${totalCount}`);

    // Get latest scraping timestamp
    const latestSnapshot = await ProductSnapshot.findOne({
      category: TEST_CATEGORY,
      pincode: TEST_PINCODE
    }).sort({ scrapedAt: -1 });

    if (!latestSnapshot) {
      return NextResponse.json({
        success: false,
        message: 'No data found for milk category',
        category: TEST_CATEGORY,
        pincode: TEST_PINCODE,
        totalDocuments: 0
      });
    }

    const latestScrapedAt = latestSnapshot.scrapedAt;
    console.log(`📅 Latest scrape time: ${latestScrapedAt}`);

    // Get all products from latest scrape
    const latestProducts = await ProductSnapshot.find({
      category: TEST_CATEGORY,
      pincode: TEST_PINCODE,
      scrapedAt: latestScrapedAt
    }).sort({ platform: 1, ranking: 1 });

    // Group by platform
    const platformStats = {
      zepto: { count: 0, products: [] },
      blinkit: { count: 0, products: [] },
      jiomart: { count: 0, products: [] }
    };

    latestProducts.forEach(product => {
      if (platformStats[product.platform]) {
        platformStats[product.platform].count++;
        platformStats[product.platform].products.push({
          productId: product.productId,
          productName: product.productName,
          currentPrice: product.currentPrice,
          ranking: product.ranking,
          scrapedAt: product.scrapedAt
        });
      }
    });

    // Get unique scrape times (for history)
    const uniqueScrapeTimes = await ProductSnapshot.aggregate([
      {
        $match: {
          category: TEST_CATEGORY,
          pincode: TEST_PINCODE
        }
      },
      {
        $group: {
          _id: '$scrapedAt',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      },
      {
        $limit: 10
      }
    ]);

    console.log(`\n📈 Platform breakdown (latest scrape):`);
    console.log(`   Zepto: ${platformStats.zepto.count} products`);
    console.log(`   Blinkit: ${platformStats.blinkit.count} products`);
    console.log(`   JioMart: ${platformStats.jiomart.count} products`);
    console.log(`\n🕐 Total unique scrape times: ${uniqueScrapeTimes.length}`);

    return NextResponse.json({
      success: true,
      category: TEST_CATEGORY,
      pincode: TEST_PINCODE,
      summary: {
        totalDocuments: totalCount,
        latestScrapeTime: latestScrapedAt,
        uniqueScrapeTimes: uniqueScrapeTimes.length,
        latestProductCount: latestProducts.length
      },
      platforms: {
        zepto: {
          count: platformStats.zepto.count,
          sampleProducts: platformStats.zepto.products.slice(0, 5)
        },
        blinkit: {
          count: platformStats.blinkit.count,
          sampleProducts: platformStats.blinkit.products.slice(0, 5)
        },
        jiomart: {
          count: platformStats.jiomart.count,
          sampleProducts: platformStats.jiomart.products.slice(0, 5)
        }
      },
      scrapeTimes: uniqueScrapeTimes.map(st => ({
        time: st._id,
        productCount: st.count
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching data:', error);
    return NextResponse.json({
      error: 'Failed to fetch data',
      message: error.message
    }, { status: 500 });
  }
}
