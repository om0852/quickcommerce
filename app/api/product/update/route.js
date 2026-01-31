import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

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
