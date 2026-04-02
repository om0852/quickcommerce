import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import { invalidateCategoryCache } from '@/lib/redis-pool';

export async function POST(request) {
    try {
        const { products } = await request.json();

        if (!products || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'No products provided for deletion' }, { status: 400 });
        }

        await dbConnect();

        // Construct a filter for deleteMany using $or
        // We identify snapshots by productId + platform + pincode (if available)
        const cleanupFilters = products.map(p => ({
            productId: p.productId,
            platform: p.platform,
            // Optional: pincode if it's specific to a pincode view
            ...(p.pincode && { pincode: p.pincode })
        }));

        // Fetch categories BEFORE deletion so we know what to invalidate
        let categoriesToInvalidate = [];
        if (cleanupFilters.length > 0) {
            const preDeleteSnaps = await ProductSnapshot.find(
                { $or: cleanupFilters }, 'category'
            ).lean();
            categoriesToInvalidate = [...new Set(preDeleteSnaps.map(s => s.category).filter(Boolean))];
        }

        let deletedCount = 0;
        if (cleanupFilters.length > 0) {
            const result = await ProductSnapshot.deleteMany({ $or: cleanupFilters });
            deletedCount = result.deletedCount;
        }

        // Invalidate Redis cache for affected categories
        await Promise.all(categoriesToInvalidate.map(cat => invalidateCategoryCache(cat)));

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${deletedCount} products`,
            deletedCount
        });

    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
