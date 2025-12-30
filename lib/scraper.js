import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

// Category URL configurations
export const CATEGORY_URLS = {
  milk: {
    blinkit: ['https://blinkit.com/cn/dairy-breakfast/milk/cid/14/922'],
    zepto: ["https://www.zepto.com/cn/dairy-bread-eggs/dairy-bread-eggs/cid/4b938e02-7bde-4479-bc0a-2b54cb6bd5f5/scid/22964a2b-0439-4236-9950-0d71b532b243"],
    jiomart: ["https://www.jiomart.com/c/groceries/dairy-bakery/milk-milk-products/29011"],
    dmart: ["https://www.dmart.in/category/dairy-aesc-dairy?_rsc=5nnz0"]
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
    blinkit: ['https://blinkit.com/s/?q=hair%20care'],
    zepto: ["https://www.zepto.com/uncl/top-deals-on-bestsellers/1aabfb1a-fb76-4e41-a274-944a1eac5ffb"],
    jiomart: ["https://www.jiomart.com/c/groceries/personal-care/hair-care/92"],
    dmart: ["https://www.dmart.in/category/hair-care-208506--1?_rsc=qw1q2"]
  }
};

export const ALL_PINCODES = ['122018', '122017', '122016', '122015', '122011', '201303', '201014', '122008', '122010'];
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

async function scrapePlatform(platform, apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds

  let requestBody;

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
        console.log(`⚠️ Memory/Resource error detected. Retrying in ${RETRY_DELAY / 1000}s...`);
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
      console.log(`⚠️ No items returned. Retrying in ${RETRY_DELAY / 1000}s...`);
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

    return {
      productsScraped: items.length,
      productsSaved: savedProducts.length,
      comparedWith: lastSnapshot ? lastSnapshot.scrapedAt : null
    };
  } catch (error) {
    console.error(`❌ Error in scrapePlatform for ${platform}:`, error.message);

    // Retry on any error if we haven't exceeded max retries
    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️ Retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return scrapePlatform(platform, apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
    }

    throw error;
  }
}

export async function scrapeCategory(category, pincodes) {
  const APIFY_PROXY_URL = process.env.APIFY_PROXY_URL || '';

  // if (!APIFY_TOKEN_1 || !APIFY_TOKEN_2 || !APIFY_TOKEN_3) {
  //   throw new Error('APIFY_TOKENs not configured');
  // }

  const ZEPTO_API_URL = `https://api.apify.com/v2/acts/scrapper-master~zepto-scrapper-om/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;
  const BLINKIT_API_URL = `https://api.apify.com/v2/acts/creatosaurus~blinkit-scrapper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;
  const JIOMART_API_URL = `https://api.apify.com/v2/acts/creatosaurus~jiomart-scrapper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;
  const DMART_API_URL = `https://api.apify.com/v2/acts/creatosaurus~dmart-category-scrapper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;

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

    // Scrape platforms in PARALLEL
    const promises = [];

    // Zepto
    if (urls.zepto && urls.zepto.length > 0) {
      console.log(`\n⏳ Starting Zepto scraping...`);
      promises.push(
        scrapePlatform('zepto', ZEPTO_API_URL, urls.zepto, currentPincode, category, APIFY_PROXY_URL, fixedScrapedAt)
          .then(result => ({ platform: 'zepto', status: 'fulfilled', value: result }))
          .catch(error => {
            console.error(`❌ Zepto scraping failed:`, error.message);
            return { platform: 'zepto', status: 'rejected', reason: error };
          })
      );
    }

    // Blinkit
    if (urls.blinkit && urls.blinkit.length > 0) {
      console.log(`\n⏳ Starting Blinkit scraping...`);
      promises.push(
        scrapePlatform('blinkit', BLINKIT_API_URL, urls.blinkit, currentPincode, category, APIFY_PROXY_URL, fixedScrapedAt)
          .then(result => ({ platform: 'blinkit', status: 'fulfilled', value: result }))
          .catch(error => {
            console.error(`❌ Blinkit scraping failed:`, error.message);
            return { platform: 'blinkit', status: 'rejected', reason: error };
          })
      );
    }

    // JioMart
    if (urls.jiomart && urls.jiomart.length > 0) {
      console.log(`\n⏳ Starting JioMart scraping...`);
      promises.push(
        scrapePlatform('jiomart', JIOMART_API_URL, urls.jiomart, currentPincode, category, APIFY_PROXY_URL, fixedScrapedAt)
          .then(result => ({ platform: 'jiomart', status: 'fulfilled', value: result }))
          .catch(error => {
            console.error(`❌ JioMart scraping failed:`, error.message);
            return { platform: 'jiomart', status: 'rejected', reason: error };
          })
      );
    }

    // DMart
    if (urls.dmart && urls.dmart.length > 0) {
      console.log(`\n⏳ Starting DMart scraping...`);
      promises.push(
        scrapePlatform('dmart', DMART_API_URL, urls.dmart, currentPincode, category, APIFY_PROXY_URL, fixedScrapedAt)
          .then(result => ({ platform: 'dmart', status: 'fulfilled', value: result }))
          .catch(error => {
            console.error(`❌ DMart scraping failed:`, error.message);
            return { platform: 'dmart', status: 'rejected', reason: error };
          })
      );
    }

    const platformResults = await Promise.all(promises);

    // Process results
    platformResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (!results.platforms[result.platform]) {
          results.platforms[result.platform] = {};
        }
        results.platforms[result.platform][currentPincode] = result.value;
        console.log(`✅ ${result.platform} scraping completed`);
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
