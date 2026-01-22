
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

export function combinedSimilarity(nameA, nameB) {
    const toksA = tokenize(nameA);
    const toksB = tokenize(nameB);
    const j = jaccard(toksA, toksB);
    const lev = normalizedLevenshtein(nameA, nameB);
    return 0.65 * j + 0.35 * lev;
}

// Helper function to normalize weight for comparison
export const normalizeWeight = (weight) => {
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
export const weightsMatch = (weight1, weight2) => {
    // RELAXED: If weight is missing in either, assume compatibility to rely on name matching
    if (!weight1 || !weight2) return true;

    // If both exist, we check strictness
    const w1 = normalizeWeight(weight1);
    const w2 = normalizeWeight(weight2);

    if (w1 === w2) return true;

    const parseWeight = (w) => {
        // Special handle for "NxWeight" format (e.g. 3x100g)
        const multMatch = w.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)([a-z]+)(.*)$/);
        if (multMatch) {
            let count = parseFloat(multMatch[1]);
            let baseVal = parseFloat(multMatch[2]);
            let unit = multMatch[3];
            // multiply
            return { val: count * baseVal, unit };
        }

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

export function mergeProductsAcrossPlatforms(zeptoProducts = [], blinkitProducts = [], jiomartProducts = [], dmartProducts = [], flipkartMinutesProducts = [], instamartProducts = []) {
    const sources = [
        { key: 'zepto', items: zeptoProducts },
        { key: 'blinkit', items: blinkitProducts },
        { key: 'jiomart', items: jiomartProducts },
        { key: 'dmart', items: dmartProducts },
        { key: 'flipkartMinutes', items: flipkartMinutesProducts },
        { key: 'instamart', items: instamartProducts }
    ];

    const mergedMap = new Map(); // groupingId -> groupObject
    const ungroupedItems = [];   // Items without groupingId

    // 1. First Pass: Group by groupingId
    sources.forEach(src => {
        src.items.forEach(item => {
            const itemData = {
                productId: item.productId,
                currentPrice: item.currentPrice,
                originalPrice: item.originalPrice,
                discountPercentage: item.discountPercentage,
                ranking: item.ranking,
                priceChange: item.priceChange,
                discountChange: item.discountChange,
                rankingChange: item.rankingChange,
                productUrl: item.productUrl,
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
                subCategory: item.subCategory,
                categoryUrl: item.categoryUrl,
                combo: item.combo,
                productWeight: item.productWeight,
                groupingId: item.groupingId
            };

            if (item.groupingId) {
                if (!mergedMap.has(item.groupingId)) {
                    mergedMap.set(item.groupingId, {
                        name: item.productName,
                        image: item.productImage,
                        weight: item.productWeight,
                        rating: item.rating,
                        officialCategory: item.officialCategory,
                        officialSubCategory: item.officialSubCategory,
                        subCategory: item.subCategory,
                        groupingId: item.groupingId
                    });
                }
                const group = mergedMap.get(item.groupingId);
                // Add to group under platform key
                group[src.key] = itemData;
            } else {
                // No groupingId? Add to ungrouped list for fuzzy matching fallback
                ungroupedItems.push({ srcKey: src.key, data: itemData });
            }
        });
    });

    // 2. Second Pass: Fuzzy match ungrouped items
    // (We reuse similar logic to previous implementation but only for ungrouped items)
    const usedUngroupedIndices = new Set();
    const fuzzyGroups = [];

    ungroupedItems.forEach((itemWrapper, idx) => {
        if (usedUngroupedIndices.has(idx)) return;

        const item = itemWrapper.data;
        const group = {
            name: item.name,
            image: item.productImage,
            weight: item.productWeight,
            rating: item.rating,
            officialCategory: item.officialCategory,
            officialSubCategory: item.officialSubCategory,
            subCategory: item.subCategory
        };
        group[itemWrapper.srcKey] = item;
        usedUngroupedIndices.add(idx);

        const itemBrand = getBrand(item.name);

        // Try to match with other ungrouped items
        ungroupedItems.forEach((otherWrapper, oIdx) => {
            if (usedUngroupedIndices.has(oIdx)) return;
            if (otherWrapper.srcKey === itemWrapper.srcKey) return; // Same platform, don't group

            const other = otherWrapper.data;

            // Brand Check
            const otherBrand = getBrand(other.name);
            if (itemBrand && otherBrand && itemBrand !== otherBrand) {
                if (!itemBrand.startsWith(otherBrand) && !otherBrand.startsWith(itemBrand)) return;
            }

            // Weight Check
            if (!weightsMatch(item.productWeight, other.productWeight)) return;

            // Similarity Check
            const score = combinedSimilarity(item.name, other.name);
            if (score >= 0.75) {
                // Match!
                group[otherWrapper.srcKey] = other;
                usedUngroupedIndices.add(oIdx);
            }
        });

        fuzzyGroups.push(group);
    });

    // 3. Combine stored groups and fuzzy groups
    const finalMerged = [...mergedMap.values(), ...fuzzyGroups];

    // 4. Sort by availability logic (count of available platforms)
    finalMerged.sort((a, b) => {
        const countA = (a.zepto ? 1 : 0) + (a.blinkit ? 1 : 0) + (a.jiomart ? 1 : 0) + (a.dmart ? 1 : 0) + (a.flipkartMinutes ? 1 : 0) + (a.instamart ? 1 : 0);
        const countB = (b.zepto ? 1 : 0) + (b.blinkit ? 1 : 0) + (b.jiomart ? 1 : 0) + (b.dmart ? 1 : 0) + (b.flipkartMinutes ? 1 : 0) + (b.instamart ? 1 : 0);
        return countB - countA;
    });

    return finalMerged;
}
