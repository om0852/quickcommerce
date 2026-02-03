import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pincode = searchParams.get('pincode');

    // 1. Get the requested Time Travel timestamp
    const requestedTimestamp = searchParams.get('timestamp');

    if (!category || !pincode) {
      return NextResponse.json({
        error: 'Category and pincode are required'
      }, { status: 400 });
    }

    await dbConnect();

    let targetScrapedAt;

    // 2. DECIDE WHICH TIMESTAMP TO USE (SLOT SELECTION)
    if (requestedTimestamp) {
      // TIME TRAVEL MODE
      const searchDate = new Date(requestedTimestamp);

      // Verify this timestamp actually exists for this category/pincode
      const exactBatch = await ProductSnapshot.findOne({
        pincode,
        scrapedAt: searchDate,
        $or: [
          { category: category },
        ]
      }).select('scrapedAt');

      if (!exactBatch) {
        return NextResponse.json({
          success: true,
          products: [],
          message: 'No data found for this exact time slot.'
        });
      }

      targetScrapedAt = exactBatch.scrapedAt;
      console.log(`🕒 Time Travel: Locked onto slot ${targetScrapedAt.toISOString()}`);

    } else {
      // LIVE MODE: Find the absolute latest scraping timestamp
      const latestSnapshot = await ProductSnapshot.findOne({
        pincode,
        $or: [
          { category: category },
          { officialCategory: category }
        ]
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
      targetScrapedAt = latestSnapshot.scrapedAt;
      console.log(`🔴 Live Mode: Fetching latest snapshot for ${targetScrapedAt.toISOString()}`);
    }

    // 3. FETCH GROUPED DATA
    // First, try to fetch from ProductGrouping
    const groups = await ProductGrouping.find({
      category: category
    });

    // We need to fetch snapshots for the specific timestamp
    // Get all product IDs from the groups
    const productIdsInGroups = [];
    groups.forEach(group => {
      group.products.forEach(p => {
        productIdsInGroups.push(p.productId);
      });
    });

    // Fetch snapshots for these products at the target timestamp
    const snapshots = await ProductSnapshot.find({
      pincode,
      scrapedAt: targetScrapedAt,
      $or: [
        { category: category },
      ]
    });

    // Create a map of snapshots for easy lookup: platform:productId -> snapshot
    const snapshotMap = {};
    snapshots.forEach(snap => {
      const key = `${snap.platform}:${snap.productId}`;
      snapshotMap[key] = snap;
    });

    const mergedProducts = [];
    const usedSnapshotIds = new Set();

    // Process Groups
    groups.forEach(group => {
      const productObj = {
        groupingId: group.groupingId,
        name: group.primaryName, // Use primary name from group
        image: group.primaryImage,
        weight: group.primaryWeight,
        // Initialize platform buckets
        zepto: null,
        blinkit: null,
        jiomart: null,
        dmart: null,
        flipkartMinutes: null,
        instamart: null,
        // Default fields to be populated from the "best" snapshot if needed
        officialCategory: group.category,
        officialSubCategory: null,
        scrapedAt: targetScrapedAt,
        isGrouped: true
      };

      let hasData = false;

      group.products.forEach(p => {
        const key = `${p.platform}:${p.productId}`;
        const snap = snapshotMap[key];

        if (snap) {
          usedSnapshotIds.add(snap._id.toString());
          hasData = true;

          // Populate platform specific data
          productObj[p.platform] = {
            productId: snap.productId,
            productName: snap.productName, // Keep original name per platform
            productImage: snap.productImage,
            productWeight: snap.productWeight,
            rating: snap.rating,
            currentPrice: snap.currentPrice,
            originalPrice: snap.originalPrice,
            discountPercentage: snap.discountPercentage,
            ranking: snap.ranking,
            isOutOfStock: snap.isOutOfStock,
            productUrl: snap.productUrl,
            quantity: snap.quantity,
            deliveryTime: snap.deliveryTime,
            isAd: snap.isAd,
            officialCategory: snap.officialCategory,
            officialSubCategory: snap.officialSubCategory,
            subCategory: snap.subCategory,
            combo: snap.combo,
            new: snap.new,
            scrapedAt: snap.scrapedAt,
            snapshotId: snap._id.toString() // Expose unique ID for updates
          };

          // If main name/image is missing (should stick to group defaults, but fallback just in case)
          if (!productObj.name) productObj.name = snap.productName;
          if (!productObj.image) productObj.image = snap.productImage;
          if (!productObj.officialSubCategory) productObj.officialSubCategory = snap.officialSubCategory;
        }
      });

      if (hasData) {
        mergedProducts.push(productObj);
      }
    });

    // 4. Handle Ungrouped Products
    // USER REQUEST: Show ONLY grouped products. Commenting out ungrouped logic.
    /*
    snapshots.forEach(snap => {
      if (!usedSnapshotIds.has(snap._id.toString())) {
        // ... (logic moved to comments) ...
         const existingProduct = mergedProducts.find(p => p.name.trim().toLowerCase() === snap.productName.trim().toLowerCase());
         // ...
         // (Omitted for brevity in comment block)
         // ...
         // See previous version for full logic if restoration needed.
      }
    });
    */

    // Calculate counts
    const counts = {
      zepto: 0,
      blinkit: 0,
      jiomart: 0,
      dmart: 0,
      flipkartMinutes: 0,
      instamart: 0
    };

    mergedProducts.forEach(p => {
      if (p.zepto) counts.zepto++;
      if (p.blinkit) counts.blinkit++;
      if (p.jiomart) counts.jiomart++;
      if (p.dmart) counts.dmart++;
      if (p.flipkartMinutes) counts.flipkartMinutes++;
      if (p.instamart) counts.instamart++;
    });


    return NextResponse.json({
      success: true,
      category,
      pincode,
      lastUpdated: targetScrapedAt,
      products: mergedProducts,
      totalProducts: mergedProducts.length,
      platformCounts: counts
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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
