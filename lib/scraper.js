import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import apiKeyManager from '@/lib/apiKeyManager';
import queueManager from '@/lib/queueManager';
import { scrapePlatformParallel } from '@/lib/parallelScraper';
import { scrapeInstamart } from '@/lib/instamartScraper';

// Category URL configurations
export const CATEGORY_URLS = {
  milk: {
    blinkit: ['https://blinkit.com/cn/dairy-breakfast/milk/cid/14/922'],
    zepto: ["https://www.zepto.com/cn/dairy-bread-eggs/dairy-bread-eggs/cid/4b938e02-7bde-4479-bc0a-2b54cb6bd5f5/scid/22964a2b-0439-4236-9950-0d71b532b243"],
    jiomart: ["https://www.jiomart.com/c/groceries/dairy-bakery/milk-milk-products/29011"],
    dmart: ["https://www.dmart.in/category/dairy-aesc-dairy?_rsc=5nnz0"],
    instamart: ["https://www.swiggy.com/instamart/category-listing?categoryName=Dairy"]
  },
  'biscuits': {
    blinkit: ['https://blinkit.com/cn/bakery-biscuits/cream-biscuits/cid/888/105'],
    zepto: ["https://www.zepto.com/cn/biscuits/biscuits/cid/2552acf2-2f77-4714-adc8-e505de3985db/scid/3a10723e-ba14-4e5c-bdeb-a4dce2c1bec4"],
    jiomart: ["https://www.jiomart.com/c/groceries/biscuits-drinks-packaged-foods/biscuits-cookies/28998"],
    dmart: ["https://www.dmart.in/category/biscuits-226525--1?_rsc=1rznb"]
  },
  'tea': {
    blinkit: ['https://blinkit.com/cn/tea/cid/12/957'],
    zepto: ["https://www.zepto.com/cn/tea-coffee-more/tea-coffee-more/cid/d7e98d87-6850-4cf9-a37c-e4fa34ae302c/scid/e6763c2d-0bf3-4332-82e4-0c8df1c94cad"],
    jiomart: ["https://www.jiomart.com/c/groceries/biscuits-drinks-packaged-foods/tea-coffee/29009"],
    dmart: ["https://www.dmart.in/category/tea-aesc-teasc2"]
  },
  'chips': {
    blinkit: ['https://blinkit.com/cn/chips-crisps/cid/1237/940'],
    zepto: ["https://www.zepto.com/cn/munchies/munchies/cid/d2c2a144-43cd-43e5-b308-92628fa68596/scid/d648ea7c-18f0-4178-a202-4751811b086b"],
    jiomart: ["https://www.jiomart.com/c/groceries/biscuits-drinks-packaged-foods/chips-namkeens/29000"],
    dmart: ["https://www.dmart.in/category/chips---wafers-aesc-chips---waferssc2?_rsc=4l14p"]
  },
  'hair-care': {
    blinkit: ['https://blinkit.com/cn/personal-care/hair-care/cid/163/691'],
    zepto: ["https://www.zepto.com/uncl/top-deals-on-bestsellers/1aabfb1a-fb76-4e41-a274-944a1eac5ffb"],
    jiomart: ["https://www.jiomart.com/c/groceries/personal-care/hair-care/92"],
    dmart: ["https://www.dmart.in/category/hair-care-208506--1?_rsc=qw1q2"]
  }
};

export const ALL_PINCODES = ['201303', '201014', '122008', '122010', '122016'];
// export const ALL_PINCODES = ['122018', '122017'];

