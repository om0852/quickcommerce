import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const { groupingId } = await request.json();

        if (!groupingId) {
            return NextResponse.json({ error: 'Grouping ID is required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Find the Group
        const group = await ProductGrouping.findOne({ groupingId });
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const productsToExplode = group.products || [];
        console.log(`💥 Exploding group ${groupingId} with ${productsToExplode.length} products...`);

        // 2. Delete the Grouping
        await ProductGrouping.deleteOne({ groupingId });

        // 3. Create INDIVIDUAL Groups for each product (Explosion)
        let newlyCreatedGroups = 0;

        for (const p of productsToExplode) {
            const { platform, productId } = p;

            // Fetch snapshot to get latest details for the new single-product group
            // We need to find *a* snapshot. Ideally the latest one.
            const snapshot = await ProductSnapshot.findOne({
                platform,
                productId
            }).sort({ scrapedAt: -1 });

            if (snapshot) {
                const newGroupId = uuidv4();

                // Create new single-product group
                const newGroup = new ProductGrouping({
                    groupingId: newGroupId,
                    category: snapshot.category || group.category, // Fallback to old group category
                    products: [{
                        platform,
                        productId,
                        scrapedAt: snapshot.scrapedAt
                    }],
                    primaryName: snapshot.productName,
                    primaryImage: snapshot.productImage,
                    primaryWeight: snapshot.productWeight,
                    totalProducts: 1,
                    isManuallyVerified: true
                });

                await newGroup.save();

                // Update ALL snapshots for this product to point to the new group
                // (fixes history too)
                await ProductSnapshot.updateMany(
                    { platform, productId },
                    { $set: { groupingId: newGroupId } }
                );

                newlyCreatedGroups++;
            } else {
                console.warn(`⚠️ Could not find snapshot for ${platform}:${productId} while exploding. Skiping regroup.`);
                // In this case, it remains orphan (groupingId removed by default or left stale? 
                // We deleted the old group, so old groupingId is dead. 
                // We should probably unset it just in case logic elsewhere checks for validity.)
                await ProductSnapshot.updateMany(
                    { platform, productId },
                    { $unset: { groupingId: "" } }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `Group exploded. Created ${newlyCreatedGroups} individual product groups.`,
            stats: {
                deletedGroup: 1,
                createdGroups: newlyCreatedGroups
            }
        });

    } catch (error) {
        console.error('Delete group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
