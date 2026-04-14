import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import Brand from '@/models/Brand';
import { invalidateCategoryCache } from '@/lib/redis-pool';

export async function POST(request) {
    try {
        const { groupingId, updates } = await request.json();

        if (!groupingId) {
            return NextResponse.json({ error: 'Grouping ID is required' }, { status: 400 });
        }

        await dbConnect();
        console.log('[update-group] Received update for:', groupingId, 'updates:', updates);

        // Map frontend specific names to DB fields
        const allowedUpdates = {};
        // We expect updates to have 'name', 'weight', 'brand', 'groupImage' keys
        if (typeof updates.name !== 'undefined') allowedUpdates.primaryName = updates.name;
        if (typeof updates.weight !== 'undefined') allowedUpdates.primaryWeight = updates.weight;
        if (typeof updates.groupImage !== 'undefined') allowedUpdates.groupImage = updates.groupImage;
        if (typeof updates.label !== 'undefined') allowedUpdates.label = updates.label;
        if (typeof updates.eanCode !== 'undefined') allowedUpdates.eanCode = updates.eanCode;

        if (typeof updates.brand !== 'undefined') {
            allowedUpdates.brand = updates.brand;
            
            // Sync brandId — case-sensitive: "Kyari" only matches "Kyari", not "KYARI"
            try {
                const brandDoc = await Brand.findOne({
                    brandName: updates.brand.trim()
                });

                if (brandDoc) {
                    // Only sync the brandId to the group — do NOT touch the Brand collection.
                    // Each group can store its own brand display name (group.brand) independently.
                    allowedUpdates.brandId = brandDoc.brandId;
                } else {
                    // Generate slug for new/unmatched brand
                    // N/A or Slug? Let's use Slug to be consistent with seeding script if user types fully new brand
                    // Or maybe 'N/A' if user clears it?
                    if (!updates.brand || updates.brand.trim() === '') {
                        allowedUpdates.brandId = 'N/A';
                    } else {
                        allowedUpdates.brandId = updates.brand.toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^\w\-]+/g, '')
                            .replace(/\-\-+/g, '-');
                    }
                }
            } catch (err) {
                console.error("Error syncing brandId:", err);
                // Fallback: don't break the update, just maybe leave old ID or ignore
            }
        }

        // Check if there are valid updates
        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const group = await ProductGrouping.findOneAndUpdate(
            { groupingId },
            { $set: allowedUpdates },
            { new: true }
        ).lean();
        console.log('[update-group] Update result:', group ? 'Success' : 'Found no group', group ? `Full Group: ${JSON.stringify(group)}` : '');

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Invalidate Redis cache so updated name/brand/weight reflects immediately
        if (group.category) {
            await invalidateCategoryCache(group.category);
        }

        return NextResponse.json({ success: true, group });

    } catch (error) {
        console.error('Update group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
