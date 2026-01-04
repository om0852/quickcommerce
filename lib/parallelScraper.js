import ProductSnapshot from '@/models/ProductSnapshot';
import apiKeyManager from '@/lib/apiKeyManager';
import queueManager from '@/lib/queueManager';

/**
 * Helper function to chunk array into batches
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Transform DMart data to match our schema
 */
function transformDMartData(item, index) {
    const productId = String(item.productId || `dmart-${index}`);
    const productName = item.name || item.productName || 'Unknown Product';
    const brand = item.brand || '';
    const variant = item.variant || '';
    const skuId = item.skuId ? String(item.skuId) : '';

    const currentPrice = Number(item.price || item.currentPrice || 0);
    const originalPrice = Number(item.originalPrice || item.mrp || currentPrice);
    const discount = Number(item.discount || item.savings || 0);

    let discountPercentage = Number(item.discountPercentage || 0);
    if (!discountPercentage && originalPrice > 0 && currentPrice < originalPrice) {
        discountPercentage = ((originalPrice - currentPrice) / originalPrice) * 100;
    }

    const isOutOfStock = item.in_stock === false || item.availability === "0";

    return {
        deliveryTime: item.deliveryTime || '',
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
        rating: Number(item.rating || 0)
    };
}

/**
 * Clean product name for normalization
 */
function cleanProductName(name = '') {
    let normalized = String(name).toLowerCase();

    normalized = normalized.replace(/\([^)]*\)/g, ' ');
    normalized = normalized.replace(/\[[^\]]*\]/g, ' ');
    normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
    normalized = normalized.replace(/\b(tetra\s*pack|tetra|pouch|tub|bottle|carton|box|tin|can|jar|packet|sachet)\b/g, ' ');
    normalized = normalized.replace(/\b(of|and|with|pack|pcs|pc|pieces|piece)\b/g, ' ');
    normalized = normalized.replace(/\b(kg|kgs|g|gm|gms|gram|grams|ml|ltr|litre|litres|liter|liters|l)\b/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
}

/**
 * Scrape a single pincode for a platform using a dedicated API key
 */
