import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const timestamp = searchParams.get('timestamp');

        if (!category) {
            return NextResponse.json({ error: 'Category is required' }, { status: 400 });
        }

        await dbConnect();

        // Base match for the category
        let matchStage = {
            $or: [
                { category: category },
                { officialCategory: category }
            ]
        };

        if (timestamp) {
            // Time Travel mode: match exact closest timestamp
            // Ideally matches the timestamp picked from drop-down
            matchStage.scrapedAt = new Date(timestamp);
        } else {
            // Live mode is trickier. Since each pincode updates at slightly different times,
            // it's best to group by pincode first, get MAX scrapedAt per pincode, then get counts.
            // But for a quick overview, we can find the latest timestamp across ALL pincodes globally for this category
            // and look within a short time window (e.g. last 2 hours).

            // Find the absolute latest snapshot date to anchor
            const latestSnapshot = await ProductSnapshot.findOne(matchStage)
                .sort({ scrapedAt: -1 })
                .select('scrapedAt')
                .lean();

            if (latestSnapshot) {
                // Look backing 30 hours to catch delayed scrape chunks just in case
                const timeWindow = new Date(latestSnapshot.scrapedAt.getTime() - (30 * 60 * 60 * 1000));
                matchStage.scrapedAt = { $gte: timeWindow };
            }
        }

        // Advanced Aggregation to Matrix the data directly in MongoDB
        const pipeline = [
            { $match: matchStage },
            // Sort in descending order to prepare for taking latest
            { $sort: { scrapedAt: -1 } },

            // Step 1: For each unique (pincode + platform + productId), pick the LATEST scrapedAt record.
            // This solves the problem of returning "Live Mode" data across varying chunk update times.
            {
                $group: {
                    _id: {
                        pincode: "$pincode",
                        platform: "$platform",
                        productId: "$productId"
                    },
                    // we only need the presence to count, but keeping scrapedAt ensures we got the latest
                    scrapedAt: { $first: "$scrapedAt" }
                }
            },

            // Step 2: Now that we have exactly 1 record per product per pincode+platform,
            // group by pincode + platform and literally just count them!
            {
                $group: {
                    _id: {
                        pincode: "$_id.pincode",
                        platform: "$_id.platform"
                    },
                    count: { $sum: 1 }
                }
            },

            // Step 3: Reshape output
            {
                $project: {
                    _id: 0,
                    pincode: "$_id.pincode",
                    platform: "$_id.platform",
                    count: 1
                }
            }
        ];

        const results = await ProductSnapshot.aggregate(pipeline);

        // Provide the frontend with the raw matrix. The frontend can transform it into rows & columns easily.
        return NextResponse.json({
            success: true,
            category,
            timestamp: timestamp || null,
            data: results
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache',
            }
        });

    } catch (error) {
        console.error('Overview API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch overview data',
            message: error.message
        }, { status: 500 });
    }
}
