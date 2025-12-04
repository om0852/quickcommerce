import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to update timestamps.' });
  }

  try {
    await dbConnect();

    console.log('\n' + '='.repeat(80));
    console.log('🔄 STARTING TIMESTAMP UPDATE PROCESS');
    console.log('='.repeat(80));

    // Get all unique scrapedAt timestamps
    const uniqueTimes = await ProductSnapshot.aggregate([
      {
        $group: {
          _id: '$scrapedAt',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log(`\n📊 Found ${uniqueTimes.length} unique scrapedAt timestamps`);
    console.log(`📦 Total documents to process: ${uniqueTimes.reduce((sum, t) => sum + t.count, 0)}`);

    // Group timestamps that are within 1 hour of each other
    const timeGroups = [];
    
    for (const timeEntry of uniqueTimes) {
      const timestamp = new Date(timeEntry._id);
      const count = timeEntry.count;

      // Find if this timestamp belongs to an existing group (within 1 hour)
      let foundGroup = false;
      
      for (const group of timeGroups) {
        const groupTime = new Date(group.representative);
        const timeDiff = Math.abs(timestamp - groupTime) / (1000 * 60); // difference in minutes

        if (timeDiff <= 60) {
          // Add to existing group
          group.timestamps.push({
            time: timestamp,
            count: count
          });
          group.totalCount += count;
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        // Create new group
        timeGroups.push({
          representative: timestamp,
          timestamps: [{
            time: timestamp,
            count: count
          }],
          totalCount: count,
          normalizedTime: null
        });
      }
    }

    console.log(`\n📦 Grouped into ${timeGroups.length} time groups (within 1 hour)`);

    // Normalize each group to nearest scheduled time (12am, 6am, 12pm, 6pm)
    const scheduledHours = [0, 6, 12, 18]; // 12am, 6am, 12pm, 6pm

    for (const group of timeGroups) {
      const groupTime = group.representative;
      const hour = groupTime.getUTCHours();
      
      // Find nearest scheduled hour
      let nearestHour = scheduledHours[0];
      let minDiff = Math.abs(hour - nearestHour);

      for (const scheduledHour of scheduledHours) {
        const diff = Math.abs(hour - scheduledHour);
        if (diff < minDiff) {
          minDiff = diff;
          nearestHour = scheduledHour;
        }
      }

      // Create normalized timestamp
      const normalized = new Date(groupTime);
      normalized.setUTCHours(nearestHour, 0, 0, 0);
      
      group.normalizedTime = normalized;
    }

    // Update database for each group
    const updateResults = [];
    let totalUpdated = 0;

    for (let i = 0; i < timeGroups.length; i++) {
      const group = timeGroups[i];
      
      console.log(`\n📝 Processing Group ${i + 1}/${timeGroups.length}:`);
      console.log(`   Representative: ${group.representative.toISOString()}`);
      console.log(`   Normalized To:  ${group.normalizedTime.toISOString()}`);
      console.log(`   Documents: ${group.totalCount}`);
      console.log(`   Timestamp Variations: ${group.timestamps.length}`);

      // Update all documents with timestamps in this group
      for (const ts of group.timestamps) {
        const updateResult = await ProductSnapshot.updateMany(
          { scrapedAt: ts.time },
          { $set: { scrapedAt: group.normalizedTime } }
        );

        console.log(`   ✅ Updated ${updateResult.modifiedCount} documents from ${ts.time.toISOString()}`);
        totalUpdated += updateResult.modifiedCount;
      }

      updateResults.push({
        groupIndex: i + 1,
        originalRepresentative: group.representative.toISOString(),
        normalizedTime: group.normalizedTime.toISOString(),
        documentsUpdated: group.totalCount,
        timestampVariations: group.timestamps.length
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ UPDATE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total Groups Processed: ${timeGroups.length}`);
    console.log(`Total Documents Updated: ${totalUpdated}`);
    console.log('='.repeat(80) + '\n');

    // Verify the update
    const verifyUniqueTimes = await ProductSnapshot.aggregate([
      {
        $group: {
          _id: '$scrapedAt',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log(`\n🔍 VERIFICATION:`);
    console.log(`   Before: ${uniqueTimes.length} unique timestamps`);
    console.log(`   After:  ${verifyUniqueTimes.length} unique timestamps`);
    console.log(`   Reduction: ${uniqueTimes.length - verifyUniqueTimes.length} timestamps consolidated\n`);

    return res.status(200).json({
      success: true,
      message: 'Timestamps updated successfully',
      summary: {
        groupsProcessed: timeGroups.length,
        totalDocumentsUpdated: totalUpdated,
        uniqueTimestampsBefore: uniqueTimes.length,
        uniqueTimestampsAfter: verifyUniqueTimes.length,
        timestampsConsolidated: uniqueTimes.length - verifyUniqueTimes.length
      },
      updateResults,
      newUniqueTimestamps: verifyUniqueTimes.map(t => ({
        timestamp: new Date(t._id).toISOString(),
        documentCount: t.count
      }))
    });

  } catch (error) {
    console.error('❌ Error updating scraped times:', error);
    return res.status(500).json({ 
      error: 'Failed to update scraped times',
      details: error.message 
    });
  }
}
