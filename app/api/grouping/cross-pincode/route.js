import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductGrouping from '@/models/ProductGrouping';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const groupingId = searchParams.get('groupingId');

        if (!groupingId) {
            return NextResponse.json({ error: 'Grouping ID is required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Fetch group data
        const group = await ProductGrouping.findOne({ groupingId }).lean();
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // 2. Get all product IDs and platforms in the group
        const productPlatformPairs = group.products.map(p => ({
            productId: p.productId,
            platform: p.platform
        }));

        const productIds = productPlatformPairs.map(p => p.productId);

        // 3. Fetch snapshots for these products across ALL pincodes
        // We only want the LATEST snapshot for each productId + pincode combination
        const allSnapshots = await ProductSnapshot.find({
            productId: { $in: productIds }
        }).sort({ scrapedAt: -1 }).lean();

        // 4. Organize snapshots: productId -> pincode -> latestSnapshot
        const productPincodeMap = {};

        allSnapshots.forEach(snap => {
            if (!productPincodeMap[snap.productId]) {
                productPincodeMap[snap.productId] = {};
            }
            if (!productPincodeMap[snap.productId][snap.pincode]) {
                productPincodeMap[snap.productId][snap.pincode] = snap;
            }
        });

        // 5. Build structured result
        const productsWithPincodeData = group.products.map(p => {
            const pincodesData = productPincodeMap[p.productId] || {};
            const availablePincodes = Object.keys(pincodesData).sort();
            
            // Get arbitrary latest details for display (e.g. name, weight)
            const latestAnywhere = availablePincodes.length > 0 ? pincodesData[availablePincodes[0]] : null;

            return {
                productId: p.productId,
                platform: p.platform,
                productName: latestAnywhere?.productName || 'N/A',
                productWeight: latestAnywhere?.productWeight || 'N/A',
                pincodes: availablePincodes,
                pincodeDetails: pincodesData
            };
        });

        return NextResponse.json({
            success: true,
            groupingId,
            primaryName: group.primaryName,
            products: productsWithPincodeData
        });

    } catch (error) {
        console.error('Cross-pincode API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
