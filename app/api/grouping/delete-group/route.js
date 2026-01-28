
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
    try {
        const { groupingId } = await request.json();

        if (!groupingId) {
            return NextResponse.json({ error: 'Grouping ID is required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Delete the Grouping
        const deletionResult = await ProductGrouping.deleteOne({ groupingId });

        if (deletionResult.deletedCount === 0) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // 2. Unlink all snapshots that were in this group
        // We set groupingId to null for all snapshots pointing to this group
        const updateResult = await ProductSnapshot.updateMany(
            { groupingId },
            { $unset: { groupingId: "" } }
        );

        return NextResponse.json({
            success: true,
            message: 'Group deleted and products ungrouped',
            snapshotsUpdated: updateResult.modifiedCount
        });

    } catch (error) {
        console.error('Delete group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
