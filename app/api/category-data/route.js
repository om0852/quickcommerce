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

    await dbConnect();

    // Parse Pincodes (comma separated)
    const pincodeList = pincode.split(',').filter(p => p.trim() !== '');

    let allMergedProducts = [];
    let aggregatedCounts = {
      zepto: 0,
      blinkit: 0,
      jiomart: 0,
      dmart: 0,
      flipkartMinutes: 0,
      instamart: 0
    };
    let lastUpdatedTimestamp = null;
    let anyDataFound = false;

    // Iterate over each pincode strictly in order
    for (const currentPincode of pincodeList) {
      let targetScrapedAt;

      // --- Step A: Determine Timestamp for this Pincode ---
      if (requestedTimestamp) {
        // TIME TRAVEL MODE
        const searchDate = new Date(requestedTimestamp);
        const exactBatch = await ProductSnapshot.findOne({
          pincode: currentPincode,
          scrapedAt: searchDate,
          $or: [{ category: category }]
        }).select('scrapedAt');

        if (exactBatch) {
          targetScrapedAt = exactBatch.scrapedAt;
        } else {
          // If requested time not found for this pincode, skip or mark as no data
          // We will skip adding products, but maybe add a header saying "No Data"?
          // For now, let's just skip to avoid clutter
          continue;
        }
      } else {
        // LIVE MODE: Find latest for THIS pincode
        const latestSnapshot = await ProductSnapshot.findOne({
          pincode: currentPincode,
          $or: [
            { category: category },
            { officialCategory: category }
          ]
        }).sort({ scrapedAt: -1 });

        if (latestSnapshot) {
          targetScrapedAt = latestSnapshot.scrapedAt;
          // Update global lastUpdated (use the most recent of all pincodes? or first? usually they are close)
          if (!lastUpdatedTimestamp || targetScrapedAt > lastUpdatedTimestamp) {
            lastUpdatedTimestamp = targetScrapedAt; // Take the newest one
          }
        } else {
          continue; // No data for this pincode
        }
      }

      anyDataFound = true;

      // --- Step B: Fetch Data for this Pincode ---
      // Fetch Groups (Common across pincodes usually, but we fetch to map)
      const groups = await ProductGrouping.find({ category: category });

      // Fetch Snapshots
      const snapshots = await ProductSnapshot.find({
        pincode: currentPincode,
        scrapedAt: targetScrapedAt,
        $or: [{ category: category }]
      });

      const snapshotMap = {};
      snapshots.forEach(snap => {
        snapshotMap[`${snap.platform}:${snap.productId}`] = snap;
      });

      // --- Step C: Merge Products ---
      const pincodeProducts = [];
      const usedSnapshotIds = new Set();

      groups.forEach(group => {
        const productObj = {
          groupingId: group.groupingId,
          name: group.primaryName,
          image: group.primaryImage,
          weight: group.primaryWeight,
          zepto: null, blinkit: null, jiomart: null, dmart: null, flipkartMinutes: null, instamart: null,
          officialCategory: group.category,
          officialSubCategory: null,
          scrapedAt: targetScrapedAt,
          isGrouped: true,
          pincode: currentPincode // Tagging product with pincode
        };

        let hasData = false;
        group.products.forEach(p => {
          const snap = snapshotMap[`${p.platform}:${p.productId}`];
          if (snap) {
            usedSnapshotIds.add(snap._id.toString());
            hasData = true;
            // Populate platform data (SAME AS BEFORE)
            productObj[p.platform] = {
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
              new: snap.new,
              scrapedAt: snap.scrapedAt,
              snapshotId: snap._id.toString()
            };
            if (!productObj.name) productObj.name = snap.productName;
            if (!productObj.image) productObj.image = snap.productImage;
            if (!productObj.officialSubCategory) productObj.officialSubCategory = snap.officialSubCategory;
          }
        });

        if (hasData) {
          pincodeProducts.push(productObj);

          // Aggregate Counts
          if (productObj.zepto) aggregatedCounts.zepto++;
          if (productObj.blinkit) aggregatedCounts.blinkit++;
          if (productObj.jiomart) aggregatedCounts.jiomart++;
          if (productObj.dmart) aggregatedCounts.dmart++;
          if (productObj.flipkartMinutes) aggregatedCounts.flipkartMinutes++;
          if (productObj.instamart) aggregatedCounts.instamart++;
        }
      });

      // --- Step D: Add Header and Append ---
      if (pincodeProducts.length > 0) {
        // Find a formatted name for pincode if possible, or just use code
        // We don't have the label map here easily unless we hardcode or fetch. 
        // Let's simply show "Pincode: XXXXXX" for now.
        // Or better, since we know few pincodes, we can map if we want, but "Region: XXXXXX" is safe.
        let regionName = `Region: ${currentPincode}`;
        if (currentPincode === '201303') regionName = "Delhi NCR — 201303";
        if (currentPincode === '400706') regionName = "Navi Mumbai — 400706";
        if (currentPincode === '201014') regionName = "Delhi NCR — 201014";
        if (currentPincode === '122008') regionName = "Delhi NCR — 122008";
        if (currentPincode === '122010') regionName = "Delhi NCR — 122010";
        if (currentPincode === '122016') regionName = "Delhi NCR — 122016"; // Added for completeness if matches page
        if (currentPincode === '400070') regionName = "Mumbai — 400070";
        if (currentPincode === '400703') regionName = "Mumbai — 400703";
        if (currentPincode === '401101') regionName = "Mumbai — 401101";
        if (currentPincode === '401202') regionName = "Mumbai — 401202";

        allMergedProducts.push({
          isHeader: true,
          title: regionName,
          pincode: currentPincode
        });
        allMergedProducts = allMergedProducts.concat(pincodeProducts);
      }
    } // End Loop

    if (!anyDataFound && !requestedTimestamp) {
      // Fallback for empty state logic if needed, or similar to previous "No data"
      return NextResponse.json({
        success: true,
        category,
        pincode,
        products: [],
        lastUpdated: null,
        message: 'No data available for these pincodes'
      });
    }

    return NextResponse.json({
      success: true,
      category,
      pincode,
      lastUpdated: lastUpdatedTimestamp,
      products: allMergedProducts,
      totalProducts: allMergedProducts.filter(p => !p.isHeader).length,
      platformCounts: aggregatedCounts
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
