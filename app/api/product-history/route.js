import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

// Normalize product name for flexible matching
function normalizeProductName(name = '') {
  let normalized = String(name).toLowerCase();

  // Remove content in parentheses (packaging details like "Tetra Pack", "Pouch", "Tub")
  normalized = normalized.replace(/\([^)]*\)/g, ' ');

  // Remove content in square brackets
  normalized = normalized.replace(/\[[^\]]*\]/g, ' ');

  // Remove special characters but keep spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

  // Remove number-unit combinations (e.g., "1 l", "500 ml", "250 g")
  normalized = normalized.replace(/\b\d+(\.\d+)?\s*(kg|kgs|g|gm|gms|gram|grams|ml|ltr|litre|litres|liter|liters|l)\b/g, ' ');

  // Remove common packaging and filler words (handle both 'pack' and 'pak' spellings)
  normalized = normalized.replace(/\b(tetra\s*pack|tetra\s*pak|tetra|pouch|tub|bottle|carton|box|tin|can|jar|packet|sachet)\b/g, ' ');
  normalized = normalized.replace(/\b(of|and|with|pack|pak|pcs|pc|pieces|piece)\b/g, ' ');

  // Remove any remaining standalone units
  normalized = normalized.replace(/\b(kg|kgs|g|gm|gms|gram|grams|ml|ltr|litre|litres|liter|liters|l)\b/g, ' ');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}


