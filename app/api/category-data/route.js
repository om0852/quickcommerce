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
    const requestedTimestamp = searchParams.get('timestamp');

    if (!category || !pincode) {
      return NextResponse.json({ error: 'Category and pincode are required' }, { status: 400 });
    }

    await dbConnect();

    const pincodeList = pincode.split(',').filter(p => p.trim() !== '');

    // ============================================================
    // STEP 1: Fetch all groups for this category (category-level)
    // ============================================================
    const groups = await ProductGrouping.find({ category }).lean();
    console.log(groups.length);
    // Fetch all brands for lookup
    const allBrands = await Brand.find({}).lean();
    const brandMap = {};
    allBrands.forEach(b => { brandMap[b.brandId] = b.brandName; });
    console.log('[category-data] Loaded', Object.keys(brandMap).length, 'brands');

    // Collect ALL product IDs present across all groups, keyed by platform
    // Structure: { platform -> Set<productId> }
    const platformProductIds = {};
    for (const group of groups) {
      for (const p of group.products) {
        if (!platformProductIds[p.platform]) platformProductIds[p.platform] = new Set();
        platformProductIds[p.platform].add(p.productId);
      }
    }

    let allMergedProducts = [];
    let aggregatedCounts = { zepto: 0, blinkit: 0, jiomart: 0, dmart: 0, flipkartMinutes: 0, instamart: 0 };
    let lastUpdatedTimestamp = null;
    let anyDataFound = false;

    // ============================================================
    // STEP 2: For each requested pincode, determine the timestamp
    //         and fetch snapshots for the products in those groups
    // ============================================================
    for (const currentPincode of pincodeList) {
      let targetScrapedAt;

      if (requestedTimestamp) {
        // TIME TRAVEL MODE: use exact timestamp
        const searchDate = new Date(requestedTimestamp);
        const exactBatch = await ProductSnapshot.findOne({
          pincode: currentPincode,
          scrapedAt: searchDate,
          $or: [{ category: category }, { officialCategory: category }]
        }).select('scrapedAt').lean();

        if (exactBatch) {
          targetScrapedAt = exactBatch.scrapedAt;
        } else {
          continue; // No data for this pincode at this timestamp
        }
      } else {
        // LIVE MODE: find the most recent scrape for this pincode
        const latestSnapshot = await ProductSnapshot.findOne({
          pincode: currentPincode,
          $or: [{ category: category }, { officialCategory: category }]
        }).sort({ scrapedAt: -1 }).select('scrapedAt').lean();

        if (latestSnapshot) {
          targetScrapedAt = latestSnapshot.scrapedAt;
          if (!lastUpdatedTimestamp || targetScrapedAt > lastUpdatedTimestamp) {
            lastUpdatedTimestamp = targetScrapedAt;
          }
        } else {
          continue; // No data for this pincode
        }
      }

      anyDataFound = true;

      // ============================================================
      // STEP 3: Fetch snapshots for this pincode + scrapedAt
      //         for the specific product IDs that exist in groups
      //         (no category filter — we look up by productId directly)
      // ============================================================
      const allGroupProductIds = [];
      for (const ids of Object.values(platformProductIds)) {
        for (const id of ids) allGroupProductIds.push(id);
      }

      const snapshots = await ProductSnapshot.find({
        pincode: currentPincode,
        scrapedAt: targetScrapedAt,
        productId: { $in: allGroupProductIds }
      }).lean();

      console.log(`[category-data] Pincode ${currentPincode}: fetched ${snapshots.length} snapshots for ${allGroupProductIds.length} group product IDs`);

      // Build snapshot lookup: platform:productId -> snapshot
      const snapshotMap = {};
      snapshots.forEach(snap => {
        const key = `${snap.platform.toLowerCase()}:${snap.productId}`;
        // Keep best ranking if multiple exist
        if (!snapshotMap[key] || (snap.ranking && snap.ranking < (snapshotMap[key].ranking || Infinity))) {
          snapshotMap[key] = snap;
        }
      });

      // ============================================================
      // STEP 4: Build the product list for this pincode
      //         by joining groups with their snapshots
      // ============================================================
      const currentPincodeItems = [];

      for (const group of groups) {
        const platformMatches = {
          zepto: [], blinkit: [], jiomart: [], dmart: [], flipkartMinutes: [], instamart: []
        };
        let hasData = false;

        for (const p of group.products) {
          const platformKey = p.platform.toLowerCase();
          const snap = snapshotMap[`${platformKey}:${p.productId}`];
          if (snap) {
            const matchKey = Object.keys(platformMatches).find(k => k.toLowerCase() === platformKey);
            if (matchKey) {
              platformMatches[matchKey].push(snap);
              hasData = true;
            }
          }
        }

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

          Object.keys(platformMatches).forEach(platform => {
            const matches = platformMatches[platform];
            if (matches.length > 0) {
              const bestSnap = matches.sort((a, b) => {
                const rA = a.ranking && !isNaN(a.ranking) ? a.ranking : Infinity;
                const rB = b.ranking && !isNaN(b.ranking) ? b.ranking : Infinity;
                if (rA !== rB) return rA - rB;
                return Number(a.currentPrice || 0) - Number(b.currentPrice || 0);
              })[0];

              productObj[platform] = {
                productId: bestSnap.productId,
                productName: bestSnap.productName,
                productImage: bestSnap.productImage,
                productWeight: bestSnap.productWeight,
                rating: bestSnap.rating,
                currentPrice: bestSnap.currentPrice,
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
      }

      // Sort by best rank
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

        allMergedProducts.push({ isHeader: true, title: regionName, pincode: currentPincode });
        allMergedProducts.push(...currentPincodeItems);
      }
    }

    if (!anyDataFound && !requestedTimestamp) {
      return NextResponse.json({
        success: true, category, pincode, products: [], lastUpdated: null,
        message: 'No data available for these pincodes'
      });
    }
    console.log(allMergedProducts.length)
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
    return NextResponse.json({ error: 'Failed to fetch category data', message: error.message }, { status: 500 });
  }
}
