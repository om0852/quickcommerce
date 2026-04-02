import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ungroupProduct } from '@/lib/productGrouper';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';
import { v4 as uuidv4 } from 'uuid';
import { invalidateCategoryCache } from '@/lib/redis-pool';

export async function POST(request) {
    try {
        const { groupingId, productId, platform, exactOnly = false } = await request.json();

        if (!groupingId || !productId || !platform) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();

        // Helper to strip suffixes: xyz__fruits -> xyz
        const getBaseId = (pid) => pid.split('__')[0].replace(/-[a-z]$/i, '');
        const targetBaseId = getBaseId(productId);

        // 1. Fetch the OLD group
        const oldGroup = await ProductGrouping.findOne({ groupingId });
        if (!oldGroup) {
            return NextResponse.json({ error: 'Source group not found' }, { status: 404 });
        }

        // 2. Identify which products to move out of the group.
        //    exactOnly=true  (cross-pincode dialog): remove ONLY this specific productId
        //    exactOnly=false (default): remove ALL variants sharing the same base ID
        const productsToMove = exactOnly
            ? oldGroup.products.filter(p =>
                p.platform === platform &&
                p.productId === productId          // exact match only
            )
            : oldGroup.products.filter(p =>
                p.platform === platform &&
                getBaseId(p.productId) === targetBaseId  // all variants
            );

        if (productsToMove.length === 0) {
            return NextResponse.json({ error: 'No matching product found in the group' }, { status: 404 });
        }

        const variantIdsToRemove = productsToMove.map(p => p.productId);

        // 3. Compute remaining count using the SAME match predicate as productsToMove
        //    so that exactOnly=true doesn't accidentally trigger full-group deletion
        const shouldRemove = exactOnly
            ? (p) => p.platform === platform && p.productId === productId
            : (p) => p.platform === platform && getBaseId(p.productId) === targetBaseId;

        const remainingCount = oldGroup.products.filter(p => !shouldRemove(p)).length;

        if (remainingCount === 0) {
            await ProductGrouping.deleteOne({ _id: oldGroup._id });
        } else {
            await ProductGrouping.updateOne(
                { _id: oldGroup._id },
                {
                    $pull: { products: { productId: { $in: variantIdsToRemove }, platform: platform } },
                    $set: { totalProducts: remainingCount }
                }
            );
        }

        // 4. Try to create the NEW Group with metadata from the product itself
        const sampleSnap = await ProductSnapshot.findOne({
            platform: { $regex: `^${platform}$`, $options: 'i' },
            productId: productId,
        }).sort({ scrapedAt: -1 }).lean();

        if (!sampleSnap) {
            // If metadata is not found, we still complete the removal but skip creating a new group
            for (const p of productsToMove) {
                await ProductSnapshot.updateMany(
                    { platform: p.platform, productId: p.productId },
                    { $set: { groupingId: null } }
                );
            }
            return NextResponse.json({
                success: true,
                message: `Removed product from group. No new group created as metadata was missing.`
            });
        }

        const newGroupId = uuidv4();
        const newGroup = new ProductGrouping({
            groupingId: newGroupId,
            category: oldGroup.category,
            officialCategory: oldGroup.officialCategory,
            officialSubCategory: oldGroup.officialSubCategory,
            primaryName: sampleSnap.productName,
            primaryImage: sampleSnap.productImage,
            groupImage: sampleSnap.productImage,
            primaryWeight: sampleSnap.productWeight,
            brand: "",
            products: productsToMove,
            totalProducts: productsToMove.length,
            isManuallyVerified: true
        });

        await newGroup.save();

        // 5. Update Snapshots with NEW groupingId for all moved product variants
        for (const p of productsToMove) {
            await ProductSnapshot.updateMany(
                { platform: p.platform, productId: p.productId },
                { $set: { groupingId: newGroupId } }
            );
        }

        // Invalidate Redis cache for this category so next request fetches fresh data
        await invalidateCategoryCache(oldGroup.category);

        return NextResponse.json({
            success: true,
            newGroupId,
            count: productsToMove.length,
            message: `Moved product to new group`
        });

    } catch (error) {
        console.error('Remove from group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
