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

        // Helper to strip suffixes: xyz__fruits -> xyz
        const getBaseId = (pid) => pid.split('__')[0].replace(/-[a-z]$/i, '');
        const targetBaseId = getBaseId(productId);

        // 1. Fetch the OLD group
        const oldGroup = await ProductGrouping.findOne({ groupingId });
        if (!oldGroup) {
            return NextResponse.json({ error: 'Source group not found' }, { status: 404 });
        }

        // 2. Identify ALL variants of this product in this group (same base ID, same platform)
        //    e.g. productId="abc123" also matches "abc123__fruits", "abc123__-a" etc.
        const productsToMove = oldGroup.products.filter(p =>
            p.platform === platform &&
            getBaseId(p.productId) === targetBaseId
        );

        if (productsToMove.length === 0) {
            return NextResponse.json({ error: 'No matching product found in the group' }, { status: 404 });
        }

        const variantIdsToRemove = productsToMove.map(p => p.productId);

        // 3. Remove ALL matching variants from the OLD group
        const remainingCount = oldGroup.products.filter(p =>
            !(p.platform === platform && getBaseId(p.productId) === targetBaseId)
        ).length;

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
