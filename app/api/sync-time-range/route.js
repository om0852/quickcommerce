import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
  try {
    const body = await request.json();
    const { startTime, endTime, targetTime } = body;

    if (!startTime || !endTime) {
      return NextResponse.json({ 
        error: 'startTime and endTime are required' 
      }, { status: 400 });
    }

    await dbConnect();

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const targetDate = targetTime ? new Date(targetTime) : startDate;

    console.log(`Finding products between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    // Find all products in the time range
    const productsInRange = await ProductSnapshot.find({
      scrapedAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).select('_id scrapedAt category platform pincode productName');

    console.log(`Found ${productsInRange.length} products in the time range`);

    if (productsInRange.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products found in the specified time range'
      });
    }

    // Group by category and platform for reporting
    const breakdown = {};
    productsInRange.forEach(product => {
      const key = `${product.category}-${product.platform}-${product.pincode}`;
      if (!breakdown[key]) {
        breakdown[key] = {
          category: product.category,
          platform: product.platform,
          pincode: product.pincode,
          count: 0
        };
      }
      breakdown[key].count++;
    });

    console.log(`Updating all products to timestamp: ${targetDate.toISOString()}`);

    // Update products one by one to avoid duplicate key errors
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const product of productsInRange) {
      try {
        await ProductSnapshot.updateOne(
          { _id: product._id },
          { $set: { scrapedAt: targetDate } }
        );
        successCount++;
      } catch (error) {
        errorCount++;
        if (errors.length < 10) { // Only store first 10 errors
          errors.push({
            productId: product._id,
            productName: product.productName,
            error: error.message
          });
        }
      }
    }

    console.log(`Updated ${successCount} products successfully, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Timestamps synchronized successfully',
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      targetTimestamp: targetDate.toISOString(),
      productsFound: productsInRange.length,
      productsUpdated: successCount,
      errors: errorCount,
      sampleErrors: errors,
      breakdown: Object.values(breakdown)
    });

  } catch (error) {
    console.error('Error syncing time range:', error);
    return NextResponse.json({
      error: 'Failed to sync timestamps',
      message: error.message
    }, { status: 500 });
  }
}
