
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ungroupProduct } from '@/lib/productGrouper';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
    try {
        const { groupingId, productId, platform } = await request.json();

        if (!groupingId || !productId || !platform) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();

        // 1. Ungroup
        const success = await ungroupProduct(groupingId, platform, productId);

        if (!success) {
            return NextResponse.json({ error: 'Failed to ungroup (product not found in group)' }, { status: 404 });
        }

        // 2. Update snapshots to remove groupingId
        await ProductSnapshot.updateMany(
            { platform, productId },
            { $unset: { groupingId: "" } }
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Remove from group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
