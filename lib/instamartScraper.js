import ProductSnapshot from '@/models/ProductSnapshot';

/**
 * Swiggy Instamart Scraper Module
 * Handles scraping via external Instamart API
 */

/**
 * Clean product name by removing packaging details and normalizing text
 */
function cleanProductName(name = '') {
    let normalized = String(name).toLowerCase();

    // Remove content in parentheses
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

/**
 * Transform Instamart API response to ProductSnapshot format
 * API Response format:
 * {
 *   product_name, details, pricing: {price, "Selling price", "discounted price"},
 *   inventory, image_url, product_url, category, subcategory
 * }
 */
function transformInstamartData(item, index) {
    // Extract product ID from URL or generate one
    let productId = `instamart-${index}`;
    if (item.product_url) {
        const urlParts = item.product_url.split('/');
        productId = urlParts[urlParts.length - 1] || productId;
    }

    const productName = item.product_name || 'Unknown Product';

    // Extract prices from pricing object
    const originalPrice = Number(item.pricing?.price || 0);
    const currentPrice = Number(item.pricing?.['Selling price'] || item.pricing?.price || 0);
    const discountAmount = Number(item.pricing?.['discounted price'] || 0);

    // Calculate discount percentage
    let discountPercentage = 0;
    if (originalPrice > 0 && discountAmount > 0) {
        discountPercentage = (discountAmount / originalPrice) * 100;
    }

    // Check stock status from inventory
    const isOutOfStock = item.inventory === 0 || item.inventory === null;

    return {
        productId,
        productName: cleanProductName(productName),
        productImage: item.image_url || '',
        productWeight: item.details || '',
        quantity: item.details || '',
        deliveryTime: '10 to 30 min', // Default for Instamart
        isAd: false, // Instamart API doesn't provide ad info
        rating: 0, // Instamart API doesn't provide ratings
        currentPrice,
        originalPrice,
        discountPercentage,
        productUrl: item.product_url || '',
        isOutOfStock,
        category: item.category || '',
        subcategory: item.subcategory || ''
    };
}

/**
 * Call external Instamart scraper API
 */
async function callInstamartAPI(categoryUrl, pincode, apiKey) {
    const INSTAMART_API_URL = process.env.INSTAMART_API_URL || 'http://148.113.1.102:6894/qcomData';

    const payload = {
        categoryUrl,
        pincode,
        platform: 'swiggyInstamart',
        apikey: apiKey
    };

    console.log(`🟣 Calling Instamart API for pincode ${pincode}`);
    console.log(`   URL: ${INSTAMART_API_URL}`);

    try {
        const response = await fetch(INSTAMART_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`   Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Instamart API failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Handle response format: { response: [...products] }
        const items = data.response || data.items || data.products || data.data || [];

        if (!Array.isArray(items)) {
            console.warn('   ⚠️ Unexpected response format, no items array found');
            return [];
        }

        console.log(`   ✅ Received ${items.length} products from Instamart`);

        return items;
    } catch (error) {
        console.error(`   ❌ Instamart API error:`, error.message);
        throw error;
    }
}

/**
 * Save Instamart products to database
 */
async function saveInstamartProducts(items, category, pincode, scrapedAt) {
    console.log(`💾 Saving ${items.length} Instamart products to database...`);

    // Get last scraping session for comparison
    const lastSnapshot = await ProductSnapshot.findOne({
        category,
        platform: 'instamart',
        pincode
    }).sort({ scrapedAt: -1 });

    const previousProducts = new Map();
    if (lastSnapshot) {
        const previousSnapshots = await ProductSnapshot.find({
            category,
            platform: 'instamart',
            pincode,
            scrapedAt: lastSnapshot.scrapedAt
        });

        previousSnapshots.forEach(snap => {
            previousProducts.set(snap.productId, snap);
        });
    }

    const savedProducts = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const ranking = i + 1;

        const transformedData = transformInstamartData(item, i);
        const previous = previousProducts.get(transformedData.productId);

        const priceChange = previous ? transformedData.currentPrice - previous.currentPrice : 0;
        const discountChange = previous ? transformedData.discountPercentage - previous.discountPercentage : 0;
        const rankingChange = previous ? ranking - previous.ranking : 0;

        // Check for duplicates
        const existingSnapshot = await ProductSnapshot.findOne({
            scrapedAt,
            category,
            platform: 'instamart',
            pincode,
            productId: transformedData.productId
        });

        if (existingSnapshot) {
            console.log(`   ⚠️ Duplicate detected for ${transformedData.productId} - skipping`);
            savedProducts.push(existingSnapshot);
            continue;
        }

        const snapshot = new ProductSnapshot({
            category,
            pincode,
            platform: 'instamart',
            scrapedAt,
            productId: transformedData.productId,
            productName: transformedData.productName,
            productImage: transformedData.productImage,
            productWeight: transformedData.productWeight,
            quantity: transformedData.quantity,
            deliveryTime: transformedData.deliveryTime,
            isAd: transformedData.isAd,
            rating: transformedData.rating,
            currentPrice: transformedData.currentPrice,
            originalPrice: transformedData.originalPrice,
            discountPercentage: transformedData.discountPercentage,
            ranking,
            priceChange,
            discountChange,
            rankingChange,
            productUrl: transformedData.productUrl,
            isOutOfStock: transformedData.isOutOfStock,
            lastComparedWith: previous?._id
        });

        try {
            await snapshot.save();
            savedProducts.push(snapshot);
        } catch (saveError) {
            console.error(`   ❌ Failed to save product ${transformedData.productId}:`, saveError.message);
        }
    }

    console.log(`   ✅ Saved ${savedProducts.length}/${items.length} Instamart products`);

    return {
        productsScraped: items.length,
        productsSaved: savedProducts.length,
        comparedWith: lastSnapshot ? lastSnapshot.scrapedAt : null
    };
}

/**
 * Main scraping function for Instamart
 */
export async function scrapeInstamart(categoryUrl, pincode, category, scrapedAt) {
    const INSTAMART_API_KEY = process.env.INSTAMART_API_KEY;

    if (!INSTAMART_API_KEY) {
        throw new Error('INSTAMART_API_KEY not configured in environment variables');
    }

    console.log(`\n🟣 Starting Instamart scraping for ${category} - ${pincode}`);

    try {
        // Call external Instamart API
        const items = await callInstamartAPI(categoryUrl, pincode, INSTAMART_API_KEY);

        // Save products to database
        const result = await saveInstamartProducts(items, category, pincode, scrapedAt);

        console.log(`✅ Instamart scraping completed for ${category} - ${pincode}`);
        console.log(`   Products: ${result.productsSaved}/${result.productsScraped} saved`);

        return result;
    } catch (error) {
        console.error(`❌ Instamart scraping failed for ${category} - ${pincode}:`, error.message);
        throw error;
    }
}

export { cleanProductName, transformInstamartData, callInstamartAPI, saveInstamartProducts };
