
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
    try {
        const { groupingId, products } = await request.json();

        await dbConnect();

        let deletedGroupCount = 0;
        let deletedSnapshotsCount = 0;

        // 1. If groupingId is present, try to delete the group and its linked snapshots
        if (groupingId && groupingId !== 'undefined' && groupingId !== 'null') {
            const groupResult = await ProductGrouping.deleteOne({ groupingId });
            deletedGroupCount = groupResult.deletedCount;

            const snapshotResult = await ProductSnapshot.deleteMany({ groupingId });
            deletedSnapshotsCount += snapshotResult.deletedCount;
        }

        // 2. Also delete specific products passed in the request (handles "group not exist" case or unlinked items)
        // We filter out valid items that might not have been caught by groupingId delete
        if (products && Array.isArray(products) && products.length > 0) {

            // Construct a filter for deleteMany using $or
            // We identify snapshots by productId + platform + pincode (if available)
            // Or if we have _id, usage of that would be best, but we'll stick to logical keys to be safe

            const cleanupFilters = products.map(p => ({
                productId: p.productId,
                platform: p.platform,
                // Optional: pincode if it's specific to a pincode view
                ...(p.pincode && { pincode: p.pincode })
            }));

            if (cleanupFilters.length > 0) {
                const extraDelete = await ProductSnapshot.deleteMany({ $or: cleanupFilters });
                deletedSnapshotsCount += extraDelete.deletedCount;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Deletion complete',
            stats: {
                deletedGroup: deletedGroupCount,
                deletedSnapshots: deletedSnapshotsCount
            }
        });

    } catch (error) {
        console.error('Delete recursive error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
