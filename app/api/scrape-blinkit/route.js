import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import { CATEGORY_URLS } from '@/lib/scraper';

export async function POST(request) {
  try {
    const body = await request.json();
    const { category, pincodes, scrapedAt } = body;

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const APIFY_TOKEN_2 = process.env.APIFY_TOKEN_2;
    const APIFY_PROXY_URL = process.env.APIFY_PROXY_URL || '';

    if (!APIFY_TOKEN_2) {
      throw new Error('APIFY_TOKEN_2 not configured');
    }

    const BLINKIT_API_URL = `https://api.apify.com/v2/acts/blinkit-scrapper~blinkit-scrapper-om/run-sync-get-dataset-items?token=${APIFY_TOKEN_2}`;
s
    const urls = CATEGORY_URLS[category];
    if (!urls || !urls.blinkit) {
      throw new Error(`Blinkit URLs not configured for category '${category}'`);
    }

    await dbConnect();

    // Use provided timestamp or create new one
    const fixedScrapedAt = scrapedAt ? new Date(scrapedAt) : new Date();
    console.log(`🕐 Using scraping timestamp: ${fixedScrapedAt.toISOString()}`);

    const pincodesToScrape = pincodes || ['122018'];
    const results = {
      category,
      pincodes: pincodesToScrape,
      scrapedAt: fixedScrapedAt,
      blinkit: {}
    };

    // Process each pincode
    for (const currentPincode of pincodesToScrape) {
      console.log(`\n📍 Scraping Blinkit for category '${category}' - pincode ${currentPincode}...`);

      try {
        const result = await scrapeBlinkit(
          BLINKIT_API_URL,
          urls.blinkit,
          currentPincode,
          category,
          APIFY_PROXY_URL,
          fixedScrapedAt
        );
        
        results.blinkit[currentPincode] = result;
        console.log(`✅ Blinkit scraping completed for ${currentPincode}`);
      } catch (error) {
        console.error(`❌ Blinkit scraping failed for ${currentPincode}:`, error.message);
        results.blinkit[currentPincode] = { error: error.message };
      }

      // Wait between pincodes
      if (pincodesToScrape.indexOf(currentPincode) < pincodesToScrape.length - 1) {
        console.log(`⏳ Waiting 5 seconds before next pincode...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Blinkit scraping completed',
      results
    }, { status: 200 });

  } catch (error) {
    console.error('Blinkit scraping error:', error);
    return NextResponse.json({
      error: 'Failed to scrape Blinkit',
      message: error.message
    }, { status: 500 });
  }
}

async function scrapeBlinkit(apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000;

  const requestBody = {
    searchQueries: [],
    searchUrls: searchUrls,
    pincode: pincode,
    maxProductsPerSearch: 100,
    proxyConfiguration: {
      useApifyProxy: false,
      customProxyUrl: proxyUrl,
    },
    deliveryLocation: null,
    maxConcurrency: 2,
    maxRequestRetries: 3,
    navigationTimeout: 90000,
    headless: true,
    screenshotOnError: true,
    debugMode: false,
    scrollCount: 40
  };

  console.log(`\n🔵 Calling Apify for Blinkit - ${category} - ${pincode} (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
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
      console.error(`❌ Apify API error for Blinkit:`, errorText);
      
      const isMemoryError = errorText.includes('memory') || 
                           errorText.includes('ENOMEM') || 
                           errorText.includes('out of memory') ||
                           response.status === 503 ||
                           response.status === 429;
      
      if (isMemoryError && retryCount < MAX_RETRIES) {
        console.log(`⚠️ Memory/Resource error detected. Retrying in ${RETRY_DELAY/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return scrapeBlinkit(apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
      }
      
      throw new Error(`Apify API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Apify response for Blinkit:`, JSON.stringify(data).substring(0, 200));
    
    const items = Array.isArray(data) ? data : (data.items || data.data || data.output || []);
    console.log(`📦 Found ${items.length} items for Blinkit`);

    if (items.length === 0 && retryCount < MAX_RETRIES) {
      console.log(`⚠️ No items returned. Retrying in ${RETRY_DELAY/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return scrapeBlinkit(apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
    }

    // Get last scraping session for comparison
    const lastSnapshot = await ProductSnapshot.findOne({
      category,
      platform: 'blinkit',
      pincode
    }).sort({ scrapedAt: -1 });

    const previousProducts = new Map();
    if (lastSnapshot) {
      const previousSnapshots = await ProductSnapshot.find({
        category,
        platform: 'blinkit',
        pincode,
        scrapedAt: lastSnapshot.scrapedAt
      });

      previousSnapshots.forEach(snap => {
        previousProducts.set(snap.productId, snap);
      });
    }

    // Process and save products
    const savedProducts = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ranking = i + 1;

      const productId = item.productId || item.id || item.productSlug || `blinkit-${i}`;
      const productName = item.productName || item.name || 'Unknown Product';
      const productImage = item.productImage || item.image || item.imageUrl;
      const productWeight = item.productWeight || item.weight || item.quantity;
      const currentPrice = Number(item.currentPrice || item.price || item.mrp || 0);
      const originalPrice = Number(item.originalPrice || item.mrp || item.price || 0);
      const discountPercentage = Number(item.discountPercentage || item.discount || 0);
      
      let productUrl = item.productUrl || item.url || item.link;
      if (!productUrl && productId) {
        const slug = productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        productUrl = `https://blinkit.com/prn/${slug}/prid/${productId}`;
      }

      const previous = previousProducts.get(productId);
      const priceChange = previous ? currentPrice - previous.currentPrice : 0;
      const discountChange = previous ? discountPercentage - previous.discountPercentage : 0;
      const rankingChange = previous ? ranking - previous.ranking : 0;

      // Check for duplicates
      const existingSnapshot = await ProductSnapshot.findOne({
        scrapedAt,
        category,
        platform: 'blinkit',
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
        platform: 'blinkit',
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
    console.error(`❌ Error in scrapeBlinkit:`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️ Retrying in ${RETRY_DELAY/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return scrapeBlinkit(apiUrl, searchUrls, pincode, category, proxyUrl, scrapedAt, retryCount + 1);
    }
    
    throw error;
  }
}
