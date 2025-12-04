import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

// Category URL configurations
export const CATEGORY_URLS = {
  milk: {
    blinkit: ['https://blinkit.com/cn/dairy-breakfast/milk/cid/14/922'],
    zepto: ["https://www.zepto.com/search?query=milk"],
    jiomart: ["https://www.jiomart.com/c/groceries/dairy-bakery/milk-milk-products/29011"]
  },
  'biscuits': {
    blinkit: ['https://blinkit.com/cn/bakery-biscuits/cream-biscuits/cid/888/105'],
    zepto: ["https://www.zepto.com/cn/biscuits/biscuits/cid/2552acf2-2f77-4714-adc8-e505de3985db/scid/3a10723e-ba14-4e5c-bdeb-a4dce2c1bec4"],
    jiomart: ["https://www.jiomart.com/c/groceries/biscuits-drinks-packaged-foods/biscuits-cookies/28998"]
  },
  'tea': {
    blinkit: ['https://blinkit.com/cn/tea/cid/12/957'],
    zepto: ["https://www.zepto.com/cn/tea-coffee-more/tea-coffee-more/cid/d7e98d87-6850-4cf9-a37c-e4fa34ae302c/scid/e6763c2d-0bf3-4332-82e4-0c8df1c94cad"],
    jiomart: ["https://www.jiomart.com/c/groceries/biscuits-drinks-packaged-foods/tea-coffee/29009"]
  },
  'chips': {
    blinkit: ['https://blinkit.com/cn/chips-crisps/cid/1237/940'],
    zepto: ["https://www.zepto.com/cn/munchies/munchies/cid/d2c2a144-43cd-43e5-b308-92628fa68596/scid/d648ea7c-18f0-4178-a202-4751811b086b"],
    jiomart: ["https://www.jiomart.com/c/groceries/biscuits-drinks-packaged-foods/chips-namkeens/29000"]
  },
  'hair-care': {
    blinkit: ['https://blinkit.com/s/?q=hair%20care'],
    zepto: ["https://www.zepto.com/search?query=hair+care"],
    jiomart: ["https://www.jiomart.com/c/groceries/personal-care/hair-care/92"]
  }
};

export const ALL_PINCODES = ['122018', '122017', '122016', '122015', '122011'];
// export const ALL_PINCODES = ['122018', '122017'];

