import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

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

        let deletedCount = 0;
        if (cleanupFilters.length > 0) {
            const result = await ProductSnapshot.deleteMany({ $or: cleanupFilters });
            deletedCount = result.deletedCount;
        }

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
