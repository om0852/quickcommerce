import 'dotenv/config';
import mongoose from 'mongoose';
import ProductSnapshot from './models/ProductSnapshot.js';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // const sourceDateStr = '2026-03-22T08:00:00.000+00:00';
    const sourceDateStr = '2026-04-03T08:00:00.000+00:00';
    const sourceDate = new Date(sourceDateStr);

    const targetDateStr = '2026-04-07T08:00:00.000+00:00'; // 3 april 8am UTC
    const targetDate = new Date(targetDateStr);

    const category = 'Bath & Body';

    console.log(`Finding snapshots for category "${category}" at ${sourceDateStr} (excluding jiomart)...`);
    const snapshotsToDuplicate = await ProductSnapshot.find({
      category,
      scrapedAt: sourceDate,
      platform: { $ne: 'jiomart' }
      // platform: "zepto"
    }).lean();

    console.log(`Found ${snapshotsToDuplicate.length} snapshots to duplicate.`);

    if (snapshotsToDuplicate.length > 0) {
      console.log(`Preparing to insert them for ${targetDateStr}...`);

      const newSnapshots = snapshotsToDuplicate.map(snapshot => {
        const { _id, ...rest } = snapshot; // Exclude original _id
        return {
          ...rest,
          scrapedAt: targetDate
        };
      });

      // Use ordered: false to continue inserting even if there are some duplicate key errors
      const result = await ProductSnapshot.insertMany(newSnapshots, { ordered: false });
      console.log(`Successfully inserted ${result.length} snapshots.`);
    }

  } catch (error) {
    if (error.code === 11000) {
      console.warn('Some snapshots already existed for the target date (duplicate key error).');
    } else {
      console.error('Error:', error);
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
