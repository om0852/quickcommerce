import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
  try {
    await dbConnect();

    console.log('Starting to populate isOutOfStock field for all products...');

    // Get all unique product IDs with their platforms
    const products = await ProductSnapshot.find({}).select('_id productId platform category pincode scrapedAt');
    
    console.log(`Found ${products.length} products to update`);

    // Group products by productId + platform + category + pincode
    const productGroups = {};
    products.forEach(product => {
      const key = `${product.productId}-${product.platform}-${product.category}-${product.pincode}`;
      if (!productGroups[key]) {
        productGroups[key] = [];
      }
      productGroups[key].push(product);
    });

    console.log(`Found ${Object.keys(productGroups).length} unique product groups`);

    let updatedCount = 0;

    // For each product group, assign random stock status across different scrape dates
    for (const [key, group] of Object.entries(productGroups)) {
      // Sort by scrapedAt date
      group.sort((a, b) => new Date(a.scrapedAt) - new Date(b.scrapedAt));

      // Randomly assign stock status for each scrape date
      for (const product of group) {
        // 30% chance of being out of stock
        const isOutOfStock = Math.random() < 0.3;
        
        await ProductSnapshot.updateOne(
          { _id: product._id },
          { $set: { isOutOfStock } }
        );
        
        updatedCount++;
        
        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} products...`);
        }
      }
    }

    console.log(`✅ Successfully updated ${updatedCount} products with random stock status`);

    return NextResponse.json({
      success: true,
      message: 'Successfully populated isOutOfStock field',
      totalProducts: products.length,
      productGroups: Object.keys(productGroups).length,
      updatedCount
    });

  } catch (error) {
    console.error('Error populating stock status:', error);
    return NextResponse.json({
      error: 'Failed to populate stock status',
      message: error.message
    }, { status: 500 });
  }
}
