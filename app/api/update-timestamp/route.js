import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
  try {
    const body = await request.json();
    const { oldTimestamp, newTimestamp } = body;

    if (!oldTimestamp || !newTimestamp) {
      return NextResponse.json({ 
        error: 'Both oldTimestamp and newTimestamp are required' 
      }, { status: 400 });
    }

    await dbConnect();

    const oldDate = new Date(oldTimestamp);
    const newDate = new Date(newTimestamp);

    console.log(`Updating timestamps from ${oldDate.toISOString()} to ${newDate.toISOString()}`);

    // Find all products with the old timestamp
    const productsToUpdate = await ProductSnapshot.find({
      scrapedAt: oldDate
    });

    console.log(`Found ${productsToUpdate.length} products to update`);

    // Update all products with the new timestamp
    const result = await ProductSnapshot.updateMany(
      { scrapedAt: oldDate },
      { $set: { scrapedAt: newDate } }
    );

    console.log(`Updated ${result.modifiedCount} products`);

    return NextResponse.json({
      success: true,
      message: 'Timestamps updated successfully',
      oldTimestamp: oldDate.toISOString(),
      newTimestamp: newDate.toISOString(),
      productsFound: productsToUpdate.length,
      productsUpdated: result.modifiedCount
    });

  } catch (error) {
    console.error('Error updating timestamps:', error);
    return NextResponse.json({
      error: 'Failed to update timestamps',
      message: error.message
    }, { status: 500 });
  }
}
