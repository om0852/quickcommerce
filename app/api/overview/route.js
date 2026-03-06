import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import categoriesData from '@/app/utils/categories_with_urls.json';

// Helper to map raw category names to the Frontend's masterCategory
function getMasterCategory(platform, rawCategory) {
    if (!rawCategory) return "Other";
    const rawLower = rawCategory.toLowerCase();
    const platKey = Object.keys(categoriesData).find(k => k.toLowerCase() === platform.toLowerCase());

    // First try platform specific
    if (platKey && categoriesData[platKey]) {
        const match = categoriesData[platKey].find(item =>
            item.officialCategory?.toLowerCase() === rawLower ||
            item.category?.toLowerCase() === rawLower
        );
        if (match && match.masterCategory) return match.masterCategory;
    }

    // Fallback: search across all platforms
    const allItems = Object.values(categoriesData).flat();
    const fallbackMatch = allItems.find(item =>
        item.officialCategory?.toLowerCase() === rawLower ||
        item.category?.toLowerCase() === rawLower
    );
    if (fallbackMatch && fallbackMatch.masterCategory) return fallbackMatch.masterCategory;

    // Hardcoded fuzzy fallbacks for common mismatches not in JSON
    if (rawLower.includes('fruit') && rawLower.includes('veg')) return 'Fruits & Vegetables';
    if (rawLower.includes('masala') && rawLower.includes('dry')) return 'Masala, Dry Fruits & More';

    return rawCategory; // fallback to whatever it is natively
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const pincode = searchParams.get('pincode');
        const timestamp = searchParams.get('timestamp');

        if (!pincode) {
            return NextResponse.json({ error: 'Pincode is required' }, { status: 400 });
        }

        await dbConnect();

        // Base match for the pincode
        let matchStage = {
            pincode: pincode
        };

        if (timestamp) {
            // Time Travel mode: match exact closest timestamp
            matchStage.scrapedAt = new Date(timestamp);
        }

        const pipeline = [
            { $match: matchStage },
            // Step 1: Group by Category, Platform, and exact scrape time to count products in each scrape batch
            {
                $group: {
                    _id: {
                        category: { $ifNull: ["$officialCategory", "$category"] },
                        platform: { $toLower: "$platform" },
                        scrapedAt: "$scrapedAt"
                    },
                    count: { $sum: 1 }
                }
            },
            // Step 2: Sort by scrape time descending so the latest is first
            { $sort: { "_id.scrapedAt": -1 } },
            // Step 3: Pick the first count encountered (which is the latest scrape) for each category+platform
            {
                $group: {
                    _id: {
                        category: "$_id.category",
                        platform: "$_id.platform"
                    },
                    count: { $first: "$count" },
                    latestScrapedAt: { $first: "$_id.scrapedAt" }
                }
            },
            // Step 4: Format the final output
            {
                $project: {
                    _id: 0,
                    category: "$_id.category",
                    platform: "$_id.platform",
                    count: 1,
                    latestScrapedAt: 1
                }
            }
        ];

        const rawResults = await ProductSnapshot.aggregate(pipeline);

        // Step 1: Map raw categories to masterCategory and group the totals
        const groupedData = {};
        const maxDatePerCategory = {};

        rawResults.forEach(r => {
            const masterCat = getMasterCategory(r.platform, r.category);
            const key = `${masterCat}_${r.platform}_${r.latestScrapedAt}`;

            // Track the absolute highest scrape date across ALL platforms for this master category
            if (!maxDatePerCategory[masterCat] || new Date(r.latestScrapedAt) > new Date(maxDatePerCategory[masterCat])) {
                maxDatePerCategory[masterCat] = r.latestScrapedAt;
            }

            if (!groupedData[key]) {
                groupedData[key] = {
                    category: masterCat,
                    platform: r.platform,
                    count: 0,
                    latestScrapedAt: r.latestScrapedAt
                };
            }
            groupedData[key].count += r.count;
        });

        // Step 2: Filter out any platform data that doesn't exactly match the max date for its master category
        const filteredData = Object.values(groupedData).filter(item => {
            // Compare timestamps directly (both are ISO strings from MongoDB)
            return item.latestScrapedAt.toISOString() === new Date(maxDatePerCategory[item.category]).toISOString();
        });

        // Step 3: Combine any fragmented remaining data (e.g., if a platform split one category into multiple matches for the same scrape run)
        const finalGrouped = {};
        filteredData.forEach(item => {
            const key = `${item.category}_${item.platform}`;
            if (!finalGrouped[key]) {
                finalGrouped[key] = { ...item };
            } else {
                finalGrouped[key].count += item.count;
            }
        });

        const finalData = Object.values(finalGrouped);

        return NextResponse.json({
            success: true,
            data: finalData
        });

    } catch (error) {
        console.error('Overview API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch overview data',
            message: error.message
        }, { status: 500 });
    }
}
