// -- Matching & dedupe helpers --
function normalizeProductName(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // remove punctuation but keep spaces
    .replace(/\b(of|and|with|pack|pcs|pieces|kg|g|ml|ltr|litre|litres)\b/g, ' ') // remove common stopwords/units
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
  return 1 - dist / maxLen; // 1 = identical, 0 = very different
}

function combinedSimilarity(nameA, nameB) {
  const toksA = tokenize(nameA);
  const toksB = tokenize(nameB);
  const j = jaccard(toksA, toksB);
  const lev = normalizedLevenshtein(nameA, nameB);
  // weighted combination: token overlap is stronger
  return 0.65 * j + 0.35 * lev;
}

function dedupeProducts(items, keyName = 'productName') {
  const map = new Map();
  items.forEach(item => {
    const name = normalizeProductName(item[keyName] || item.name || '');
    const price = Number(item.currentPrice ?? item.price ?? 0) || 0;
    const key = name;
    if (!map.has(key)) {
      map.set(key, { item, price });
    } else {
      const existing = map.get(key);
      // prefer lower price or more fields present
      const existingPrice = existing.price || 0;
      if (price && existingPrice && price < existingPrice) {
        map.set(key, { item, price });
      } else if (!existingPrice && price) {
        map.set(key, { item, price });
      } else {
        // keep whichever has more populated fields
        const existingCount = Object.values(existing.item).filter(v => v != null).length;
        const newCount = Object.values(item).filter(v => v != null).length;
        if (newCount > existingCount) map.set(key, { item, price });
      }
    }
  });
  return Array.from(map.values()).map(v => v.item);
}

// Group products across three platforms (Zepto, Blinkit, JioMart)
function groupProductsThree(zeptoProducts = [], blinkitProducts = [], jiomartProducts = []) {
  const A = dedupeProducts(zeptoProducts, 'productName');
  const B = dedupeProducts(blinkitProducts, 'productName');
  const C = dedupeProducts(jiomartProducts, 'productName');

  const getProductUrl = (platform, item) => {
    // Always prefer the actual productUrl from the scraper if available
    if (item.productUrl) return item.productUrl;
    if (item.url) return item.url;
    
    // Construct URL if we have productId
    if (item.productId) {
      if (platform === 'jiomart') {
        return `https://www.jiomart.com/p/${item.productId}`;
      }
      if (platform === 'blinkit') {
        // Convert product name to URL slug: lowercase, replace spaces/special chars with hyphens
        const productName = item.productName || item.name || 'product';
        const slug = productName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
        return `https://blinkit.com/prn/${slug}/prid/${item.productId}`;
      }
    }
    return null;
  };

  const sources = [
    { key: 'zepto', items: A },
    { key: 'jiomart', items: C },
    { key: 'blinkit', items: B }
  ];

  // used sets per source
  const used = sources.map(() => new Set());
  const grouped = [];

  // iterate sources in order and try to match items from other sources
  for (let s = 0; s < sources.length; s++) {
    const src = sources[s];
    src.items.forEach((item, idx) => {
      if (used[s].has(idx)) return; // already consumed

      const baseName = item.productName || item.name || '';
      const group = { name: baseName, image: item.productImage || item.image || null, weight: item.productWeight || null, rating: item.rating || null };

      // attach the base platform data
      group[src.key] = {
        currentPrice: item.currentPrice ?? item.price ?? null,
        originalPrice: item.originalPrice ?? null,
        discountPercentage: item.discountPercentage ?? null,
        url: getProductUrl(src.key, item)
      };

      used[s].add(idx);

      // for every other source, find best match
      for (let t = 0; t < sources.length; t++) {
        if (t === s) continue;
        const other = sources[t];
        let bestIdx = -1;
        let bestScore = 0;
        other.items.forEach((oItem, oIdx) => {
          if (used[t].has(oIdx)) return;
          const score = combinedSimilarity(baseName, oItem.productName || oItem.name || '');
          if (score > bestScore) {
            bestScore = score;
            bestIdx = oIdx;
          }
        });

        if (bestIdx >= 0 && bestScore >= 0.45) {
          const matched = other.items[bestIdx];
          used[t].add(bestIdx);
          group[other.key] = {
            currentPrice: matched.currentPrice ?? matched.price ?? null,
            originalPrice: matched.originalPrice ?? null,
            discountPercentage: matched.discountPercentage ?? null,
            url: getProductUrl(other.key, matched)
          };
          // prefer image/weight/rating from matched if missing
          group.image = group.image || matched.productImage || matched.image || null;
          group.weight = group.weight || matched.productWeight || null;
          group.rating = group.rating || matched.rating || null;
          group.similarityScore = Math.max(group.similarityScore || 0, bestScore);
        }
      }

      grouped.push(group);
    });
  }

  // Add any leftover items not yet used (safety - should be none)
  sources.forEach((src, sIdx) => {
    src.items.forEach((itm, idx) => {
      if (used[sIdx].has(idx)) return;
      const g = { name: itm.productName || itm.name, image: itm.productImage || itm.image || null, weight: itm.productWeight || null, rating: itm.rating || null };
      g[src.key] = { currentPrice: itm.currentPrice ?? itm.price ?? null, url: getProductUrl(src.key, itm) };
      grouped.push(g);
    });
  });

  return grouped;
}

