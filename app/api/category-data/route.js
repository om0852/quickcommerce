import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pincode = searchParams.get('pincode');

    if (!category || !pincode) {
      return NextResponse.json({ 
        error: 'Category and pincode are required' 
      }, { status: 400 });
    }

    await dbConnect();

    // Get the latest scraping timestamp
    const latestSnapshot = await ProductSnapshot.findOne({
      category,
      pincode
    }).sort({ scrapedAt: -1 });

    if (!latestSnapshot) {
      return NextResponse.json({
        success: true,
        category,
        pincode,
        products: [],
        lastUpdated: null,
        message: 'No data available for this category and pincode'
      });
    }
console.log(latestSnapshot)
    const latestScrapedAt = latestSnapshot.scrapedAt;

    // Fetch all products from the latest scraping session for all platforms
    const snapshots = await ProductSnapshot.find({
      category,
      pincode,
    }).sort({ platform: 1, ranking: 1 });

    // Group products by platform
    const productsByPlatform = {
      zepto: [],
      blinkit: [],
      jiomart: []
    };

    snapshots.forEach(snap => {
      if (productsByPlatform[snap.platform]) {
        productsByPlatform[snap.platform].push({
          productId: snap.productId,
          productName: snap.productName,
          productImage: snap.productImage,
          productWeight: snap.productWeight,
          rating: snap.rating,
          currentPrice: snap.currentPrice,
          originalPrice: snap.originalPrice,
          discountPercentage: snap.discountPercentage,
          ranking: snap.ranking,
          priceChange: snap.priceChange,
          discountChange: snap.discountChange,
          rankingChange: snap.rankingChange,
          productUrl: snap.productUrl
        });
      }
    });

    // Match products across platforms using similarity
    const mergedProducts = mergeProductsAcrossPlatforms(
      productsByPlatform.zepto,
      productsByPlatform.blinkit,
      productsByPlatform.jiomart
    );

    return NextResponse.json({
      success: true,
      category,
      pincode,
      lastUpdated: latestScrapedAt,
      products: mergedProducts,
      totalProducts: mergedProducts.length,
      platformCounts: {
        zepto: productsByPlatform.zepto.length,
        blinkit: productsByPlatform.blinkit.length,
        jiomart: productsByPlatform.jiomart.length
      }
    });

  } catch (error) {
    console.error('Category data error:', error);
    return NextResponse.json({
      error: 'Failed to fetch category data',
      message: error.message
    }, { status: 500 });
  }
}

// Product matching helpers (from existing search route)
function normalizeProductName(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(of|and|with|pack|pcs|pieces|kg|g|ml|ltr|litre|litres)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function mergeProductsAcrossPlatforms(zeptoProducts, blinkitProducts, jiomartProducts) {
  const sources = [
    { key: 'zepto', items: zeptoProducts },
    { key: 'blinkit', items: blinkitProducts },
    { key: 'jiomart', items: jiomartProducts }
  ];

  const used = sources.map(() => new Set());
  const merged = [];

  // Helper function to normalize weight for comparison
  const normalizeWeight = (weight) => {
    if (!weight) return '';
    return String(weight).toLowerCase()
      .replace(/\s+/g, '')
      .replace(/pack/g, '')
      .replace(/\(|\)/g, '');
  };

  // Helper function to check if weights are compatible
  const weightsMatch = (weight1, weight2) => {
    if (!weight1 || !weight2) return true; // If either is missing, don't use weight as filter
    const w1 = normalizeWeight(weight1);
    const w2 = normalizeWeight(weight2);
    
    // Extract numbers from weights
    const num1 = w1.match(/\d+/g);
    const num2 = w2.match(/\d+/g);
    
    if (!num1 || !num2) return true;
    
    // Check if they have the same primary number (e.g., both 1L or both 500ml)
    return num1[0] === num2[0];
  };

  // Process each source platform
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
        currentPrice: item.currentPrice,
        originalPrice: item.originalPrice,
        discountPercentage: item.discountPercentage,
        ranking: item.ranking,
        priceChange: item.priceChange,
        discountChange: item.discountChange,
        rankingChange: item.rankingChange,
        url: item.productUrl
      };

      used[s].add(idx);

      // Find matches in other platforms
      for (let t = 0; t < sources.length; t++) {
        if (t === s) continue;
        const other = sources[t];
        let bestIdx = -1;
        let bestScore = 0;

        other.items.forEach((oItem, oIdx) => {
          if (used[t].has(oIdx)) return;
          
          // Check if weights are compatible first
          if (!weightsMatch(item.productWeight, oItem.productWeight)) {
            return;
          }
          
          const score = combinedSimilarity(item.productName, oItem.productName);
          if (score > bestScore) {
            bestScore = score;
            bestIdx = oIdx;
          }
        });

        // Increased threshold to 0.6 for more accurate matching
        if (bestIdx >= 0 && bestScore >= 0.6) {
          const matched = other.items[bestIdx];
          used[t].add(bestIdx);
          group[other.key] = {
            currentPrice: matched.currentPrice,
            originalPrice: matched.originalPrice,
            discountPercentage: matched.discountPercentage,
            ranking: matched.ranking,
            priceChange: matched.priceChange,
            discountChange: matched.discountChange,
            rankingChange: matched.rankingChange,
            url: matched.productUrl
          };
          group.image = group.image || matched.productImage;
          group.weight = group.weight || matched.productWeight;
          group.rating = group.rating || matched.rating;
        }
      }

      merged.push(group);
    });
  }

  // Add leftover items that weren't matched
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
        currentPrice: itm.currentPrice,
        originalPrice: itm.originalPrice,
        discountPercentage: itm.discountPercentage,
        ranking: itm.ranking,
        priceChange: itm.priceChange,
        discountChange: itm.discountChange,
        rankingChange: itm.rankingChange,
        url: itm.productUrl
      };
      merged.push(g);
    });
  });

  return merged;
}
