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
        let maxVariants = 0;

        for (const p of group.products) {
          const platformKey = p.platform.toLowerCase();
          const snap = snapshotMap[`${platformKey}:${p.productId}`];
          if (snap) {
            const matchKey = Object.keys(platformMatches).find(k => k.toLowerCase() === platformKey);
            if (matchKey) {
              platformMatches[matchKey].push(snap);
              hasData = true;
              if (platformMatches[matchKey].length > maxVariants) {
                maxVariants = platformMatches[matchKey].length;
              }
            }
          }
        }

        // --- Danger (Skull) Logic: Global group definition ---
        const globalPlatformConflicts = {};
        const globalPlatformBaseIdCounts = {};
        const groupDefinedProducts = {};
        
        group.products.forEach(p => {
          const plat = p.platform.toLowerCase();
          if (!groupDefinedProducts[plat]) groupDefinedProducts[plat] = new Set();
          const pid = p.productId || '';
          const baseId = pid.includes('__') ? pid.split('__')[0] : pid;
          groupDefinedProducts[plat].add(baseId);
        });

        Object.keys(groupDefinedProducts).forEach(platform => {
          const uniqueBaseIds = groupDefinedProducts[platform];
          globalPlatformBaseIdCounts[platform] = uniqueBaseIds.size;
          if (uniqueBaseIds.size > 1) {
            globalPlatformConflicts[platform] = true;
          }
        });

        const hasGroupConflict = Object.values(globalPlatformConflicts).some(c => c === true);

        // --- Duplicate (Star) Logic: Local pincode snapshots ---
        const localPlatformTotalCounts = {};
        const localPlatformBaseIdCounts = {};
        const localPlatformHasDuplicates = {};

        Object.keys(platformMatches).forEach(platform => {
          const snapshots = platformMatches[platform];
          localPlatformTotalCounts[platform] = snapshots.length;
          
          const uniqueBaseIds = new Set();
          snapshots.forEach(snap => {
            const pid = snap.productId || '';
            const baseId = pid.includes('__') ? pid.split('__')[0] : pid;
            uniqueBaseIds.add(baseId);
          });
          
          localPlatformBaseIdCounts[platform] = uniqueBaseIds.size;
          localPlatformHasDuplicates[platform] = snapshots.length > uniqueBaseIds.size;
        });

        if (hasData) {
          // Sort variants within each platform to ensure deterministic output
          Object.keys(platformMatches).forEach(platform => {
            platformMatches[platform].sort((a, b) => {
              const rA = a.ranking && !isNaN(a.ranking) ? a.ranking : Infinity;
              const rB = b.ranking && !isNaN(b.ranking) ? b.ranking : Infinity;
              if (rA !== rB) return rA - rB;
              return Number(a.currentPrice || 0) - Number(b.currentPrice || 0);
            });
          });

          // Create rows for this group
          let dupCounter = 1;
          for (let i = 0; i < maxVariants; i++) {
            if (i === 0) {
              // MASTER ROW: Contains the best snapshot from each platform
              const masterObj = {
                groupingId: group.groupingId,
                parentGroupId: group.groupingId,
                isDuplicate: false,
                name: group.primaryName,
                image: group.primaryImage,
                groupImage: null,
                weight: group.primaryWeight,
                brand: brandMap[group.brandId] || group.brand || '',
                brandId: group.brandId || '',
                zepto: null, blinkit: null, jiomart: null, dmart: null, flipkartMinutes: null, instamart: null,
                officialCategory: group.category,
                officialSubCategory: null,
                scrapedAt: targetScrapedAt,
                isGrouped: true,
                pincode: currentPincode,
                isHeader: false,
                hasGroupConflict: hasGroupConflict,
                createdAt: group.createdAt,
                groupConflicts: Object.keys(platformMatches).reduce((acc, plat) => {
                  acc[plat] = {
                    hasConflict: globalPlatformConflicts[plat] || false,
                    count: globalPlatformBaseIdCounts[plat] || 0,
                    hasDuplicates: localPlatformHasDuplicates[plat] || false,
                    totalCount: localPlatformTotalCounts[plat] || 0
                  };
                  return acc;
                }, {})
              };

              let masterHasData = false;
              Object.keys(platformMatches).forEach(platform => {
                const snap = platformMatches[platform][0];
                if (snap) {
                  masterObj[platform] = {
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
                    snapshotId: snap._id.toString(),
                    hasBaseIdConflict: globalPlatformConflicts[platform],
                    platformConflictCount: globalPlatformBaseIdCounts[platform] || 0
                  };

                  if (!masterObj.name) masterObj.name = snap.productName;
                  if (!masterObj.image) masterObj.image = snap.productImage;
                  if (!masterObj.officialSubCategory) masterObj.officialSubCategory = snap.officialSubCategory;

                  aggregatedCounts[platform]++;
                  masterHasData = true;
                }
              });

              if (masterHasData) {
                // Compute groupImage
                if (category === 'Fruits & Vegetables') {
                  const priority = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];
                  for (const plat of priority) {
                    if (masterObj[plat] && masterObj[plat].productImage && masterObj[plat].productImage !== 'N/A') {
                      masterObj.groupImage = masterObj[plat].productImage;
                      break;
                    }
                  }
                }
                if (!masterObj.groupImage || masterObj.groupImage === 'N/A') {
                  masterObj.groupImage = masterObj.image || '';
                }
                currentPincodeItems.push(masterObj);
              }
            } else {
              // DUPLICATE ROWS: Each secondary snapshot gets its OWN individual row
              for (const platform of Object.keys(platformMatches)) {
                const snap = platformMatches[platform][i];
                if (snap) {
                  const dupObj = {
                    groupingId: `${group.groupingId}_dup_${dupCounter++}`,
                    parentGroupId: group.groupingId,
                    isDuplicate: true,
                    name: group.primaryName,
                    image: group.primaryImage,
                    groupImage: null,
                    weight: group.primaryWeight,
                    brand: brandMap[group.brandId] || group.brand || '',
                    brandId: group.brandId || '',
                    zepto: null, blinkit: null, jiomart: null, dmart: null, flipkartMinutes: null, instamart: null,
                    officialCategory: group.category,
                    officialSubCategory: null,
                    scrapedAt: targetScrapedAt,
                    isGrouped: true,
                    pincode: currentPincode,
                    isHeader: false,
                    hasGroupConflict: hasGroupConflict,
                    createdAt: group.createdAt,
                    groupConflicts: Object.keys(platformMatches).reduce((acc, plat) => {
                      acc[plat] = {
                        hasConflict: globalPlatformConflicts[plat] || false,
                        count: globalPlatformBaseIdCounts[plat] || 0,
                        hasDuplicates: localPlatformHasDuplicates[plat] || false,
                        totalCount: localPlatformTotalCounts[plat] || 0
                      };
                      return acc;
                    }, {})
                  };

                  dupObj[platform] = {
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
                    snapshotId: snap._id.toString(),
                    hasBaseIdConflict: globalPlatformConflicts[platform],
                    platformConflictCount: globalPlatformBaseIdCounts[platform] || 0
                  };

                  if (!dupObj.name) dupObj.name = snap.productName;
                  if (!dupObj.image) dupObj.image = snap.productImage;
                  if (!dupObj.officialSubCategory) dupObj.officialSubCategory = snap.officialSubCategory;
                  dupObj.groupImage = dupObj.image || snap.productImage || '';

                  aggregatedCounts[platform]++;
                  currentPincodeItems.push(dupObj);
                }
              }
            }
          }
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
