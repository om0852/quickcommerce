import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pincode = searchParams.get('pincode');

    await dbConnect();

    // 1. Build a dynamic filter
    // 1. Build a dynamic filter
    const filter = {};
    if (pincode) filter.pincode = pincode; // Pincode is mandatory constraint if provided

    if (category) {
      filter.$or = [
        { category: category },
      ];
    }

    // 2. Fetch distinct timestamps based on BOTH category and pincode
    const timestamps = await ProductSnapshot.distinct('scrapedAt', filter);

    // 3. Sort them: Newest first
    const sortedSnapshots = timestamps.sort((a, b) => new Date(b) - new Date(a));

    return NextResponse.json({
      success: true,
      snapshots: sortedSnapshots
    });

  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}