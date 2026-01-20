import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import { mergeProductsAcrossPlatforms } from '@/lib/productMatching';

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
      // We parse the requested date. 
      // CRITICAL: This date must match the DB 'scrapedAt' exactly (ms precision).
      const searchDate = new Date(requestedTimestamp);

      // Optional Robustness: Verify this timestamp actually exists for this category/pincode
      // This prevents returning an empty array if the frontend sends a slightly mismatched time.
      const exactBatch = await ProductSnapshot.findOne({
        pincode,
        scrapedAt: searchDate,
        $or: [
          { category: category },
          { officialCategory: category }
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
      // We need to match EITHER category OR officialCategory
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

    // 3. FETCH PRODUCTS FOR THAT SPECIFIC SLOT ONLY
    // The key here is 'scrapedAt: targetScrapedAt'. 
    // This acts as a strict firewall, ensuring no data from previous/future batches appears.
    // 3. FETCH PRODUCTS FOR THAT SPECIFIC SLOT ONLY
    // The key here is 'scrapedAt: targetScrapedAt'. 
    // This acts as a strict firewall, ensuring no data from previous/future batches appears.
    const snapshots = await ProductSnapshot.find({
      pincode,
      scrapedAt: targetScrapedAt,
      $or: [
        { category: category },
        { officialCategory: category }
      ]
    }).sort({ platform: 1, ranking: 1 });

    // --- (Rest of your processing logic remains the same) ---

    // Group products by platform
    const productsByPlatform = {
      zepto: [],
      blinkit: [],
      jiomart: [],
      dmart: [],
      flipkartMinutes: [],
      instamart: []
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
          isOutOfStock: snap.isOutOfStock,
          productUrl: snap.productUrl,
          quantity: snap.quantity,
          deliveryTime: snap.deliveryTime,
          isAd: snap.isAd,
          officialCategory: snap.officialCategory,
          officialSubCategory: snap.officialSubCategory,
          subCategory: snap.subCategory,
          combo: snap.combo,
          scrapedAt: snap.scrapedAt
        });
      }
    });

    const mergedProducts = mergeProductsAcrossPlatforms(
      productsByPlatform.zepto,
      productsByPlatform.blinkit,
      productsByPlatform.jiomart,
      productsByPlatform.dmart,
      productsByPlatform.flipkartMinutes,
      productsByPlatform.instamart
    );

    return NextResponse.json({
      success: true,
      category,
      pincode,
      lastUpdated: targetScrapedAt, // Return the exact timestamp used
      products: mergedProducts,
      totalProducts: mergedProducts.length,
      platformCounts: {
        zepto: productsByPlatform.zepto.length,
        blinkit: productsByPlatform.blinkit.length,
        jiomart: productsByPlatform.jiomart.length,
        dmart: productsByPlatform.dmart.length,
        flipkartMinutes: productsByPlatform.flipkartMinutes.length,
        instamart: productsByPlatform.instamart.length
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