
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping'; // Assuming you have this model
import ProductSnapshot from '@/models/ProductSnapshot';
import { addProductToGroup } from '@/lib/productGrouper';

export async function POST(request) {
    try {
        const { targetGroupId, productId, pincode, platform } = await request.json();

        if (!targetGroupId || !productId || !pincode || !platform) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();

        // 1. Find the product snapshot to verify existence and get details
        // using findOne to get the 'latest' or specific one. 
        // Ideally we should have scrapedAt or something but we'll try to find the best match.
        // We sort by scrapedAt desc to get the latest version of this product.
        const product = await ProductSnapshot.findOne({
            pincode,
            platform,
            productId
        }).sort({ scrapedAt: -1 });

        if (!product) {
            return NextResponse.json({ error: 'Product not found in snapshot' }, { status: 404 });
        }

        // 2. Add to group logic
        const newGroupId = await addProductToGroup(targetGroupId, {
            platform,
            productId,
            productName: product.productName,
            // Pass other fields if needed by addProductToGroup, but usually it fetches or is lightweight
        });

        // 3. Update the snapshot to reflect this new ID immediately (for UI responsiveness)
        // We update ALL snapshots of this product? Or just latest?
        // Use updateMany to be consistent across time if it's the "same" product?
        // Or just the one found?
        // Grouping is usually persistent for the product entity.
        await ProductSnapshot.updateMany(
            { platform, productId },
            { groupingId: newGroupId }
        );

        return NextResponse.json({ success: true, groupingId: newGroupId });
    } catch (error) {
        console.error('Add to group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
