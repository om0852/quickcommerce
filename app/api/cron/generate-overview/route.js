import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';
import OverviewCache from '@/models/OverviewCache';
import categoriesData from '@/app/utils/categories_with_urls.json';

// Reuse the exact same mapper logic as the original overview endpoint
function getMasterCategory(platform, category) {
    if (!category) return "Other";

    const catLower = category.toLowerCase();
    const allItems = Object.values(categoriesData).flat();

    const exactMasterCat = allItems.find(item => item.masterCategory?.toLowerCase() === catLower);
    if (exactMasterCat) return exactMasterCat.masterCategory;

    const platKey = Object.keys(categoriesData).find(k => k.toLowerCase() === platform.toLowerCase());

    if (platKey && categoriesData[platKey]) {
        const match = categoriesData[platKey].find(item => {
            const itemCat = item.category?.toLowerCase();
            return catLower && itemCat === catLower;
        });
        if (match && match.masterCategory) return match.masterCategory;
    }

    const fallbackMatch = allItems.find(item => {
        const itemCat = item.category?.toLowerCase();
        return catLower && itemCat === catLower;
    });
    if (fallbackMatch && fallbackMatch.masterCategory) return fallbackMatch.masterCategory;

    if (catLower.includes('fruit') && catLower.includes('veg')) return 'Fruits & Vegetables';
    if (catLower.includes('masala') && catLower.includes('dry')) return 'Masala, Dry Fruits & More';

    return category;
}

const PINCODE_OPTIONS = [
    '201303', '400706', '201014', '122008', '122010', '122016', '400070', '400703', '401101', '401202'
];

async function generateOverviewForPincode(pincode, groupMap) {
    const pipeline = [
        { $match: { pincode: pincode } },
        {
            $group: {
                _id: {
                    platform: { $toLower: "$platform" },
                    productId: "$productId",
                    scrapedAt: "$scrapedAt"
                }
            }
        }
    ];

    const uniqueSnapsFromDb = await ProductSnapshot.aggregate(pipeline);

    // 1. Map snapshots to categories and find the absolute latest time per category
    const maxTimePerCategory = new Map();
    const snapCategoryInfo = [];

    for (const snap of uniqueSnapsFromDb) {
        const { platform, productId, scrapedAt } = snap._id;
        const key = `${platform}:${productId}`;
        const groupInfo = groupMap.get(key);
        if (!groupInfo) continue;

        const { category } = groupInfo;
        const curMax = maxTimePerCategory.get(category);
        if (!curMax || new Date(scrapedAt) > new Date(curMax)) {
            maxTimePerCategory.set(category, scrapedAt);
        }
        snapCategoryInfo.push({ ...snap._id, category, brandId: groupInfo.brandId });
    }

    // 2. Aggregate counts ONLY for the latest scrape time of each category
    const aggregated = {};
    const seenBaseIds = new Set(); // Track "category:platform:baseId" for the latest time

    for (const snap of snapCategoryInfo) {
        const { platform, productId, scrapedAt, category, brandId } = snap;
        
        // Filter: Only use snapshots matching the global latest time for this category
        if (scrapedAt.toString() !== maxTimePerCategory.get(category)?.toString()) {
            continue;
        }

        // Extract baseId for deduplication
        const baseId = productId.includes('__') ? productId.split('__')[0] : productId;
        
        // Key is now just category+platform since we've already filtered for the latest time
        const aggKey = `${category}_${platform}`;
        const dedupKey = `${aggKey}_${baseId}`;

        if (!aggregated[aggKey]) {
            aggregated[aggKey] = {
                category, 
                platform, 
                count: 0, 
                brands: new Set(),
                latestScrapedAt: scrapedAt
            };
        }

        if (!seenBaseIds.has(dedupKey)) {
            aggregated[aggKey].count++;
            seenBaseIds.add(dedupKey);
        }

        if (brandId && brandId.toLowerCase() !== 'n/a' && brandId !== '') {
            aggregated[aggKey].brands.add(brandId.toLowerCase());
        }
    }

    return Object.values(aggregated).map(data => ({
        ...data,
        brandCount: data.brands.size
    }));
}

export async function GET(request) {
    try {
        await dbConnect();

        // Pre-load all groupings into memory for hyper-fast mapping
        const groupings = await ProductGrouping.find({}).lean();
        const groupMap = new Map();
        for (const g of groupings) {
            if (!g.products) continue;
            for (const p of g.products) {
                const key = `${p.platform.toLowerCase()}:${p.productId}`;
                groupMap.set(key, { category: g.category, brandId: g.brandId || g.brand || 'N/A' });
            }
        }

        let successCount = 0;
        const results = [];

        for (const pincode of PINCODE_OPTIONS) {
            try {
                const data = await generateOverviewForPincode(pincode, groupMap);

                // Upsert to Cache Collection
                await OverviewCache.findOneAndUpdate(
                    { pincode: pincode },
                    { data: data, lastUpdated: new Date() },
                    { upsert: true, new: true }
                );

                successCount++;
                results.push({ pincode, cachedRows: data.length });
            } catch (pincodeError) {
                console.error(`Error caching overview for ${pincode}:`, pincodeError);
                results.push({ pincode, error: pincodeError.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Overview generated and cached for ${successCount}/${PINCODE_OPTIONS.length} pincodes.`,
            results
        });

    } catch (error) {
        console.error('Overview Cron Error:', error);
        return NextResponse.json({ error: 'Failed to generate overview caches' }, { status: 500 });
    }
}
