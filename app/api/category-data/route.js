import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import { mergeProductsAcrossPlatforms } from '@/lib/productMatching';

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
      scrapedAt: latestScrapedAt // CRITICAL: Only get products from the latest scraping session
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
