import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

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
            time: timestamp.toISOString(),
            count: count,
            minutesDiff: Math.round(timeDiff)
          });
          group.totalCount += count;
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        // Create new group
        timeGroups.push({
          representative: timestamp.toISOString(),
          timestamps: [{
            time: timestamp.toISOString(),
            count: count,
            minutesDiff: 0
          }],
          totalCount: count,
          normalizedTime: null // Will be calculated next
        });
      }
    }

    console.log(`\n📦 Grouped into ${timeGroups.length} time groups (within 1 hour)`);

    // Normalize each group to nearest scheduled time (12am, 6am, 12pm, 6pm) in UTC
    const scheduledHours = [0, 6, 12, 18]; // 12am, 6am, 12pm, 6pm

    for (const group of timeGroups) {
      const groupTime = new Date(group.representative);
      const hour = groupTime.getUTCHours(); // Use UTC hours
      
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

      // Create normalized timestamp in UTC
      const normalized = new Date(groupTime);
      normalized.setUTCHours(nearestHour, 0, 0, 0); // Use UTC methods
      
      group.normalizedTime = normalized.toISOString();
      group.originalHour = hour;
      group.normalizedHour = nearestHour;
      group.hourDifference = Math.abs(hour - nearestHour);
    }

    // Sort groups by representative time
    timeGroups.sort((a, b) => new Date(a.representative) - new Date(b.representative));

    // Prepare summary
    const summary = {
      totalUniqueTimestamps: uniqueTimes.length,
      totalGroups: timeGroups.length,
      totalDocuments: uniqueTimes.reduce((sum, t) => sum + t.count, 0),
      groups: timeGroups.map(group => ({
        representative: group.representative,
        normalizedTime: group.normalizedTime,
        originalHour: group.originalHour,
        normalizedHour: group.normalizedHour,
        hourDifference: group.hourDifference,
        totalDocuments: group.totalCount,
        timestampCount: group.timestamps.length,
        timestamps: group.timestamps
      }))
    };

    // Log detailed analysis
    console.log('\n' + '='.repeat(80));
    console.log('📊 SCRAPED TIME ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Total Unique Timestamps: ${summary.totalUniqueTimestamps}`);
    console.log(`Total Time Groups (within 1hr): ${summary.totalGroups}`);
    console.log(`Total Documents: ${summary.totalDocuments}`);
    console.log('='.repeat(80));

    for (let i = 0; i < summary.groups.length; i++) {
      const group = summary.groups[i];
      console.log(`\n📦 Group ${i + 1}:`);
      console.log(`   Representative: ${group.representative}`);
      console.log(`   Normalized To:  ${group.normalizedTime}`);
      console.log(`   Original Hour:  ${group.originalHour}:00`);
      console.log(`   Normalized Hour: ${group.normalizedHour}:00 (${group.hourDifference}hr difference)`);
      console.log(`   Total Documents: ${group.totalDocuments}`);
      console.log(`   Timestamp Variations: ${group.timestampCount}`);
      
      if (group.timestamps.length <= 10) {
        console.log(`   Timestamps:`);
        group.timestamps.forEach(ts => {
          console.log(`      - ${ts.time} (${ts.count} docs, ${ts.minutesDiff}min diff)`);
        });
      } else {
        console.log(`   Timestamps: (showing first 5 and last 5)`);
        group.timestamps.slice(0, 5).forEach(ts => {
          console.log(`      - ${ts.time} (${ts.count} docs, ${ts.minutesDiff}min diff)`);
        });
        console.log(`      ... ${group.timestamps.length - 10} more ...`);
        group.timestamps.slice(-5).forEach(ts => {
          console.log(`      - ${ts.time} (${ts.count} docs, ${ts.minutesDiff}min diff)`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));

    return res.status(200).json({
      success: true,
      message: 'Analysis complete. Check console for detailed output.',
      summary
    });

  } catch (error) {
    console.error('❌ Error analyzing scraped times:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze scraped times',
      details: error.message 
    });
  }
}
