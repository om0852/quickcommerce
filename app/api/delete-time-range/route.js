import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
  try {
    const body = await request.json();
    const { startTime, endTime } = body;

    if (!startTime || !endTime) {
      return NextResponse.json({ 
        error: 'startTime and endTime are required' 
      }, { status: 400 });
    }

    await dbConnect();

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    console.log(`Finding products to delete between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    // First, count how many products will be deleted
    const productsToDelete = await ProductSnapshot.find({
      scrapedAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).select('_id scrapedAt category platform pincode productName');

    console.log(`Found ${productsToDelete.length} products to delete`);

    if (productsToDelete.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products found in the specified time range'
      });
    }

    // Group by category and platform for reporting
    const breakdown = {};
    productsToDelete.forEach(product => {
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

    // Delete all products in the range
    const deleteResult = await ProductSnapshot.deleteMany({
      scrapedAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    console.log(`Deleted ${deleteResult.deletedCount} products`);

    return NextResponse.json({
      success: true,
      message: 'Products deleted successfully',
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      productsFound: productsToDelete.length,
      productsDeleted: deleteResult.deletedCount,
      breakdown: Object.values(breakdown)
    });

  } catch (error) {
    console.error('Error deleting products:', error);
    return NextResponse.json({
      error: 'Failed to delete products',
      message: error.message
    }, { status: 500 });
  }
}
