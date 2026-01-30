import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ungroupProduct } from '@/lib/productGrouper';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const { groupingId, productId, platform } = await request.json();

        if (!groupingId || !productId || !platform) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();

        // 0. Fetch product details for new group creation
        const productSnapshot = await ProductSnapshot.findOne({ platform, productId });
        if (!productSnapshot) {
            return NextResponse.json({ error: 'Product snapshot not found' }, { status: 404 });
        }

        // 1. Ungroup
        const success = await ungroupProduct(groupingId, platform, productId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to ungroup (product not found in group)' }, { status: 404 });
        }

        // 2. Create NEW Group for this single product
        const newGroupId = uuidv4();

        // Ensure we have minimal valid data
        const newGroup = new ProductGrouping({
            groupingId: newGroupId,
            category: productSnapshot.category || 'Uncategorized',
            primaryName: productSnapshot.productName || 'Unknown Product',
            primaryImage: productSnapshot.productImage,
            primaryWeight: productSnapshot.productWeight,
            products: [{
                platform: platform,
                productId: productId,
                scrapedAt: productSnapshot.scrapedAt
            }],
            totalProducts: 1,
            isManuallyVerified: true // Since user manually separated it
        });

        await newGroup.save();

        // 3. Update Snapshot with NEW groupingId
        productSnapshot.groupingId = newGroupId;
        await productSnapshot.save();

        return NextResponse.json({ success: true, newGroupId, message: 'Product moved to new group' });

    } catch (error) {
        console.error('Remove from group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
