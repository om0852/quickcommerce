import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

// Single category and pincode for testing
const TEST_CATEGORY = 'milk';
const TEST_PINCODE = '122018';

const CATEGORY_URLS = {
  milk: {
    blinkit: ['https://blinkit.com/cn/dairy-breakfast/milk/cid/14/922'],
    zepto: ["https://www.zepto.com/cn/dairy-bread-eggs/dairy-bread-eggs/cid/4b938e02-7bde-4479-bc0a-2b54cb6bd5f5/scid/22964a2b-0439-4236-9950-0d71b532b243"],
    jiomart: ["https://www.jiomart.com/c/groceries/dairy-bakery/milk-milk-products/29011"]
  }
};

async function scrapePlatformTest(platform, apiUrl, searchUrls, pincode, category, proxyUrl) {
  const requestBody = {
    searchQueries: [],
    searchUrls: searchUrls,
    pincode: pincode,
    maxProductsPerSearch: 500,
    proxyConfiguration: {
      useApifyProxy: false,
      customProxyUrl: proxyUrl || null,
    },
    maxRequestRetries: 3,
    navigationTimeout: 90000,
    headless: true,
    screenshotOnError: true,
    debugMode: false,
    scrollCount: platform === 'blinkit' ? 40 : 40
  };

  if (platform === 'blinkit') {
    requestBody.deliveryLocation = null;
    requestBody.maxConcurrency = 2;
  }

  console.log(`\n🔵 Testing ${platform} scraper...`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apify API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const items = Array.isArray(data) ? data : (data.items || data.data || data.output || []);
  
  // Calculate response size
  const responseSize = JSON.stringify(data).length;
  const responseSizeKB = (responseSize / 1024).toFixed(2);
  const responseSizeMB = (responseSize / (1024 * 1024)).toFixed(2);

  console.log(`✅ ${platform}: ${items.length} products, Response size: ${responseSizeMB} MB`);

  return {
    platform,
    productCount: items.length,
    responseSizeBytes: responseSize,
    responseSizeKB: parseFloat(responseSizeKB),
    responseSizeMB: parseFloat(responseSizeMB),
    sampleProducts: items.slice(0, 3).map(item => ({
      name: item.productName || item.name,
      price: item.currentPrice || item.price,
      id: item.productId || item.id
    }))
  };
}

export async function GET(request) {
  try {
    const APIFY_TOKEN_1 = process.env.APIFY_TOKEN_4;
    const APIFY_TOKEN_2 = process.env.APIFY_TOKEN_2;
    const APIFY_TOKEN_3 = process.env.APIFY_TOKEN_3;
    const APIFY_PROXY_URL = process.env.APIFY_PROXY_URL || '';

    if (!APIFY_TOKEN_1 || !APIFY_TOKEN_2 || !APIFY_TOKEN_3) {
      return NextResponse.json({ error: 'APIFY_TOKENs not configured' }, { status: 500 });
    }

    const ZEPTO_API_URL = `https://api.apify.com/v2/acts/fateful_spinner~zepto-scrapper-om/run-sync-get-dataset-items?token=${APIFY_TOKEN_1}`;
    const BLINKIT_API_URL = `https://api.apify.com/v2/acts/blinkit-scrapper~blinkit-scrapper-om/run-sync-get-dataset-items?token=${APIFY_TOKEN_2}`;
    const JIOMART_API_URL = `https://api.apify.com/v2/acts/jiomart-scrapper~jiomart-scrapper/run-sync-get-dataset-items?token=${APIFY_TOKEN_3}`;

    const urls = CATEGORY_URLS[TEST_CATEGORY];
    
    await dbConnect();

    console.log(`\n🧪 TESTING SCRAPER FOR: ${TEST_CATEGORY} - ${TEST_PINCODE}\n`);

    // Scrape all platforms in parallel
    const promises = [];

    if (urls.zepto) {
      promises.push(scrapePlatformTest('zepto', ZEPTO_API_URL, urls.zepto, TEST_PINCODE, TEST_CATEGORY, APIFY_PROXY_URL));
    }
    if (urls.blinkit) {
      promises.push(scrapePlatformTest('blinkit', BLINKIT_API_URL, urls.blinkit, TEST_PINCODE, TEST_CATEGORY, APIFY_PROXY_URL));
    }
    if (urls.jiomart) {
      promises.push(scrapePlatformTest('jiomart', JIOMART_API_URL, urls.jiomart, TEST_PINCODE, TEST_CATEGORY, APIFY_PROXY_URL));
    }

    const results = await Promise.allSettled(promises);

    // Process results
    const platformResults = {};
    let totalProducts = 0;
    let totalSizeBytes = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        platformResults[data.platform] = {
          productCount: data.productCount,
          responseSizeKB: data.responseSizeKB,
          responseSizeMB: data.responseSizeMB,
          sampleProducts: data.sampleProducts
        };
        totalProducts += data.productCount;
        totalSizeBytes += data.responseSizeBytes;
      } else {
        platformResults[result.reason?.platform || 'unknown'] = {
          error: result.reason?.message || 'Unknown error',
          productCount: 0
        };
      }
    });

    const totalSizeKB = (totalSizeBytes / 1024).toFixed(2);
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Total Response Size: ${totalSizeMB} MB`);

    return NextResponse.json({
      success: true,
      category: TEST_CATEGORY,
      pincode: TEST_PINCODE,
      summary: {
        totalProducts,
        totalSizeBytes,
        totalSizeKB: parseFloat(totalSizeKB),
        totalSizeMB: parseFloat(totalSizeMB)
      },
      platforms: platformResults
    });

  } catch (error) {
    console.error('Testing error:', error);
    return NextResponse.json({
      error: 'Testing failed',
      message: error.message
    }, { status: 500 });
  }
}
