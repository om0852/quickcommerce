
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';
import { addProductToGroup } from '@/lib/productGrouper';
import { invalidateCategoryCache } from '@/lib/redis-pool';

export async function POST(request) {
    try {
        const { targetGroupId, productId, pincode, platform } = await request.json();

        if (!targetGroupId || !productId || !pincode || !platform) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();

        // Helper to strip suffixes: xyz__fruits -> xyz
        const getBaseId = (pid) => pid.split('__')[0].replace(/-[a-z]$/i, '');
        const targetBaseId = getBaseId(productId);

        // 1. Find all variants of this product on the same platform
        // We search all snapshots for this platform to find any variant IDs
        const escapedBaseId = targetBaseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const variants = await ProductSnapshot.distinct('productId', {
            platform: { $regex: `^${platform}$`, $options: 'i' },
            productId: { $regex: new RegExp(`^${escapedBaseId}(__|$)`) }
        });

        if (variants.length === 0) {
            // Fallback: If no others found by regex, at least process the requested one
            variants.push(productId);
        }

        // 2. Add each variant to the group
        // addProductToGroup automatically handles removing from old groups
        for (const variantId of variants) {
            await addProductToGroup(targetGroupId, {
                platform,
                productId: variantId
            });

            // 3. Update all snapshots of this variant
            await ProductSnapshot.updateMany(
                { platform, productId: variantId },
                { $set: { groupingId: targetGroupId } }
            );
        }

        // Invalidate Redis cache for this category
        const targetGroup = await ProductGrouping.findOne({ groupingId: targetGroupId }).lean();
        if (targetGroup?.category) {
            await invalidateCategoryCache(targetGroup.category);
        }

        return NextResponse.json({ 
            success: true, 
            groupingId: targetGroupId, 
            count: variants.length,
            message: `Added ${variants.length} variant(s) to group`
        });
    } catch (error) {
        console.error('Add to group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
