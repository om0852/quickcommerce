import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import OverviewCache from '@/models/OverviewCache';
import categoriesData from '@/app/utils/categories_with_urls.json';

// Helper to map raw category names to the Frontend's masterCategory
function getMasterCategory(platform, category) {
    if (!category) return "Other";
    
    const catLower = category.toLowerCase();
    const allItems = Object.values(categoriesData).flat();
    
    // 1. Direct Master Category Match: 
    // If the database gave us a category string that is ALREADY exactly one of our allowed master categories, trust it immediately.
    const exactMasterCat = allItems.find(item => item.masterCategory?.toLowerCase() === catLower);
    if (exactMasterCat) return exactMasterCat.masterCategory;

    const platKey = Object.keys(categoriesData).find(k => k.toLowerCase() === platform.toLowerCase());

    // 2. First try platform specific
    if (platKey && categoriesData[platKey]) {
        const match = categoriesData[platKey].find(item => {
            const itemCat = item.category?.toLowerCase();
            return catLower && itemCat === catLower;
        });
        if (match && match.masterCategory) return match.masterCategory;
    }

    // 3. Fallback: search across all platforms
    const fallbackMatch = allItems.find(item => {
        const itemCat = item.category?.toLowerCase();
        return catLower && itemCat === catLower;
    });
    if (fallbackMatch && fallbackMatch.masterCategory) return fallbackMatch.masterCategory;

    // 4. Hardcoded fuzzy fallbacks for common mismatches not in JSON
    if (catLower.includes('fruit') && catLower.includes('veg')) return 'Fruits & Vegetables';
    if (catLower.includes('masala') && catLower.includes('dry')) return 'Masala, Dry Fruits & More';

    return category; // fallback to whatever it is natively
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

        // Query the cache directly instead of running the expensive aggregation
        const cachedOverview = await OverviewCache.findOne({ pincode }).lean();

        if (cachedOverview && cachedOverview.data) {
            return NextResponse.json({ 
                success: true, 
                data: cachedOverview.data,
                cachedAt: cachedOverview.lastUpdated
            });
        }

        // Fallback if cache is empty for this pincode
        return NextResponse.json({ 
            success: true, 
            data: [],
            message: "Cache not yet generated for this pincode."
        });

    } catch (error) {
        console.error('Overview API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch overview data',
            message: error.message
        }, { status: 500 });
    }
}
