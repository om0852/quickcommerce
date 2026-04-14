import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductEAN from '@/models/ProductEAN';
import { invalidateCategoryCache } from '@/lib/redis-pool';

export async function POST(request) {
    try {
        const { updates } = await request.json();

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        await dbConnect();

        const results = [];
        const errors = [];

        for (const update of updates) {
            const { snapshotId, ...fields } = update;

            if (!snapshotId) {
                errors.push({ error: 'Missing snapshotId', update });
                continue;
            }

            // Filter for allowed fields only to prevent overwriting critical metadata accidentally
            const allowedFields = [
                'productName',
                'currentPrice',
                'originalPrice',
                'productWeight',
                'officialCategory',
                'officialSubCategory',
                'isOutOfStock',
                'isAd',
                'productUrl',
                'productImage' // Added productImage
            ];

            const safeUpdate = {};
            allowedFields.forEach(field => {
                if (fields[field] !== undefined) {
                    safeUpdate[field] = fields[field];
                }
            });

            // Handle eanCode in the separate ProductEAN collection
            if (fields.eanCode !== undefined && update.productId) {
                try {
                    await ProductEAN.findOneAndUpdate(
                        { productId: update.productId },
                        { $set: { eanCode: fields.eanCode } },
                        { upsert: true, new: true }
                    );
                } catch (eanErr) {
                    console.error("Error upserting EAN:", eanErr);
                }
            }

            if (Object.keys(safeUpdate).length === 0) {
                continue; // Nothing to update
            }

            try {
                const doc = await ProductSnapshot.findByIdAndUpdate(
                    snapshotId,
                    { $set: safeUpdate },
                    { new: true }
                );
                if (doc) {
                    results.push({ snapshotId, success: true });
                } else {
                    errors.push({ snapshotId, error: 'Document not found' });
                }
            } catch (err) {
                errors.push({ snapshotId, error: err.message });
            }
        }

        // Invalidate Redis cache for all affected categories
        if (results.length > 0) {
            const successIds = results.map(r => r.snapshotId);
            const affectedSnaps = await ProductSnapshot.find(
                { _id: { $in: successIds } }, 'category'
            ).lean();
            const uniqueCategories = [...new Set(affectedSnaps.map(s => s.category).filter(Boolean))];
            await Promise.all(uniqueCategories.map(cat => invalidateCategoryCache(cat)));
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            errors
        });

    } catch (error) {
        console.error('Product update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
