import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function GET() {
  try {
    await dbConnect();

    // distinct('scrapedAt') gets all unique timestamps from your DB
    const timestamps = await ProductSnapshot.distinct('scrapedAt');

    // Sort them: Newest first so the dropdown shows latest dates at the top
    const sortedSnapshots = timestamps.sort((a, b) => new Date(b) - new Date(a));

    return NextResponse.json({ 
      snapshots: sortedSnapshots 
    });

  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}