function cleanProductName(name = '') {
  let normalized = String(name).toLowerCase();

  // Remove content in parentheses (packaging details like "Tetra Pack", "Pouch", "Tub")
  normalized = normalized.replace(/\([^)]*\)/g, ' ');

  // Remove content in square brackets
  normalized = normalized.replace(/\[[^\]]*\]/g, ' ');

  // Remove special characters but keep spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

  // Remove common packaging and filler words
  normalized = normalized.replace(/\b(tetra\s*pack|tetra|pouch|tub|bottle|carton|box|tin|can|jar|packet|sachet)\b/g, ' ');
  normalized = normalized.replace(/\b(of|and|with|pack|pcs|pc|pieces|piece)\b/g, ' ');

  // Remove units (but keep numbers)
  normalized = normalized.replace(/\b(kg|kgs|g|gm|gms|gram|grams|ml|ltr|litre|litres|liter|liters|l)\b/g, ' ');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

// Transform DMart data to match our schema
function transformDMartData(item, index) {
  // Handle both data structure formats from DMart API
  const productId = String(item.productId || `dmart-${index}`);
  const productName = item.name || item.productName || 'Unknown Product';
  const brand = item.brand || '';
  const variant = item.variant || '';
  const skuId = item.skuId ? String(item.skuId) : '';

  // Price handling - DMart uses different field names
  const currentPrice = Number(item.price || item.currentPrice || 0);
  const originalPrice = Number(item.originalPrice || item.mrp || currentPrice);
  const discount = Number(item.discount || item.savings || 0);

  // Calculate discount percentage
  let discountPercentage = Number(item.discountPercentage || 0);
  if (!discountPercentage && originalPrice > 0 && currentPrice < originalPrice) {
    discountPercentage = ((originalPrice - currentPrice) / originalPrice) * 100;
  }

  // Stock status - DMart uses in_stock boolean or availability code
  const isOutOfStock = item.in_stock === false || item.availability === "0";

  return {
    productId,
    productName,
    brand,
    variant,
    skuId,
    productImage: item.image || item.productImage || '',
    productWeight: item.weight || item.productWeight || '',
    currentPrice,
    originalPrice,
    discountPercentage,
    productUrl: item.productLink || item.url || item.productUrl || '',
    isOutOfStock,
    availability: item.availability ? String(item.availability) : '',
    savings: discount,
    rating: Number(item.rating || 0),
    deliveryTime: item.deliveryTime || ''
  };
}