async function scrapeSinglePincode(
    platform,
    pincode,
    apiKey,
    keyIndex,
    searchUrls,
    category,
    proxyUrl,
    scrapedAt,
    retryCount = 0
) {
    const MAX_RETRIES = 4;

    const apiUrl = `https://api.apify.com/v2/acts/${apiKeyManager.actors[platform]}/run-sync-get-dataset-items?token=${apiKey}`;

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
        requestBody = {
            searchQueries: [],
            searchUrls: searchUrls,
            pincode: pincode,
            maxProductsPerSearch: platform === "blinkit" ? 80 : 300,
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

    console.log(`\n🔵 [${platform}] ${pincode} - key#${keyIndex} (Attempt ${retryCount + 1}/${MAX_RETRIES})`);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log(`   Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`   ❌ API error:`, errorText.substring(0, 100));

            apiKeyManager.markKeyFailure(platform, apiKey, new Error(errorText));

            await queueManager.logFailedAttempt({
                platform,
                category,
                pincode,
                apiKey: apiKey.slice(-8),
                error: new Error(errorText),
                statusCode: response.status,
                requestBody
            });

            if (retryCount < MAX_RETRIES - 1) {
                const delay = queueManager.getRetryDelay(retryCount);
                await queueManager.wait(delay);
                return scrapeSinglePincode(platform, pincode, apiKey, keyIndex, searchUrls, category, proxyUrl, scrapedAt, retryCount + 1);
            }

            throw new Error(`API failed after ${MAX_RETRIES} attempts: ${response.status}`);
        }

        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.items || data.data || data.output || []);

        console.log(`   📦 Found ${items.length} items`);

        if (items.length === 0 && retryCount < MAX_RETRIES - 1) {
            await queueManager.logFailedAttempt({
                platform,
                category,
                pincode,
                apiKey: apiKey.slice(-8),
                error: new Error('No items returned'),
                statusCode: response.status,
                requestBody
            });

            const delay = queueManager.getRetryDelay(retryCount);
            await queueManager.wait(delay);
            return scrapeSinglePincode(platform, pincode, apiKey, keyIndex, searchUrls, category, proxyUrl, scrapedAt, retryCount + 1);
        }

        // Get previous snapshots for comparison
        const lastSnapshot = await ProductSnapshot.findOne({ category, platform, pincode }).sort({ scrapedAt: -1 });
        const previousProducts = new Map();

        if (lastSnapshot) {
            const previousSnapshots = await ProductSnapshot.find({
                category,
                platform,
                pincode,
                scrapedAt: lastSnapshot.scrapedAt
            });
            previousSnapshots.forEach(snap => previousProducts.set(snap.productId, snap));
        }

        // Process and save products
        const savedProducts = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const ranking = i + 1;

            let productId, productName, productImage, productWeight, quantity, deliveryTime, isAd, rating, currentPrice, originalPrice, discountPercentage, productUrl;
            let dmartData = null;

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

            if (!productUrl && platform === 'blinkit' && productId) {
                const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                productUrl = `https://blinkit.com/prn/${slug}/prid/${productId}`;
            }

            const previous = previousProducts.get(productId);
            const priceChange = previous ? currentPrice - previous.currentPrice : 0;
            const discountChange = previous ? discountPercentage - previous.discountPercentage : 0;
            const rankingChange = previous ? ranking - previous.ranking : 0;

            const existingSnapshot = await ProductSnapshot.findOne({
                scrapedAt,
                category,
                platform,
                pincode,
                productId
            });

            if (existingSnapshot) {
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
                console.error(`   ❌ Save error for ${productId}:`, saveError.message);
            }
        }

        apiKeyManager.markKeySuccess(platform, apiKey);

        await queueManager.markResolved({
            platform,
            category,
            pincode,
            note: `Successfully scraped ${savedProducts.length} products`
        });

        console.log(`   ✅ Saved ${savedProducts.length} products`);

        return {
            pincode,
            productsScraped: items.length,
            productsSaved: savedProducts.length,
            comparedWith: lastSnapshot ? lastSnapshot.scrapedAt : null
        };
    } catch (error) {
        console.error(`   ❌ Error:`, error.message);

        apiKeyManager.markKeyFailure(platform, apiKey, error);

        await queueManager.logFailedAttempt({
            platform,
            category,
            pincode,
            apiKey: apiKey.slice(-8),
            error,
            statusCode: 0,
            requestBody
        }).catch(err => console.error('Failed to log error:', err));

        if (retryCount < MAX_RETRIES - 1) {
            const delay = queueManager.getRetryDelay(retryCount);
            await queueManager.wait(delay);
            return scrapeSinglePincode(platform, pincode, apiKey, keyIndex, searchUrls, category, proxyUrl, scrapedAt, retryCount + 1);
        }

        throw error;
    }
}

/**
 * Scrape a platform for multiple pincodes in parallel using all available keys
 */
export async function scrapePlatformParallel(
    platform,
    pincodes,
    category,
    searchUrls,
    proxyUrl,
    scrapedAt
) {
    const batchSize = apiKeyManager.getBatchSize(platform);
    const batches = chunkArray(pincodes, batchSize);

    console.log(`\n🚀 [${platform}] Scraping ${pincodes.length} pincodes in ${batches.length} batch(es) (${batchSize} at a time)`);

    const allResults = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const assignments = apiKeyManager.assignKeysToPincodes(platform, batch);

        console.log(`\n📦 [${platform}] Batch ${batchIndex + 1}/${batches.length} - Processing ${assignments.length} pincodes in parallel`);

        // Execute all pincodes in this batch in parallel
        const promises = assignments.map(({ pincode, key, keyIndex }) =>
            scrapeSinglePincode(platform, pincode, key, keyIndex, searchUrls, category, proxyUrl, scrapedAt)
                .catch(error => {
                    console.error(`\n❌ [${platform}] ${pincode} failed:`, error.message);
                    return { pincode, error: error.message, success: false };
                })
        );

        const batchResults = await Promise.allSettled(promises);

        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                allResults.push({ pincode: assignments[index].pincode, ...result.value });
            } else {
                allResults.push({ pincode: assignments[index].pincode, error: result.reason, success: false });
            }
        });

        // Wait between batches (but not after the last batch)
        if (batchIndex < batches.length - 1) {
            console.log(`\n⏸️  [${platform}] Waiting 5s before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    const successCount = allResults.filter(r => r.success !== false).length;
    console.log(`\n✅ [${platform}] Completed: ${successCount}/${pincodes.length} pincodes successful`);

    return allResults;
}

export default scrapePlatformParallel;
