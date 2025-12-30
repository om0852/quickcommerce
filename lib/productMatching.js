
// Product matching helpers

function normalizeProductName(name = '') {
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

function getBrand(name = '') {
    if (!name) return '';
    // Simple heuristic: first word is often the brand
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

// Helper function to normalize weight for comparison
const normalizeWeight = (weight) => {
    if (!weight) return '';
    return String(weight).toLowerCase()
        .replace(/\s+/g, '')
        .replace(/pack/g, '')
        .replace(/\(|\)/g, '')
        // Standardize units
        .replace('ltr', 'l')
        .replace('litre', 'l')
        .replace('litres', 'l')
        .replace('gms', 'g')
        .replace('gm', 'g')
        .replace('kgs', 'kg');
};

// Helper function to check if weights are compatible
const weightsMatch = (weight1, weight2) => {
    // RELAXED: If weight is missing in either, assume compatibility to rely on name matching
    if (!weight1 || !weight2) return true;

    // If both exist, we check strictness
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

export function mergeProductsAcrossPlatforms(zeptoProducts = [], blinkitProducts = [], jiomartProducts = [], dmartProducts = []) {
    const sources = [
        { key: 'zepto', items: zeptoProducts },
        { key: 'blinkit', items: blinkitProducts },
        { key: 'jiomart', items: jiomartProducts },
        { key: 'dmart', items: dmartProducts }
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
                url: item.productUrl,
                name: item.productName,
                isOutOfStock: item.isOutOfStock,
                scrapedAt: item.scrapedAt,
                quantity: item.quantity,
                deliveryTime: item.deliveryTime,
                isAd: item.isAd,
                rating: item.rating
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

                    // 1. Check Brand
                    const otherBrand = getBrand(oItem.productName);
                    if (itemBrand && otherBrand && itemBrand !== otherBrand) {
                        if (!itemBrand.startsWith(otherBrand) && !otherBrand.startsWith(itemBrand)) {
                            return;
                        }
                    }

                    // 2. Calculate Similarity Score FIRST
                    const score = combinedSimilarity(item.productName, oItem.productName);

                    // 3. Check Weight
                    const wMatch = weightsMatch(item.productWeight, oItem.productWeight);

                    // Logic: If weights mismatch, ONLY allow if score is very high (strong name match implies same product or acceptable variant)
                    // Threshold 0.8 allows slight differences (like "69 g" vs "230 g" in long names)
                    if (!wMatch && score < 0.8) {
                        return;
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestIdx = oIdx;
                    }
                });

                // Lower threshold slightly to 0.75 to capture more variations
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
                        url: matched.productUrl,
                        name: matched.productName,
                        isOutOfStock: matched.isOutOfStock,
                        scrapedAt: matched.scrapedAt,
                        quantity: matched.quantity,
                        deliveryTime: matched.deliveryTime,
                        isAd: matched.isAd,
                        rating: matched.rating
                    };
                }
            }
            merged.push(group);
        });
    }
    // ... items sort ...
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
                productId: itm.productId,
                currentPrice: itm.currentPrice,
                originalPrice: itm.originalPrice,
                discountPercentage: itm.discountPercentage,
                ranking: itm.ranking,
                priceChange: itm.priceChange,
                discountChange: itm.discountChange,
                rankingChange: itm.rankingChange,
                url: itm.productUrl,
                name: itm.productName,
                isOutOfStock: itm.isOutOfStock,
                scrapedAt: itm.scrapedAt,
                quantity: itm.quantity,
                deliveryTime: itm.deliveryTime,
                isAd: itm.isAd,
                rating: itm.rating
            };
            merged.push(g);
        });
    });

    merged.sort((a, b) => {
        const countA = (a.zepto ? 1 : 0) + (a.blinkit ? 1 : 0) + (a.jiomart ? 1 : 0) + (a.dmart ? 1 : 0);
        const countB = (b.zepto ? 1 : 0) + (b.blinkit ? 1 : 0) + (b.jiomart ? 1 : 0) + (b.dmart ? 1 : 0);
        return countB - countA;
    });

    return merged;
}