async function scrapePlatform(platform, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount = 0, currentApiKey = null) {
  const MAX_RETRIES = 4;

  let requestBody;

  // Get API URL with current key or get next available key
  const apiKey = currentApiKey || apiKeyManager.getNextKey(platform);
  const apiUrl = `https://api.apify.com/v2/acts/${apiKeyManager.actors[platform]}/run-sync-get-dataset-items?token=${apiKey}`;

  // DMart uses a different request schema
  if (platform === 'dmart') {
    requestBody = {
      startUrls: searchUrls.map(url => ({ url })),
      maxItems: 200,
      pincode: pincode,
      customProxyUrl: process.env.DMART_PROXY_URL
    };
  } else {
    // Standard schema for Zepto, Blinkit, JioMart
    requestBody = {
      searchQueries: [],
      searchUrls: searchUrls,
      pincode: pincode,
      maxProductsPerSearch: platform == "blinkit" ? 80 : 300,
      proxyConfiguration: {
        useApifyProxy: true,
      },
      maxRequestRetries: 3,
      navigationTimeout: 90000,
      headless: true,
      screenshotOnError: true,
      debugMode: false,
      scrollCount: platform === 'blinkit' ? 10 : 10
    };

    if (platform === 'blinkit') {
      requestBody.deliveryLocation = null;
      requestBody.maxConcurrency = 2;
    }
  }

  console.log(`\n🔵 Calling Apify for ${platform} - ${category} - ${pincode} (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
  console.log(`API Actor: ${apiKeyManager.actors[platform]}`);
  console.log(`API Key: ...${apiKey.slice(-8)}`);

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

      // Mark key failure
      apiKeyManager.markKeyFailure(platform, apiKey, new Error(errorText));

      // Log failed attempt to database
      await queueManager.logFailedAttempt({
        platform,
        category,
        pincode,
        apiKey: apiKey.slice(-8),
        error: new Error(errorText),
        statusCode: response.status,
        requestBody
      });

      // Retry with exponential backoff if attempts remain
      if (retryCount < MAX_RETRIES - 1) {
        const delay = queueManager.getRetryDelay(retryCount);
        await queueManager.wait(delay);

        // Get a new API key for retry
        return scrapePlatform(platform, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
      }

      throw new Error(`Apify API failed after ${MAX_RETRIES} attempts: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Apify response for ${platform}:`, JSON.stringify(data).substring(0, 200));

    const items = Array.isArray(data) ? data : (data.items || data.data || data.output || []);
    console.log(`📦 Found ${items.length} items for ${platform}`);

    // If no items and we haven't retried, try again
    if (items.length === 0 && retryCount < MAX_RETRIES - 1) {
      console.log(`⚠️ No items returned. Retrying...`);

      await queueManager.logFailedAttempt({
        platform,
        category,
        pincode,
        apiKey: apiKey.slice(-8),
        error: new Error('No items returned from scraper'),
        statusCode: response.status,
        requestBody
      });

      const delay = queueManager.getRetryDelay(retryCount);
      await queueManager.wait(delay);
      return scrapePlatform(platform, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
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

      let productId, productName, productImage, productWeight, quantity, deliveryTime, isAd, rating, currentPrice, originalPrice, discountPercentage, productUrl;
      let dmartData = null;

      // Use DMart transformation for DMart platform
      if (platform === 'dmart') {
        dmartData = transformDMartData(item, i);
        productId = dmartData.productId;
        productName = cleanProductName(dmartData.productName);
        productImage = dmartData.productImage;
        productWeight = dmartData.productWeight;
        currentPrice = dmartData.currentPrice;
        originalPrice = dmartData.originalPrice;
        discountPercentage = dmartData.discountPercentage;
        productUrl = dmartData.productUrl;
        quantity = '';
        deliveryTime = dmartData.deliveryTime;
        isAd = false;
        rating = dmartData.rating;
      } else {
        // Existing logic for other platforms
        productId = item.productId || item.id || item.productSlug || `${platform}-${i}`;
        const rawProductName = item.productName || item.name || 'Unknown Product';
        productName = cleanProductName(rawProductName);
        productImage = item.productImage || item.image || item.imageUrl;
        productWeight = item.productWeight || item.weight || item.quantity;
        quantity = item.quantity ? String(item.quantity) : '';
        deliveryTime = platform === 'jiomart' ? '10 to 30 min' : (item.deliveryTime || '');
        isAd = item.isAd || item.isSponsored || false;
        currentPrice = Number(item.currentPrice || item.price || item.mrp || 0);
        originalPrice = Number(item.originalPrice || item.mrp || item.price || 0);
        discountPercentage = Number(item.discountPercentage || item.discount || 0);
        rating = Number(item.rating || 0);
        productUrl = item.productUrl || item.url || item.link;
      }

      // Construct Blinkit URL if missing
      if (!productUrl && platform === 'blinkit' && productId) {
        // Create URL slug from product name: lowercase, replace spaces/special chars with hyphens
        const slug = productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
        productUrl = `https://blinkit.com/prn/${slug}/prid/${productId}`;
      }

      const previous = previousProducts.get(productId);

      const priceChange = previous ? currentPrice - previous.currentPrice : 0;
      const discountChange = previous ? discountPercentage - previous.discountPercentage : 0;
      const rankingChange = previous ? ranking - previous.ranking : 0;

      // Check if this exact snapshot already exists (prevent duplicates)
      const existingSnapshot = await ProductSnapshot.findOne({
        scrapedAt,
        category,
        platform,
        pincode,
        productId
      });

      if (existingSnapshot) {
        console.log(`⚠️ Duplicate detected for ${productId} - skipping`);
        savedProducts.push(existingSnapshot);
        continue;
      }

      const snapshot = new ProductSnapshot({
        category,
        pincode,
        platform,
        scrapedAt,
        productId,
        productName,
        productImage,
        productWeight,
        quantity,
        deliveryTime,
        isAd,
        rating,
        currentPrice,
        originalPrice,
        discountPercentage,
        ranking,
        priceChange,
        discountChange,
        rankingChange,
        productUrl,
        isOutOfStock: dmartData ? dmartData.isOutOfStock : false,
        // DMart-specific fields
        ...(platform === 'dmart' && dmartData ? {
          skuId: dmartData.skuId,
          variant: dmartData.variant,
          brand: dmartData.brand,
          availability: dmartData.availability,
          savings: dmartData.savings
        } : {}),
        lastComparedWith: previous?._id
      });

      try {
        await snapshot.save();
        savedProducts.push(snapshot);
      } catch (saveError) {
        console.error(`❌ Failed to save product ${productId}:`, saveError.message);
        if (saveError.errors) {
          Object.keys(saveError.errors).forEach(key => {
            console.error(`   Validation error for ${key}:`, saveError.errors[key].message);
            console.error(`   Value was:`, snapshot[key]);
          });
        }
        // console.log('   Raw Item Data:', JSON.stringify(item).substring(0, 500)); // Log raw data for debugging
      }
    }

    // Mark key as successful
    apiKeyManager.markKeySuccess(platform, apiKey);

    // Mark any existing failed scrape as resolved
    await queueManager.markResolved({
      platform,
      category,
      pincode,
      note: `Successfully scraped ${savedProducts.length} products`
    });

    return {
      productsScraped: items.length,
      productsSaved: savedProducts.length,
      comparedWith: lastSnapshot ? lastSnapshot.scrapedAt : null
    };
  } catch (error) {
    console.error(`❌ Error in scrapePlatform for ${platform}:`, error.message);

    // Mark key failure
    apiKeyManager.markKeyFailure(platform, apiKey, error);

    // Log failed attempt
    await queueManager.logFailedAttempt({
      platform,
      category,
      pincode,
      apiKey: apiKey.slice(-8),
      error,
      statusCode: 0,
      requestBody
    }).catch(err => console.error('Failed to log error:', err));

    // Retry on any error if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES - 1) {
      const delay = queueManager.getRetryDelay(retryCount);
      await queueManager.wait(delay);
      return scrapePlatform(platform, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
    }

    throw error;
  }
}

