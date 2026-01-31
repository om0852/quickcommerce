import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';

export async function POST(request) {
    try {
        const { groupingId, updates } = await request.json();

        if (!groupingId) {
            return NextResponse.json({ error: 'Grouping ID is required' }, { status: 400 });
        }

        await dbConnect();

        // Map frontend specific names to DB fields
        const allowedUpdates = {};
        // We expect updates to have 'name' and 'weight' keys
        if (typeof updates.name !== 'undefined') allowedUpdates.primaryName = updates.name;
        if (typeof updates.weight !== 'undefined') allowedUpdates.primaryWeight = updates.weight;

        // Check if there are valid updates
        if (Object.keys(allowedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const group = await ProductGrouping.findOneAndUpdate(
            { groupingId },
            { $set: allowedUpdates },
            { new: true }
        );

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, group });

    } catch (error) {
        console.error('Update group error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
