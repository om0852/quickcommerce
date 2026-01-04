import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FailedScrape from '@/models/FailedScrape';

export const dynamic = 'force-dynamic';

/**
 * GET /api/failed-scrapes
 * Returns all failed scrape attempts with optional filters
 * Query params:
 *   - status: filter by status (pending, retrying, failed, resolved)
 *   - platform: filter by platform (blinkit, zepto, jiomart, dmart)
 *   - category: filter by category
 */
export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const platform = searchParams.get('platform');
        const category = searchParams.get('category');

        // Build query
        const query = {};
        if (status) query.status = status;
        if (platform) query.platform = platform;
        if (category) query.category = category;

        const failedScrapes = await FailedScrape.find(query)
            .sort({ lastAttemptAt: -1 })
            .limit(100);

        // Get statistics
        const stats = await FailedScrape.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsMap = {};
        stats.forEach(stat => {
            statsMap[stat._id] = stat.count;
        });

        return NextResponse.json({
            success: true,
            count: failedScrapes.length,
            stats: {
                pending: statsMap.pending || 0,
                retrying: statsMap.retrying || 0,
                failed: statsMap.failed || 0,
                resolved: statsMap.resolved || 0
            },
            failedScrapes
        });
    } catch (error) {
        console.error('Error fetching failed scrapes:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/failed-scrapes
 * Manually retry a failed scrape
 */
export async function POST(request) {
    try {
        await dbConnect();

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing id parameter' },
                { status: 400 }
            );
        }

        const failedScrape = await FailedScrape.findById(id);

        if (!failedScrape) {
            return NextResponse.json(
                { success: false, error: 'Failed scrape not found' },
                { status: 404 }
            );
        }

        // Reset attempt count to allow retry
        failedScrape.attemptCount = 0;
        failedScrape.status = 'pending';
        failedScrape.errors = [];
        await failedScrape.save();

        return NextResponse.json({
            success: true,
            message: 'Failed scrape reset for retry',
            failedScrape
        });
    } catch (error) {
        console.error('Error resetting failed scrape:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/failed-scrapes
 * Delete a failed scrape record
 */
export async function DELETE(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing id parameter' },
                { status: 400 }
            );
        }

        await FailedScrape.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Failed scrape deleted'
        });
    } catch (error) {
        console.error('Error deleting failed scrape:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
