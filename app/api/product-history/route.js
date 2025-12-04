import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
  try {
    const { pincode, productNames } = await request.json();

    if (!pincode || !productNames) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    // Build query to find snapshots for the specified products
    const criteria = [];
    if (productNames.zepto) {
      criteria.push({ 
        platform: 'zepto', 
        productName: productNames.zepto, 
        pincode 
      });
    }
    if (productNames.blinkit) {
      criteria.push({ 
        platform: 'blinkit', 
        productName: productNames.blinkit, 
        pincode 
      });
    }
    if (productNames.jiomart) {
      criteria.push({ 
        platform: 'jiomart', 
        productName: productNames.jiomart, 
        pincode 
      });
    }

    if (criteria.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Fetch snapshots sorted by time
    const snapshots = await ProductSnapshot.find({ $or: criteria })
      .sort({ scrapedAt: 1 })
      .select('platform productName currentPrice ranking scrapedAt');

    // Group snapshots by timestamp (bucketed to nearest minute to align platforms)
    // This helps in creating a unified timeline
    const historyMap = new Map();

    snapshots.forEach(snap => {
      // Round to nearest minute to group concurrent scrapes
      const date = new Date(snap.scrapedAt);
      date.setSeconds(0, 0);
      const key = date.toISOString();

      if (!historyMap.has(key)) {
        historyMap.set(key, { date: key });
      }

      const entry = historyMap.get(key);
      entry[snap.platform] = {
        price: snap.currentPrice,
        ranking: snap.ranking
      };
    });

    const history = Array.from(historyMap.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    return NextResponse.json({ history });

  } catch (error) {
    console.error('Product history error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch product history',
      message: error.message 
    }, { status: 500 });
  }
}