async function scrapePlatform(platform, apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds

  const requestBody = {
    searchQueries: [],
    searchUrls: searchUrls,
    pincode: pincode,
    maxProductsPerSearch: 100,
    proxyConfiguration: {
      useApifyProxy: false,
      customProxyUrl: platform === 'blinkit' ? proxyUrl : null,
    },
    maxRequestRetries: 3,
    navigationTimeout: 90000,
    headless: true,
    screenshotOnError: true,
    debugMode: false,
    scrollCount: platform === 'blinkit' ? 8 : 5
  };

  if (platform === 'blinkit') {
    requestBody.deliveryLocation = null;
    requestBody.maxConcurrency = 2;
  }

  console.log(`\n🔵 Calling Apify for ${platform} - ${category} - ${pincode} (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
  console.log(`API URL: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Apify API error for ${platform}:`, errorText);
      
      // Check if it's a memory or resource error
      const isMemoryError = errorText.includes('memory') || 
                           errorText.includes('ENOMEM') || 
                           errorText.includes('out of memory') ||
                           response.status === 503 ||
                           response.status === 429;
      
      if (isMemoryError && retryCount < MAX_RETRIES) {
        console.log(`⚠️ Memory/Resource error detected. Retrying in ${RETRY_DELAY/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return scrapePlatform(platform, apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
      }
      
      throw new Error(`Apify API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Apify response for ${platform}:`, JSON.stringify(data).substring(0, 200));
    
    const items = Array.isArray(data) ? data : (data.items || data.data || data.output || []);
    console.log(`📦 Found ${items.length} items for ${platform}`);

    // If no items and we haven't retried, try again
    if (items.length === 0 && retryCount < MAX_RETRIES) {
      console.log(`⚠️ No items returned. Retrying in ${RETRY_DELAY/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return scrapePlatform(platform, apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
    }

    // Get last scraping session for this category/platform/pincode
    const lastSnapshot = await ProductSnapshot.findOne({
      category,
      platform,
      pincode
    }).sort({ scrapedAt: -1 });

    // Create a map of previous products by productId
    const previousProducts = new Map();
    if (lastSnapshot) {
      const previousSnapshots = await ProductSnapshot.find({
        category,
        platform,
        pincode,
        scrapedAt: lastSnapshot.scrapedAt
      });

      previousSnapshots.forEach(snap => {
        previousProducts.set(snap.productId, snap);
      });
    }

    // Process and save products with ranking
    const savedProducts = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ranking = i + 1; // 1-based ranking

      const productId = item.productId || item.id || item.productSlug || `${platform}-${i}`;
      const productName = item.productName || item.name || 'Unknown Product';
      const productImage = item.productImage || item.image || item.imageUrl;
      const productWeight = item.productWeight || item.weight || item.quantity;
      const currentPrice = Number(item.currentPrice || item.price || item.mrp || 0);
      const originalPrice = Number(item.originalPrice || item.mrp || item.price || 0);
      const discountPercentage = Number(item.discountPercentage || item.discount || 0);
      const productUrl = item.productUrl || item.url || item.link;

      const previous = previousProducts.get(productId);

      const priceChange = previous ? currentPrice - previous.currentPrice : 0;
      const discountChange = previous ? discountPercentage - previous.discountPercentage : 0;
      const rankingChange = previous ? ranking - previous.ranking : 0;

      const snapshot = new ProductSnapshot({
        category,
        pincode,
        platform,
        scrapedAt,
        productId,
        productName,
        productImage,
        productWeight,
        rating: Number(item.rating || 0),
        currentPrice,
        originalPrice,
        discountPercentage,
        ranking,
        priceChange,
        discountChange,
        rankingChange,
        productUrl,
        lastComparedWith: previous?._id
      });

      await snapshot.save();
      savedProducts.push(snapshot);
    }

    return {
      productsScraped: items.length,
      productsSaved: savedProducts.length,
      comparedWith: lastSnapshot ? lastSnapshot.scrapedAt : null
    };
  } catch (error) {
    console.error(`❌ Error in scrapePlatform for ${platform}:`, error.message);
    
    // Retry on any error if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️ Retrying in ${RETRY_DELAY/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return scrapePlatform(platform, apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
    }
    
    throw error;
  }
}

export async function scrapeCategory(category, pincodes) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const APIFY_PROXY_URL = process.env.APIFY_PROXY_URL || '';

  if (!APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN not configured');
  }

  const ZEPTO_API_URL = `https://api.apify.com/v2/acts/sharp_agenda~zepto-scrapper-om/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
  const BLINKIT_API_URL = `https://api.apify.com/v2/acts/sharp_agenda~blinkit-scrapper-om/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
  const JIOMART_API_URL = `https://api.apify.com/v2/acts/sharp_agenda~jiomart-scrapper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const urls = CATEGORY_URLS[category];
  if (!urls) {
    throw new Error(`Category '${category}' not configured`);
  }

  await dbConnect();

  // Fix the scrapedAt timestamp at the start of the scraping session
  const fixedScrapedAt = new Date();
  console.log(`🕐 Fixed scraping timestamp: ${fixedScrapedAt.toISOString()}`);

  const results = {
    category,
    pincodes,
    scrapedAt: fixedScrapedAt,
    platforms: {}
  };

  // Process each pincode
  for (const currentPincode of pincodes) {
    console.log(`\n📍 Scraping category '${category}' for pincode ${currentPincode}...`);

    // Scrape each platform SEQUENTIALLY to avoid memory issues
    const platformResults = [];

    // Zepto
    if (urls.zepto && urls.zepto.length > 0) {
      console.log(`\n⏳ Starting Zepto scraping...`);
      try {
        const result = await scrapePlatform('zepto', ZEPTO_API_URL, urls.zepto, currentPincode, category, APIFY_PROXY_URL, fixedScrapedAt);
        platformResults.push({ platform: 'zepto', status: 'fulfilled', value: result });
        console.log(`✅ Zepto scraping completed`);
        
        // Wait 3 seconds before next platform to avoid overwhelming Apify
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`❌ Zepto scraping failed:`, error.message);
        platformResults.push({ platform: 'zepto', status: 'rejected', reason: error });
      }
    }

    // Blinkit
    if (urls.blinkit && urls.blinkit.length > 0) {
      console.log(`\n⏳ Starting Blinkit scraping...`);
      try {
        const result = await scrapePlatform('blinkit', BLINKIT_API_URL, urls.blinkit, currentPincode, category, APIFY_PROXY_URL, fixedScrapedAt);
        platformResults.push({ platform: 'blinkit', status: 'fulfilled', value: result });
        console.log(`✅ Blinkit scraping completed`);
        
        // Wait 3 seconds before next platform
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.error(`❌ Blinkit scraping failed:`, error.message);
        platformResults.push({ platform: 'blinkit', status: 'rejected', reason: error });
      }
    }

    // JioMart
    if (urls.jiomart && urls.jiomart.length > 0) {
      console.log(`\n⏳ Starting JioMart scraping...`);
      try {
        const result = await scrapePlatform('jiomart', JIOMART_API_URL, urls.jiomart, currentPincode, category, APIFY_PROXY_URL, fixedScrapedAt);
        platformResults.push({ platform: 'jiomart', status: 'fulfilled', value: result });
        console.log(`✅ JioMart scraping completed`);
      } catch (error) {
        console.error(`❌ JioMart scraping failed:`, error.message);
        platformResults.push({ platform: 'jiomart', status: 'rejected', reason: error });
      }
    }

    // Process results
    platformResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (!results.platforms[result.platform]) {
          results.platforms[result.platform] = {};
        }
        results.platforms[result.platform][currentPincode] = result.value;
      } else {
        console.error(`Error scraping ${result.platform}:`, result.reason);
      }
    });

    console.log(`\n✅ Completed scraping for pincode ${currentPincode}`);
    
    // Wait 5 seconds before next pincode to avoid overwhelming Apify
    if (pincodes.indexOf(currentPincode) < pincodes.length - 1) {
      console.log(`⏳ Waiting 5 seconds before next pincode...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return results;
}
