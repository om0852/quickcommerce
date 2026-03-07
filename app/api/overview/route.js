import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import categoriesData from '@/app/utils/categories_with_urls.json';

// Helper to map raw category names to the Frontend's masterCategory
function getMasterCategory(platform, officialCategory, category) {
    if (!officialCategory && !category) return "Other";
    
    const officialLower = officialCategory ? officialCategory.toLowerCase() : "";
    const catLower = category ? category.toLowerCase() : "";
    const rawCategory = category || officialCategory; // preference for category as fallback
    
    const allItems = Object.values(categoriesData).flat();
    
    // 1. Direct Master Category Match: 
    // If the database gave us a category string that is ALREADY exactly one of our allowed master categories, trust it immediately.
    const exactMasterCat = allItems.find(item => item.masterCategory?.toLowerCase() === catLower);
    if (exactMasterCat) return exactMasterCat.masterCategory;

    const exactMasterOff = allItems.find(item => item.masterCategory?.toLowerCase() === officialLower);
    if (exactMasterOff) return exactMasterOff.masterCategory;

    const platKey = Object.keys(categoriesData).find(k => k.toLowerCase() === platform.toLowerCase());

    // 2. First try platform specific
    if (platKey && categoriesData[platKey]) {
        const match = categoriesData[platKey].find(item => {
            const itemOff = item.officialCategory?.toLowerCase();
            const itemCat = item.category?.toLowerCase();
            
            // Many JSON items lack 'category' and only have 'officialCategory'. 
            // If the DB category matches the JSON officialCategory (like Blinkit)
            if (catLower && itemOff === catLower) return true;
            if (officialLower && itemOff === officialLower && !itemCat) return true;
            if (catLower && itemCat === catLower) return true;
            if (officialLower && itemCat === officialLower) return true;
            
            return false;
        });
        if (match && match.masterCategory) return match.masterCategory;
    }

    // 3. Fallback: search across all platforms
    const fallbackMatch = allItems.find(item => {
        const itemOff = item.officialCategory?.toLowerCase();
        const itemCat = item.category?.toLowerCase();
        
        if (catLower && itemOff === catLower) return true;
        if (officialLower && itemOff === officialLower && !itemCat) return true;
        if (catLower && itemCat === catLower) return true;
        if (officialLower && itemCat === officialLower) return true;
        
        return false;
    });
    if (fallbackMatch && fallbackMatch.masterCategory) return fallbackMatch.masterCategory;

    // 4. Hardcoded fuzzy fallbacks for common mismatches not in JSON
    const combinedStr = `${officialLower} ${catLower}`;
    if (combinedStr.includes('fruit') && combinedStr.includes('veg')) return 'Fruits & Vegetables';
    if (combinedStr.includes('masala') && combinedStr.includes('dry')) return 'Masala, Dry Fruits & More';

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
                        officialCategory: "$officialCategory",
                        category: "$category",
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
                        officialCategory: "$_id.officialCategory",
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
                    officialCategory: "$_id.officialCategory",
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
            const masterCat = getMasterCategory(r.platform, r.officialCategory, r.category);
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
