import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ 
        error: 'Date is required (format: YYYY-MM-DD)' 
      }, { status: 400 });
    }

    await dbConnect();

    // Parse the date and create start/end of day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Randomizing stock status for products on ${date}`);
    console.log(`Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Find all products scraped on this date
    const products = await ProductSnapshot.find({
      scrapedAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).select('_id productName platform category');

    console.log(`Found ${products.length} products to randomize`);

    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products found for this date'
      });
    }

    let updatedCount = 0;

    // Randomize stock status for each product (30% chance of being out of stock)
    for (const product of products) {
      const isOutOfStock = Math.random() < 0.3;
      
      await ProductSnapshot.updateOne(
        { _id: product._id },
        { $set: { isOutOfStock } }
      );
      
      updatedCount++;
      
      if (updatedCount % 100 === 0) {
        console.log(`Randomized ${updatedCount} products...`);
      }
    }

    console.log(`✅ Successfully randomized stock status for ${updatedCount} products`);

    return NextResponse.json({
      success: true,
      message: 'Successfully randomized stock status',
      date,
      productsFound: products.length,
      productsUpdated: updatedCount
    });

  } catch (error) {
    console.error('Error randomizing stock status:', error);
    return NextResponse.json({
      error: 'Failed to randomize stock status',
      message: error.message
    }, { status: 500 });
  }
}
