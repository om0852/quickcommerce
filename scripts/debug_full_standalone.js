const mongoose = require('mongoose');

// --- INLINED LOGIC START ---
// Product matching helpers

function normalizeProductName(name = '') {
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

function getBrand(name = '') {
    if (!name) return '';
    return name.trim().split(' ')[0].toLowerCase();
}

function tokenize(name) {
    return normalizeProductName(name).split(' ').filter(Boolean).filter(t => t.length > 1);
}

function jaccard(a, b) {
    const A = new Set(a);
    const B = new Set(b);
    const inter = new Set([...A].filter(x => B.has(x)));
    const union = new Set([...A, ...B]);
    if (union.size === 0) return 0;
    return inter.size / union.size;
}

function levenshtein(a, b) {
    const A = String(a || '');
    const B = String(b || '');
    const m = A.length, n = B.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = A[i - 1] === B[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

function normalizedLevenshtein(a, b) {
    const A = normalizeProductName(a);
    const B = normalizeProductName(b);
    if (!A && !B) return 1;
    const dist = levenshtein(A, B);
    const maxLen = Math.max(A.length, B.length);
    if (maxLen === 0) return 1;
    return 1 - dist / maxLen;
}

function combinedSimilarity(nameA, nameB) {
    const toksA = tokenize(nameA);
    const toksB = tokenize(nameB);
    const j = jaccard(toksA, toksB);
    const lev = normalizedLevenshtein(nameA, nameB);
    return 0.65 * j + 0.35 * lev;
}

const normalizeWeight = (weight) => {
    if (!weight) return '';
    return String(weight).toLowerCase()
        .replace(/\s+/g, '')
        .replace(/pack/g, '')
        .replace(/\(|\)/g, '')
        .replace('ltr', 'l')
        .replace('litre', 'l')
        .replace('litres', 'l')
        .replace('gms', 'g')
        .replace('gm', 'g')
        .replace('kgs', 'kg');
};

const weightsMatch = (weight1, weight2) => {
    if (!weight1 || !weight2) return true;
    const w1 = normalizeWeight(weight1);
    const w2 = normalizeWeight(weight2);
    if (w1 === w2) return true;
    const parseWeight = (w) => {
        const match = w.match(/(\d+(?:\.\d+)?)([a-z]+)/);
        if (match) return { val: parseFloat(match[1]), unit: match[2] };
        return null;
    };
    const p1 = parseWeight(w1);
    const p2 = parseWeight(w2);
    if (p1 && p2) {
        if (p1.unit === p2.unit) return p1.val === p2.val;
        if (p1.unit === 'kg' && p2.unit === 'g') return p1.val * 1000 === p2.val;
        if (p1.unit === 'g' && p2.unit === 'kg') return p1.val === p2.val * 1000;
        if (p1.unit === 'l' && p2.unit === 'ml') return p1.val * 1000 === p2.val;
        if (p1.unit === 'ml' && p2.unit === 'l') return p1.val === p2.val * 1000;
    }
    return false;
};

// THIS IS THE FIXED FUNCTION
function mergeProductsAcrossPlatforms(zeptoProducts = [], blinkitProducts = [], jiomartProducts = [], dmartProducts = [], flipkartMinutesProducts = [], instamartProducts = []) {
    const sources = [
        { key: 'zepto', items: zeptoProducts },
        { key: 'blinkit', items: blinkitProducts },
        { key: 'jiomart', items: jiomartProducts },
        { key: 'dmart', items: dmartProducts },
        { key: 'flipkartMinutes', items: flipkartMinutesProducts },
        { key: 'instamart', items: instamartProducts }
    ];

    const used = sources.map(() => new Set());
    const merged = [];

    for (let s = 0; s < sources.length; s++) {
        const src = sources[s];
        src.items.forEach((item, idx) => {
            if (used[s].has(idx)) return;

            const group = {
                name: item.productName,
                image: item.productImage,
                weight: item.productWeight,
                rating: item.rating
            };

            group[src.key] = {
                productId: item.productId,
                currentPrice: item.currentPrice,
                originalPrice: item.originalPrice,
                discountPercentage: item.discountPercentage,
                ranking: item.ranking,
                priceChange: item.priceChange,
                discountChange: item.discountChange,
                rankingChange: item.rankingChange,
                productUrl: item.productUrl, // FIXED HERE
                name: item.productName,
                isOutOfStock: item.isOutOfStock,
                scrapedAt: item.scrapedAt,
                quantity: item.quantity,
                deliveryTime: item.deliveryTime,
                isAd: item.isAd,
                rating: item.rating,
                productImage: item.productImage,
                officialCategory: item.officialCategory,
                officialSubCategory: item.officialSubCategory,
                categoryUrl: item.categoryUrl,
                combo: item.combo
            };

            used[s].add(idx);
            const itemBrand = getBrand(item.productName);

            for (let t = 0; t < sources.length; t++) {
                if (t === s) continue;
                const other = sources[t];
                let bestIdx = -1;
                let bestScore = 0;

                other.items.forEach((oItem, oIdx) => {
                    if (used[t].has(oIdx)) return;
                    const otherBrand = getBrand(oItem.productName);
                    if (itemBrand && otherBrand && itemBrand !== otherBrand) {
                        if (!itemBrand.startsWith(otherBrand) && !otherBrand.startsWith(itemBrand)) {
                            return;
                        }
                    }
                    const score = combinedSimilarity(item.productName, oItem.productName);
                    const wMatch = weightsMatch(item.productWeight, oItem.productWeight);
                    if (!wMatch && score < 0.8) {
                        return;
                    }
                    if (score > bestScore) {
                        bestScore = score;
                        bestIdx = oIdx;
                    }
                });

                if (bestIdx >= 0 && bestScore >= 0.75) {
                    const matched = other.items[bestIdx];
                    used[t].add(bestIdx);
                    group[other.key] = {
                        productId: matched.productId,
                        currentPrice: matched.currentPrice,
                        originalPrice: matched.originalPrice,
                        discountPercentage: matched.discountPercentage,
                        ranking: matched.ranking,
                        priceChange: matched.priceChange,
                        discountChange: matched.discountChange,
                        rankingChange: matched.rankingChange,
                        productUrl: matched.productUrl, // FIXED HERE
                        name: matched.productName,
                        isOutOfStock: matched.isOutOfStock,
                        scrapedAt: matched.scrapedAt,
                        quantity: matched.quantity,
                        deliveryTime: matched.deliveryTime,
                        isAd: matched.isAd,
                        rating: matched.rating,
                        productImage: matched.productImage,
                        officialCategory: matched.officialCategory,
                        officialSubCategory: matched.officialSubCategory,
                        categoryUrl: matched.categoryUrl,
                        combo: matched.combo
                    };
                }
            }
            merged.push(group);
        });
    }

    // Remaining... (simplified for this script as main logic is above)
    // Actually need to include remaining to capture all cases
    sources.forEach((src, sIdx) => {
        src.items.forEach((itm, idx) => {
            if (used[sIdx].has(idx)) return;
            const g = {
                name: itm.productName,
                image: itm.productImage,
                weight: itm.productWeight,
                rating: itm.rating
            };
            g[src.key] = {
                // ... same fields ...
                productUrl: itm.productUrl, // FIXED HERE
                productId: itm.productId,
                currentPrice: itm.currentPrice,
                originalPrice: itm.originalPrice,
                discountPercentage: itm.discountPercentage,
                ranking: itm.ranking,
                priceChange: itm.priceChange,
                discountChange: itm.discountChange,
                rankingChange: itm.rankingChange,
                name: itm.productName,
                isOutOfStock: itm.isOutOfStock,
                scrapedAt: itm.scrapedAt,
                quantity: itm.quantity,
                deliveryTime: itm.deliveryTime,
                isAd: itm.isAd,
                rating: itm.rating,
                productImage: itm.productImage,
                officialCategory: itm.officialCategory,
                officialSubCategory: itm.officialSubCategory,
                categoryUrl: itm.categoryUrl,
                combo: itm.combo
            };
            merged.push(g);
        });
    });

    return merged;
}

// --- LOGIC END ---

// Load env vars
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
    require('dotenv').config({ path: '.env' });
}

async function run() {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const ProductSnapshotSchema = new mongoose.Schema({}, { strict: false });
        const ProductSnapshot = mongoose.model('ProductSnapshot', ProductSnapshotSchema, 'productsnapshots');

        console.log('Searching for productId: 95422');
        const snapshots = await ProductSnapshot.find({ productId: "95422" }).sort({ scrapedAt: -1 }).limit(1);

        if (snapshots.length === 0) {
            console.log('No snapshots found. Try looking for 7UP...');
            const p = await ProductSnapshot.findOne({ productName: /7UP/ }).sort({ scrapedAt: -1 });
            if (p) snapshots.push(p);
        }

        if (snapshots.length === 0) {
            console.log('Product not found in DB.');
            process.exit(0);
        }

        const snap = snapshots[0];
        console.log(`Found Product: ${snap.productName}`);
        console.log(`DB productUrl: ${snap.productUrl}`);
        console.log(`DB isAd: ${snap.isAd}`);
        console.log(`DB isOutOfStock: ${snap.isOutOfStock}`);

        // Prepare item for merger
        const item = snap.toObject(); // Use raw object
        // NOTE: route.js explicitly extracts fields, but let's assume it passes mostly everything or at least what we care about.
        // Actually route.js DOES explicit extraction. Let's replicate that EXACTLY to be sure.

        const exactItem = {
            productId: snap.productId,
            productName: snap.productName,
            productImage: snap.productImage,
            productWeight: snap.productWeight,
            rating: snap.rating,
            currentPrice: snap.currentPrice,
            originalPrice: snap.originalPrice,
            discountPercentage: snap.discountPercentage,
            ranking: snap.ranking,
            isOutOfStock: snap.isOutOfStock,
            productUrl: snap.productUrl, // KEY FIELD
            quantity: snap.quantity,
            deliveryTime: snap.deliveryTime,
            isAd: snap.isAd,
            officialCategory: snap.officialCategory,
            officialSubCategory: snap.officialSubCategory,
            combo: snap.combo,
            scrapedAt: snap.scrapedAt
        };

        console.log('Running merger...');
        const merged = mergeProductsAcrossPlatforms([], [exactItem], [], [], [], []);
        const final = merged[0];

        console.log('Merged output for Blinkit:', final.blinkit);

        if (final.blinkit.productUrl) {
            console.log('✅ TEST PASSED: productUrl is present');
        } else {
            console.log('❌ TEST FAILED: productUrl is missing');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

run();