// Backwards-compatible wrapper for two-source calls
function groupProducts(a, b) {
  return groupProductsThree(a, b, []);
}

import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const pincodeFromRequest = searchParams.get('pincode');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    // Apify run-sync endpoints (provided by the user)
    // Read sensitive values from environment variables
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    const APIFY_PROXY_URL = process.env.APIFY_PROXY_URL || '';
    const DEFAULT_PINCODE = process.env.DEFAULT_PINCODE || '411001';

    const ZEPTO_API_URL = `https://api.apify.com/v2/acts/creatosaurus~zepto-scrapper-om/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
    const BLINKIT_API_URL = `https://api.apify.com/v2/acts/creatosaurus~blinkit-scrapper-om/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
    const JIOMART_API_URL = `https://api.apify.com/v2/acts/creatosaurus~jiomart-scrapper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

    // Build request bodies using the provided formats. Frontend passes a single query string;
    // the actors expect `searchQueries` as an array.
    const pincodeToUse = pincodeFromRequest || DEFAULT_PINCODE;

    const zeptoBody = {
      searchQueries: [String(query)],
      searchUrls: [],
      pincode: pincodeToUse,
      maxProductsPerSearch: 50,
      proxyConfiguration: {
        useApifyProxy: false,
        customProxyUrl: APIFY_PROXY_URL
      },
      maxRequestRetries: 3,
      navigationTimeout: 90000,
      headless: true,
      screenshotOnError: true,
      debugMode: true,
      scrollCount: 5
    };

    const blinkitBody = {
      searchQueries: [String(query)],
      searchUrls: [],
      pincode: pincodeToUse,
      deliveryLocation: null,
      maxProductsPerSearch: 50,
      proxyConfiguration: {
        useApifyProxy: false,
        customProxyUrl: APIFY_PROXY_URL
      },
      maxRequestRetries: 3,
      maxConcurrency: 2,
      navigationTimeout: 90000,
      headless: true,
      screenshotOnError: true,
      debugMode: true,
      scrollCount: 8
    };

    const jiomartBody = {
      searchQueries: [String(query)],
      searchUrls: [],
      pincode: pincodeToUse,
      maxProductsPerSearch: 50,
      proxyConfiguration: {
        useApifyProxy: false,
        customProxyUrl: APIFY_PROXY_URL
      },
      maxRequestRetries: 3,
      navigationTimeout: 90000,
      headless: true,
      screenshotOnError: true,
      debugMode: true,
      scrollCount: 5
    };

    // POST to Apify run-sync endpoints in parallel (Zepto, Blinkit, JioMart)
    const [zeptoResponse, blinkitResponse, jiomartResponse] = await Promise.all([
      fetch(ZEPTO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zeptoBody)
      }),
      fetch(BLINKIT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blinkitBody)
      }),
      fetch(JIOMART_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jiomartBody)
      })
    ]);

    const zeptoData = await zeptoResponse.json();
    const blinkitData = await blinkitResponse.json();
    const jiomartDataRaw = await jiomartResponse.json();

    // Apify responses may wrap items in different keys; coerce to arrays
    const zeptoItems = Array.isArray(zeptoData)
      ? zeptoData
      : (zeptoData.items || zeptoData.data || zeptoData.output || []);

    const blinkitItems = Array.isArray(blinkitData)
      ? blinkitData
      : (blinkitData.items || blinkitData.data || blinkitData.output || []);

    // coerce jiomartData similar to others
    const jiomartData = Array.isArray(jiomartDataRaw)
      ? jiomartDataRaw
      : (jiomartDataRaw.items || jiomartDataRaw.data || jiomartDataRaw.output || []);

    // Group and merge products across three sources
    const groupedProducts = groupProductsThree(zeptoItems, blinkitItems, jiomartData);

    return NextResponse.json({
      success: true,
      products: groupedProducts,
      totalProducts: groupedProducts.length
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch products',
      message: error.message
    }, { status: 500 });
  }
}