export async function POST(request) {
  try {
    const { pincode, productNames, productIds } = await request.json();

    if (!pincode || (!productNames && !productIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('📊 Product History Request:', { pincode, productIds, productNames });

    await dbConnect();

    // Build query to find snapshots for the specified products
    const criteria = [];

    if (productIds) {
      if (productIds.zepto) criteria.push({ platform: 'zepto', productId: productIds.zepto, pincode });
      if (productIds.blinkit) criteria.push({ platform: 'blinkit', productId: productIds.blinkit, pincode });
      if (productIds.jiomart) criteria.push({ platform: 'jiomart', productId: productIds.jiomart, pincode });
      if (productIds.flipkartMinutes) criteria.push({ platform: 'flipkartMinutes', productId: productIds.flipkartMinutes, pincode });
    }

    // If productNames provided, use them as fallback (with exact match first)
    if (productNames) {
      if (productNames.zepto && !productIds?.zepto) {
        criteria.push({ platform: 'zepto', productName: productNames.zepto, pincode });
      }
      if (productNames.blinkit && !productIds?.blinkit) {
        criteria.push({ platform: 'blinkit', productName: productNames.blinkit, pincode });
      }
      if (productNames.jiomart && !productIds?.jiomart) {
        criteria.push({ platform: 'jiomart', productName: productNames.jiomart, pincode });
      }
      if (productNames.flipkartMinutes && !productIds?.flipkartMinutes) {
        criteria.push({ platform: 'flipkartMinutes', productName: productNames.flipkartMinutes, pincode });
      }
    }

    console.log('🔍 Query criteria:', JSON.stringify(criteria, null, 2));

    if (criteria.length === 0) {
      console.log('⚠️ No criteria built, returning empty history');
      return NextResponse.json({ history: [] });
    }

    // Fetch snapshots sorted by time
    let snapshots = await ProductSnapshot.find({ $or: criteria })
      .sort({ scrapedAt: 1 })
      .select('platform productName productId currentPrice ranking scrapedAt isOutOfStock');

    console.log(`✅ Found ${snapshots.length} snapshots with exact match`);

    // If we didn't find enough data and have productNames, try normalized matching
    // Apply normalized matching for platforms where:
    // 1. No productId was provided, OR
    // 2. ProductId was provided but no exact match was found
    if (productNames) {
      const platformsNeedingNormalizedMatch = [];

      // Check which platforms need normalized matching
      if (productNames.zepto) {
        const hasZeptoData = snapshots.some(s => s.platform === 'zepto');
        if (!hasZeptoData) platformsNeedingNormalizedMatch.push('zepto');
      }
      if (productNames.blinkit) {
        const hasBlinkitData = snapshots.some(s => s.platform === 'blinkit');
        if (!hasBlinkitData) platformsNeedingNormalizedMatch.push('blinkit');
      }
      if (productNames.jiomart) {
        const hasJiomartData = snapshots.some(s => s.platform === 'jiomart');
        if (!hasJiomartData) platformsNeedingNormalizedMatch.push('jiomart');
      }
      if (productNames.flipkartMinutes) {
        const hasFlipkartData = snapshots.some(s => s.platform === 'flipkartMinutes');
        if (!hasFlipkartData) platformsNeedingNormalizedMatch.push('flipkartMinutes');
      }

      if (platformsNeedingNormalizedMatch.length > 0) {
        console.log(`🔄 Trying normalized matching for platforms: ${platformsNeedingNormalizedMatch.join(', ')}`);

        // Fetch all products for this pincode and filter by normalized name
        const allSnapshots = await ProductSnapshot.find({
          pincode,
          platform: { $in: platformsNeedingNormalizedMatch }
        })
          .sort({ scrapedAt: 1 })
          .select('platform productName productId currentPrice ranking scrapedAt isOutOfStock');

        const normalizedNames = {};
        if (productNames.zepto && platformsNeedingNormalizedMatch.includes('zepto')) {
          normalizedNames.zepto = normalizeProductName(productNames.zepto);
        }
        if (productNames.blinkit && platformsNeedingNormalizedMatch.includes('blinkit')) {
          normalizedNames.blinkit = normalizeProductName(productNames.blinkit);
        }
        if (productNames.jiomart && platformsNeedingNormalizedMatch.includes('jiomart')) {
          normalizedNames.jiomart = normalizeProductName(productNames.jiomart);
        }
        if (productNames.flipkartMinutes && platformsNeedingNormalizedMatch.includes('flipkartMinutes')) {
          normalizedNames.flipkartMinutes = normalizeProductName(productNames.flipkartMinutes);
        }

        console.log('🔍 Normalized names for matching:', normalizedNames);

        const normalizedMatches = allSnapshots.filter(snap => {
          const normalizedSnapName = normalizeProductName(snap.productName);

          if (snap.platform === 'zepto' && normalizedNames.zepto) {
            const matches = normalizedSnapName === normalizedNames.zepto;
            if (matches) console.log(`  ✓ Zepto match: "${snap.productName}" → "${normalizedSnapName}"`);
            return matches;
          }
          if (snap.platform === 'blinkit' && normalizedNames.blinkit) {
            const matches = normalizedSnapName === normalizedNames.blinkit;
            if (matches) console.log(`  ✓ Blinkit match: "${snap.productName}" → "${normalizedSnapName}"`);
            return matches;
          }
          if (snap.platform === 'jiomart' && normalizedNames.jiomart) {
            const matches = normalizedSnapName === normalizedNames.jiomart;
            if (matches) console.log(`  ✓ JioMart match: "${snap.productName}" → "${normalizedSnapName}"`);
            return matches;
          }
          if (snap.platform === 'flipkartMinutes' && normalizedNames.flipkartMinutes) {
            const matches = normalizedSnapName === normalizedNames.flipkartMinutes;
            if (matches) console.log(`  ✓ Flipkart match: "${snap.productName}" → "${normalizedSnapName}"`);
            return matches;
          }
          return false;
        });

        // Add normalized matches to existing snapshots
        snapshots = [...snapshots, ...normalizedMatches];

        console.log(`✅ Found ${normalizedMatches.length} additional snapshots with normalized matching`);
      }
    }

    console.log(`✅ Found ${snapshots.length} snapshots with exact match`);

    // Log which platforms have data after exact matching
    const platformsWithData = {
      zepto: snapshots.filter(s => s.platform === 'zepto').length,
      blinkit: snapshots.filter(s => s.platform === 'blinkit').length,
      jiomart: snapshots.filter(s => s.platform === 'jiomart').length,
      flipkartMinutes: snapshots.filter(s => s.platform === 'flipkartMinutes').length
    };
    console.log('📊 Platform data after exact match:', platformsWithData);


    // Group snapshots by timestamp (bucketed to nearest minute to align platforms)
    // This helps in creating a unified timeline
    const historyMap = new Map();

    snapshots.forEach(snap => {
      // Round to nearest minute to group concurrent scrapes
      const date = new Date(snap.scrapedAt);
      date.setSeconds(0, 0);
      const key = date.toISOString();

      if (!historyMap.has(key)) {
        historyMap.set(key, { date: key });
      }

      const entry = historyMap.get(key);

      // Store price and ranking data with proper platform name capitalization
      const platformName = snap.platform === 'jiomart' ? 'JioMart' :
        snap.platform === 'flipkartMinutes' ? 'Flipkart Minutes' :
          snap.platform.charAt(0).toUpperCase() + snap.platform.slice(1);

      entry[platformName] = snap.currentPrice;
      entry[`${platformName} Rank`] = snap.ranking;

      // Store stock availability
      entry[`${snap.platform}Stock`] = snap.isOutOfStock;
    });

    const history = Array.from(historyMap.values()).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    return NextResponse.json({ history });

  } catch (error) {
    console.error('Product history error:', error);
    return NextResponse.json({
      error: 'Failed to fetch product history',
      message: error.message
    }, { status: 500 });
  }
}
