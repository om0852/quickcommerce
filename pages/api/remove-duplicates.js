import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to remove duplicates.' });
  }

  try {
    await dbConnect();

    console.log('\n' + '='.repeat(80));
    console.log('🔍 STARTING DUPLICATE DETECTION AND REMOVAL');
    console.log('='.repeat(80));

    // Find duplicates based on scrapedAt, productName, platform, and category
    const duplicates = await ProductSnapshot.aggregate([
      {
        $group: {
          _id: {
            scrapedAt: '$scrapedAt',
            productName: '$productName',
            platform: '$platform',
            category: '$category'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          documents: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 } // Only groups with more than 1 document
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log(`\n📊 Found ${duplicates.length} duplicate groups`);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return res.status(200).json({
        success: true,
        message: 'No duplicates found',
        duplicatesFound: 0,
        duplicatesRemoved: 0
      });
    }

    let totalDuplicates = 0;
    let totalRemoved = 0;
    const duplicateGroups = [];

    // Process each duplicate group
    for (let i = 0; i < duplicates.length; i++) {
      const group = duplicates[i];
      const duplicateCount = group.count - 1; // Keep one, remove the rest
      totalDuplicates += duplicateCount;

      console.log(`\n📦 Duplicate Group ${i + 1}/${duplicates.length}:`);
      console.log(`   ScrapedAt: ${new Date(group._id.scrapedAt).toISOString()}`);
      console.log(`   Product: ${group._id.productName}`);
      console.log(`   Platform: ${group._id.platform}`);
      console.log(`   Category: ${group._id.category}`);
      console.log(`   Total Copies: ${group.count}`);
      console.log(`   To Remove: ${duplicateCount}`);

      // Keep the first document (usually the oldest by _id), remove the rest
      const idsToRemove = group.ids.slice(1); // Remove all except the first one

      if (idsToRemove.length > 0) {
        const deleteResult = await ProductSnapshot.deleteMany({
          _id: { $in: idsToRemove }
        });

        console.log(`   ✅ Removed ${deleteResult.deletedCount} duplicates`);
        totalRemoved += deleteResult.deletedCount;

        duplicateGroups.push({
          scrapedAt: new Date(group._id.scrapedAt).toISOString(),
          productName: group._id.productName,
          platform: group._id.platform,
          category: group._id.category,
          totalCopies: group.count,
          duplicatesRemoved: deleteResult.deletedCount
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ DUPLICATE REMOVAL COMPLETE');
    console.log('='.repeat(80));
    console.log(`Duplicate Groups Found: ${duplicates.length}`);
    console.log(`Total Duplicates Removed: ${totalRemoved}`);
    console.log('='.repeat(80) + '\n');

    // Verify the results
    const totalDocumentsAfter = await ProductSnapshot.countDocuments();
    console.log(`\n🔍 VERIFICATION:`);
    console.log(`   Documents After Removal: ${totalDocumentsAfter}`);
    console.log(`   Duplicates Removed: ${totalRemoved}\n`);

    return res.status(200).json({
      success: true,
      message: 'Duplicates removed successfully',
      summary: {
        duplicateGroupsFound: duplicates.length,
        totalDuplicatesRemoved: totalRemoved,
        documentsRemaining: totalDocumentsAfter
      },
      duplicateGroups: duplicateGroups.slice(0, 50) // Return first 50 groups for review
    });

  } catch (error) {
    console.error('❌ Error removing duplicates:', error);
    return res.status(500).json({ 
      error: 'Failed to remove duplicates',
      details: error.message 
    });
  }
}
