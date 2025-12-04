import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to update Blinkit URLs.' });
  }

  try {
    await dbConnect();

    console.log('\n' + '='.repeat(80));
    console.log('🔗 UPDATING BLINKIT PRODUCT URLs');
    console.log('='.repeat(80));

    // Find all Blinkit products without URLs or with invalid URLs
    const blinkitProducts = await ProductSnapshot.find({
      platform: 'blinkit',
      $or: [
        { productUrl: { $exists: false } },
        { productUrl: null },
        { productUrl: '' }
      ]
    });

    console.log(`\n📊 Found ${blinkitProducts.length} Blinkit products without URLs`);

    if (blinkitProducts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No Blinkit products need URL updates',
        productsUpdated: 0
      });
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of blinkitProducts) {
      if (!product.productId || !product.productName) {
        console.log(`⚠️ Skipping product ${product._id} - missing productId or productName`);
        skippedCount++;
        continue;
      }

      // Create URL slug from product name
      const slug = product.productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens

      const productUrl = `https://blinkit.com/prn/${slug}/prid/${product.productId}`;

      // Update the product
      await ProductSnapshot.updateOne(
        { _id: product._id },
        { $set: { productUrl } }
      );

      updatedCount++;

      if (updatedCount % 100 === 0) {
        console.log(`✅ Updated ${updatedCount} products...`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ UPDATE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Products Updated: ${updatedCount}`);
    console.log(`Products Skipped: ${skippedCount}`);
    console.log('='.repeat(80) + '\n');

    return res.status(200).json({
      success: true,
      message: 'Blinkit URLs updated successfully',
      summary: {
        productsFound: blinkitProducts.length,
        productsUpdated: updatedCount,
        productsSkipped: skippedCount
      }
    });

  } catch (error) {
    console.error('❌ Error updating Blinkit URLs:', error);
    return res.status(500).json({ 
      error: 'Failed to update Blinkit URLs',
      details: error.message 
    });
  }
}
