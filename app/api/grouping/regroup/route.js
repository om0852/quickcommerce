
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';
import { ungroupProduct } from '@/lib/productGrouper';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const { productId, platform, category, pincode } = await request.json();

        if (!productId || !platform || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();

        // 1. Get Base ID to identify all variants
        const getBaseId = (pid) => pid.split('__')[0].replace(/-[a-z]$/i, '');
        const targetBaseId = getBaseId(productId);

        // 2. Find all variant product IDs on this platform
        const escapedBaseId = targetBaseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const variantIds = await ProductSnapshot.distinct('productId', {
            platform: { $regex: `^${platform}$`, $options: 'i' },
            productId: { $regex: new RegExp(`^${escapedBaseId}(__|$)`) }
        });

        if (variantIds.length === 0) {
            variantIds.push(productId);
        }

        console.log(`[Regroup] Found ${variantIds.length} variant IDs to split:`, variantIds);

        // 3. Remove all variant IDs from their current groups
        for (const vId of variantIds) {
            await ungroupProduct(null, platform, vId);
        }

        // 4. Create a NEW group for these variants
        // Fetch a sample snapshot to populate group details
        const sampleSnap = await ProductSnapshot.findOne({
            platform: { $regex: `^${platform}$`, $options: 'i' },
            productId: { $in: variantIds },
            pincode: pincode || { $exists: true }
        }).sort({ scrapedAt: -1 }).lean();

        if (!sampleSnap) {
            return NextResponse.json({ error: 'Could not find product data to create new group' }, { status: 404 });
        }

        const newGroupId = uuidv4();
        const newGroup = new ProductGrouping({
            groupingId: newGroupId,
            category: category,
            products: variantIds.map(vId => ({ platform, productId: vId })),
            primaryName: sampleSnap.productName,
            primaryImage: sampleSnap.productImage,
            primaryWeight: sampleSnap.productWeight,
            totalProducts: variantIds.length,
            isManuallyVerified: true
        });

        await newGroup.save();

        // 5. Update all snapshots for these variants to point to the new group
        await ProductSnapshot.updateMany(
            { platform: { $regex: `^${platform}$`, $options: 'i' }, productId: { $in: variantIds } },
            { groupingId: newGroupId }
        );

        return NextResponse.json({
            success: true,
            message: `Created new group "${sampleSnap.productName}" with ${variantIds.length} variants.`,
            groupingId: newGroupId
        });

    } catch (error) {
        console.error('Regroup error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
