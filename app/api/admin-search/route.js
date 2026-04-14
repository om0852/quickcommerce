import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductEAN from '@/models/ProductEAN';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    await dbConnect();

    // ── 1. Try exact Group ID search ─────────────────────────────────────────
    const group = await ProductGrouping.findOne({ groupingId: q }).lean();

    if (group) {
      const productIds = group.products.map(p => p.productId);

      const snapshots = await ProductSnapshot.find(
        { 
          productId: { $in: productIds },
          $or: [
            { platform: { $ne: 'jiomart' } },
            { platform: 'jiomart', isQuick: { $ne: false } }
          ]
        },
        {
          platform: 1, pincode: 1, scrapedAt: 1, isOutOfStock: 1, ranking: 1, productUrl: 1,
          productId: 1, productName: 1, productWeight: 1, currentPrice: 1, originalPrice: 1,
          discountPercentage: 1,
        }
      ).sort({ scrapedAt: -1 }).lean();

      const uniqueSnapshotProductIds = [...new Set(snapshots.map(s => s.productId))];
      const eans = await ProductEAN.find({ productId: { $in: uniqueSnapshotProductIds } }).lean();
      const eanMap = {};
      eans.forEach(e => eanMap[e.productId] = e.eanCode);
      snapshots.forEach(s => s.eanCode = eanMap[s.productId] || '');

      const byPincode = {};
      const seen = new Set();

      for (const snap of snapshots) {
        const key = `${snap.pincode}:${snap.platform}:${snap.productId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!byPincode[snap.pincode]) byPincode[snap.pincode] = {};
        if (!byPincode[snap.pincode][snap.platform]) byPincode[snap.pincode][snap.platform] = [];
        byPincode[snap.pincode][snap.platform].push({
          productId: snap.productId, productName: snap.productName,
          productWeight: snap.productWeight, currentPrice: snap.currentPrice,
          originalPrice: snap.originalPrice, discountPercentage: snap.discountPercentage,
          isOutOfStock: snap.isOutOfStock, ranking: snap.ranking, scrapedAt: snap.scrapedAt,
          eanCode: snap.eanCode || '',
          productUrl: (snap.productUrl && snap.platform.toLowerCase() === 'flipkartminutes' && !snap.productUrl.includes('marketplace=HYPERLOCAL'))
            ? `${snap.productUrl}${snap.productUrl.includes('?') ? '&' : '?'}marketplace=HYPERLOCAL`
            : snap.productUrl,
        });
      }

      return NextResponse.json({
        type: 'group',
        group: {
          groupingId: group.groupingId, name: group.primaryName,
          weight: group.primaryWeight, brand: group.brand,
          totalProducts: group.totalProducts, category: group.category,
          eanCode: group.eanCode || '',
        },
        results: byPincode,
        totalPincodes: Object.keys(byPincode).length,
        totalSnapshots: seen.size,
      });
    }

    // ── 2. Try exact Product ID search ───────────────────────────────────────
    const snapshots = await ProductSnapshot.find(
      { 
        productId: q,
        $or: [
          { platform: { $ne: 'jiomart' } },
          { platform: 'jiomart', isQuick: { $ne: false } }
        ]
      },
      {
        platform: 1, pincode: 1, scrapedAt: 1, isOutOfStock: 1, ranking: 1, category: 1, productUrl: 1,
        productName: 1, productWeight: 1, currentPrice: 1, originalPrice: 1,
      }
    ).sort({ platform: 1, pincode: 1, scrapedAt: -1 }).lean();

    if (snapshots.length > 0) {
      const eans = await ProductEAN.find({ productId: q }).lean();
      const eanMap = {};
      eans.forEach(e => eanMap[e.productId] = e.eanCode);
      snapshots.forEach(s => s.eanCode = eanMap[s.productId] || '');

      const byPlatform = {};
      const seen2 = new Set();

      for (const snap of snapshots) {
        const key = `${snap.platform}:${snap.pincode}`;
        if (seen2.has(key)) continue;
        seen2.add(key);
        if (!byPlatform[snap.platform]) byPlatform[snap.platform] = [];
        byPlatform[snap.platform].push({
          pincode: snap.pincode, productName: snap.productName,
          productWeight: snap.productWeight, currentPrice: snap.currentPrice,
          originalPrice: snap.originalPrice, isOutOfStock: snap.isOutOfStock,
          ranking: snap.ranking, category: snap.category, scrapedAt: snap.scrapedAt,
          eanCode: snap.eanCode || '',
          productUrl: (snap.productUrl && snap.platform.toLowerCase() === 'flipkartminutes' && !snap.productUrl.includes('marketplace=HYPERLOCAL'))
            ? `${snap.productUrl}${snap.productUrl.includes('?') ? '&' : '?'}marketplace=HYPERLOCAL`
            : snap.productUrl,
        });
      }

      return NextResponse.json({
        type: 'product',
        productId: q,
        productName: snapshots[0]?.productName || '',
        results: byPlatform,
        totalPlatforms: Object.keys(byPlatform).length,
        totalSnapshots: seen2.size,
      });
    }

    // ── 3. Fall back: Group Name fuzzy search (case-insensitive regex) ────────
    const matchingGroups = await ProductGrouping.find(
      { primaryName: { $regex: q, $options: 'i' } },
      {
        groupingId: 1, primaryName: 1, primaryWeight: 1,
        brand: 1, category: 1, totalProducts: 1, primaryImage: 1, eanCode: 1,
      }
    ).limit(30).lean();

    if (matchingGroups.length > 0) {
      return NextResponse.json({
        type: 'groups',
        query: q,
        total: matchingGroups.length,
        groups: matchingGroups.map(g => ({
          groupingId: g.groupingId,
          name: g.primaryName,
          weight: g.primaryWeight,
          brand: g.brand,
          category: g.category,
          totalProducts: g.totalProducts,
          image: g.primaryImage,
          eanCode: g.eanCode || '',
        })),
      });
    }

    // Nothing found
    return NextResponse.json({
      type: 'notfound',
      query: q,
      message: 'No group or product found matching this query',
    }, { status: 404 });

  } catch (err) {
    console.error('[admin-search] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
