import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';
import Brand from '@/models/Brand';

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

    // Maps to store context for the second pass
    const targetScrapedAtMap = new Map();
    const allSnapshots = [];

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
          // Update global lastUpdated
          if (!lastUpdatedTimestamp || targetScrapedAt > lastUpdatedTimestamp) {
            lastUpdatedTimestamp = targetScrapedAt;
          }
        } else {
          continue; // No data for this pincode
        }
      }

      anyDataFound = true;
      targetScrapedAtMap.set(currentPincode, targetScrapedAt);

      // --- Step B: Fetch Data for this Pincode ---
      // Fetch Snapshots
      const snapshots = await ProductSnapshot.find({
        pincode: currentPincode,
        scrapedAt: targetScrapedAt,
        $or: [{ category: category }]
      });

      allSnapshots.push(...snapshots);
    } // End of initial pincode loop

    // Create a single snapshot map for efficient lookup across all fetched snapshots
    const snapshotMap = {};
    allSnapshots.forEach(snap => {
      // Key includes pincode to avoid collisions if product IDs are not unique across pincodes
      snapshotMap[`${snap.platform}:${snap.productId}:${snap.pincode}`] = snap;
    });

    const finalProducts = [];
    const usedSnapshotIds = new Set();

    // Fetch Groups (Common across pincodes usually, but we fetch to map)
    const groups = await ProductGrouping.find({ category: category });

    // Fetch all brands and create a lookup map (brandId -> brandName)
    const allBrands = await Brand.find({});
    const brandMap = {};
    allBrands.forEach(b => {
      brandMap[b.brandId] = b.brandName;
    });

    // Iterate over each selected pincode to maintain order and separation for merging
    for (const currentPincode of pincodeList) {
      const targetScrapedAt = targetScrapedAtMap.get(currentPincode);
      if (!targetScrapedAt) {
        continue;
      }

      const currentPincodeItems = [];

      groups.forEach(group => {
        // Temp storage for all matches in this group, separated by platform
        const platformMatches = {
          zepto: [], blinkit: [], jiomart: [], dmart: [], flipkartMinutes: [], instamart: []
        };

        let hasData = false;

        // 1. Collect all matching snapshots for this group AND this pincode
        group.products.forEach(p => {
          const snap = snapshotMap[`${p.platform}:${p.productId}:${currentPincode}`];
          if (snap) {
            if (platformMatches[p.platform]) {
              platformMatches[p.platform].push(snap);
              hasData = true;
              usedSnapshotIds.add(snap._id.toString());
            }
          }
        });

        if (hasData) {
          const productObj = {
            groupingId: group.groupingId,
            name: group.primaryName,
            image: group.primaryImage,
            weight: group.primaryWeight,
            brand: brandMap[group.brandId] || group.brand || '',
            brandId: group.brandId || '',
            zepto: null, blinkit: null, jiomart: null, dmart: null, flipkartMinutes: null, instamart: null,
            officialCategory: group.category,
            officialSubCategory: null,
            scrapedAt: targetScrapedAt,
            isGrouped: true,
            pincode: currentPincode,
            isHeader: false
          };

          // 2. Process matches per platform
          Object.keys(platformMatches).forEach(platform => {
            const matches = platformMatches[platform];
            if (matches.length > 0) {
              // B. Select "Best" Snapshot to display
              const bestSnap = matches.sort((a, b) => {
                const rA = a.ranking && !isNaN(a.ranking) ? a.ranking : Infinity;
                const rB = b.ranking && !isNaN(b.ranking) ? b.ranking : Infinity;
                if (rA !== rB) return rA - rB;
                return Number(a.currentPrice || 0) - Number(b.currentPrice || 0);
              })[0];

              // C. Populate Object
              productObj[platform] = {
                productId: bestSnap.productId,
                productName: bestSnap.productName,
                productImage: bestSnap.productImage,
                productWeight: bestSnap.productWeight,
                rating: bestSnap.rating,
                currentPrice: bestSnap.currentPrice,
                // averagePrice removed as per user request
                originalPrice: bestSnap.originalPrice,
                discountPercentage: bestSnap.discountPercentage,
                ranking: bestSnap.ranking,
                isOutOfStock: bestSnap.isOutOfStock,
                productUrl: bestSnap.productUrl,
                quantity: bestSnap.quantity,
                deliveryTime: bestSnap.deliveryTime,
                isAd: bestSnap.isAd,
                officialCategory: bestSnap.officialCategory,
                officialSubCategory: bestSnap.officialSubCategory,
                subCategory: bestSnap.subCategory,
                combo: bestSnap.combo,
                new: bestSnap.new,
                scrapedAt: bestSnap.scrapedAt,
                snapshotId: bestSnap._id.toString()
              };

              if (!productObj.name) productObj.name = bestSnap.productName;
              if (!productObj.image) productObj.image = bestSnap.productImage;
              if (!productObj.officialSubCategory) productObj.officialSubCategory = bestSnap.officialSubCategory;

              aggregatedCounts[platform]++;
            }
          });

          currentPincodeItems.push(productObj);
        }
      });

      // Sort items by Best Rank (Ascending) before adding to list
      currentPincodeItems.sort((a, b) => {
        const getMinRank = (p) => {
          let min = Infinity;
          ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].forEach(key => {
            if (p[key] && p[key].ranking && !isNaN(p[key].ranking)) {
              const r = Number(p[key].ranking);
              if (r < min) min = r;
            }
          });
          return min;
        };
        return getMinRank(a) - getMinRank(b);
      });

      if (currentPincodeItems.length > 0) {
        // Let's simply show "Pincode: XXXXXX" for now.
        let regionName = `Region: ${currentPincode}`;
        if (currentPincode === '201303') regionName = "Delhi NCR — 201303";
        if (currentPincode === '400706') regionName = "Navi Mumbai — 400706";
        if (currentPincode === '201014') regionName = "Delhi NCR — 201014";
        if (currentPincode === '122008') regionName = "Delhi NCR — 122008";
        if (currentPincode === '122010') regionName = "Delhi NCR — 122010";
        if (currentPincode === '122016') regionName = "Delhi NCR — 122016";
        if (currentPincode === '400070') regionName = "Mumbai — 400070";
        if (currentPincode === '400703') regionName = "Mumbai — 400703";
        if (currentPincode === '401101') regionName = "Mumbai — 401101";
        if (currentPincode === '401202') regionName = "Mumbai — 401202";

        allMergedProducts.push({
          isHeader: true,
          title: regionName,
          pincode: currentPincode
        });
        allMergedProducts.push(...currentPincodeItems);
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
