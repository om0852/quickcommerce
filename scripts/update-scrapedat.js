/**
 * Script: update-scrapedat.js
 *
 * Updates the `scrapedAt` field for all ProductSnapshot documents where:
 *   - category is NOT "Fruits & Vegetables"
 *   - scrapedAt is exactly 2026-04-07T08:00:00.000Z
 *
 * Sets scrapedAt → 2026-04-09T08:00:00.000Z
 *
 * Usage:
 *   node scripts/update-scrapedat.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';

let MONGODB_URI = "mongodb+srv://creatosaurus1:EOaVFfQ5YhOD3UhF@creatosaurus.7trc5.mongodb.net/quickcommerce"
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

const OLD_DATE = new Date('2026-04-07T08:00:00.000Z');
const NEW_DATE = new Date('2026-04-09T08:00:00.000Z');

const FILTER = {
  category: { $ne: 'Fruits & Vegetables' },
  scrapedAt: OLD_DATE,
};

async function run() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  const db = mongoose.connection.db;
  const collection = db.collection('productsnapshots');

  // --- DRY RUN: count how many docs will be affected ---
  const matchCount = await collection.countDocuments(FILTER);
  console.log(`📊 Documents matched by filter: ${matchCount}`);

  if (matchCount === 0) {
    console.log('⚠️  No documents found matching the filter. Exiting without changes.');
    await mongoose.disconnect();
    return;
  }

  console.log('\n🔄 Running updateMany...');
  const result = await collection.updateMany(FILTER, {
    $set: { scrapedAt: NEW_DATE },
  });

  console.log(`\n✅ Update complete!`);
  console.log(`   Matched  : ${result.matchedCount}`);
  console.log(`   Modified : ${result.modifiedCount}`);
  console.log(`   Old date : ${OLD_DATE.toISOString()}`);
  console.log(`   New date : ${NEW_DATE.toISOString()}`);

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
