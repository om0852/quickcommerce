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

        // 2. Identify all products in this group that share the same Base ID
        const productsToMove = oldGroup.products.filter(p => getBaseId(p.productId) === targetBaseId);

        if (productsToMove.length === 0) {
            return NextResponse.json({ error: 'No matching products found in the group' }, { status: 404 });
        }

        // 3. Update the OLD group: remove these products
        const updatedOldProducts = oldGroup.products.filter(p => getBaseId(p.productId) !== targetBaseId);

        if (updatedOldProducts.length === 0) {
            // If group becomes empty, delete it
            await ProductGrouping.deleteOne({ _id: oldGroup._id });
        } else {
            oldGroup.products = updatedOldProducts;
            oldGroup.totalProducts = updatedOldProducts.length;
            await oldGroup.save();
        }

        // 4. Create the NEW Group with metadata from the product itself
        const sampleSnap = await ProductSnapshot.findOne({
            platform: { $regex: `^${platform}$`, $options: 'i' },
            productId: productId,
        }).sort({ scrapedAt: -1 }).lean();

        if (!sampleSnap) {
            return NextResponse.json({ error: 'Could not find product data to create new group' }, { status: 404 });
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
            brand: sampleSnap.brand,
            products: productsToMove,
            totalProducts: productsToMove.length,
            isManuallyVerified: true
        });

        await newGroup.save();

        // 5. Update Snapshots with NEW groupingId for all moved products
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
            message: `Moved ${productsToMove.length} variant(s) to new group`
        });

    } catch (error) {
        console.error('Remove from group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