export async function scrapeCategory(category, pincodes) {
  const APIFY_PROXY_URL = process.env.APIFY_PROXY_URL || '';

  const urls = CATEGORY_URLS[category];
  if (!urls) {
    throw new Error(`Category '${category}' not configured`);
  }

  await dbConnect();

  // Fix the scrapedAt timestamp at the start of the scraping session
  const fixedScrapedAt = new Date();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🕐 Starting PARALLEL scraping for category: ${category}`);
  console.log(`📍 Pincodes: ${pincodes.join(', ')}`);
  console.log(`🕐 Fixed scraping timestamp: ${fixedScrapedAt.toISOString()}`);
  console.log(`${'='.repeat(80)}\n`);

  const results = {
    category,
    pincodes,
    scrapedAt: fixedScrapedAt,
    platforms: {}
  };

  // Scrape ALL platforms in PARALLEL using ALL available keys
  const platformPromises = [];

  // Each platform will process ALL pincodes in batches
  if (urls.zepto && urls.zepto.length > 0) {
    console.log(`\n🚀 Starting Zepto parallel scraping for ${pincodes.length} pincodes...`);
    platformPromises.push(
      scrapePlatformParallel('zepto', pincodes, category, urls.zepto, APIFY_PROXY_URL, fixedScrapedAt)
        .then(results => ({ platform: 'zepto', status: 'fulfilled', results }))
        .catch(error => {
          console.error(`❌ Zepto scraping failed:`, error.message);
          return { platform: 'zepto', status: 'rejected', reason: error };
        })
    );
  }

  if (urls.blinkit && urls.blinkit.length > 0) {
    console.log(`\n🚀 Starting Blinkit parallel scraping for ${pincodes.length} pincodes...`);
    platformPromises.push(
      scrapePlatformParallel('blinkit', pincodes, category, urls.blinkit, APIFY_PROXY_URL, fixedScrapedAt)
        .then(results => ({ platform: 'blinkit', status: 'fulfilled', results }))
        .catch(error => {
          console.error(`❌ Blinkit scraping failed:`, error.message);
          return { platform: 'blinkit', status: 'rejected', reason: error };
        })
    );
  }

  if (urls.jiomart && urls.jiomart.length > 0) {
    console.log(`\n🚀 Starting JioMart parallel scraping for ${pincodes.length} pincodes...`);
    platformPromises.push(
      scrapePlatformParallel('jiomart', pincodes, category, urls.jiomart, APIFY_PROXY_URL, fixedScrapedAt)
        .then(results => ({ platform: 'jiomart', status: 'fulfilled', results }))
        .catch(error => {
          console.error(`❌ JioMart scraping failed:`, error.message);
          return { platform: 'jiomart', status: 'rejected', reason: error };
        })
    );
  }

  if (urls.dmart && urls.dmart.length > 0) {
    console.log(`\n🚀 Starting DMart parallel scraping for ${pincodes.length} pincodes...`);
    platformPromises.push(
      scrapePlatformParallel('dmart', pincodes, category, urls.dmart, APIFY_PROXY_URL, fixedScrapedAt)
        .then(results => ({ platform: 'dmart', status: 'fulfilled', results }))
        .catch(error => {
          console.error(`❌ DMart scraping failed:`, error.message);
          return { platform: 'dmart', status: 'rejected', reason: error };
        })
    );
  }

  if (urls.instamart && urls.instamart.length > 0) {
    console.log(`\n🚀 Starting Instamart parallel scraping for ${pincodes.length} pincodes...`);
    platformPromises.push(
      (async () => {
        const instamartResults = [];
        for (const pincode of pincodes) {
          try {
            const result = await scrapeInstamart(urls.instamart[0], pincode, category, fixedScrapedAt);
            instamartResults.push({
              pincode,
              ...result
            });
          } catch (error) {
            console.error(`❌ Instamart scraping failed for ${pincode}:`, error.message);
            instamartResults.push({
              pincode,
              error: error.message
            });
          }
        }
        return { platform: 'instamart', status: 'fulfilled', results: instamartResults };
      })()
        .catch(error => {
          console.error(`❌ Instamart scraping failed:`, error.message);
          return { platform: 'instamart', status: 'rejected', reason: error };
        })
    );
  }

  // Wait for all platforms to finish scraping all pincodes
  const platformResults = await Promise.allSettled(platformPromises);

  // Process results
  platformResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
      const { platform, results: pincodeResults } = result.value;
      results.platforms[platform] = {};

      pincodeResults.forEach(pr => {
        if (pr && pr.pincode) {
          results.platforms[platform][pr.pincode] = {
            productsScraped: pr.productsScraped || 0,
            productsSaved: pr.productsSaved || 0,
            comparedWith: pr.comparedWith || null
          };
        }
      });

      console.log(`\n✅ ${platform} scraping completed for all pincodes`);
    } else {
      const platform = result.value?.platform || 'unknown';
      console.error(`\n❌ Error scraping ${platform}:`, result.reason || result.value?.reason);
    }
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ PARALLEL scraping completed for category: ${category}`);
  console.log(`   Platforms: ${Object.keys(results.platforms).join(', ')}`);
  console.log(`   Pincodes: ${pincodes.length}`);
  console.log(`${'='.repeat(80)}\n`);

  return results;
}
