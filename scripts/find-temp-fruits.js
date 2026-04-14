import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';

const MONGODB_URI = "mongodb+srv://creatosaurus1:EOaVFfQ5YhOD3UhF@creatosaurus.7trc5.mongodb.net/quickcommerce";

async function run() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  const db = mongoose.connection.db;
  const collection = db.collection('productsnapshots');

  console.log('📖 Loading candidates from temp-fruits-results.json...');
  const candidates = JSON.parse(fs.readFileSync('temp-fruits-results.json', 'utf8'));
  console.log(`Initial candidates count: ${candidates.length}`);

  // We want to find any candidates that exist outside the date range
  const dateQuery = {
    $or: [
      { scrapedAt: { $lt: new Date('2026-01-01T00:00:00.000Z') } },
      { scrapedAt: { $gt: new Date('2026-02-28T23:59:59.999Z') } }
    ]
  };

  // Check in batches to avoid huge $or query
  const BATCH_SIZE = 500;
  let disqualifiedSet = new Set();
  
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    
    const elementsToMatch = batch.map(c => ({
      productId: c._id.productId,
      platform: c._id.platform
    }));

    const query = {
      $and: [
        { $or: elementsToMatch },
        dateQuery
      ]
    };

    const foundOutside = await collection.aggregate([
      { $match: query },
      { $group: { _id: { productId: "$productId", platform: "$platform" } } }
    ]).toArray();

    for (const item of foundOutside) {
      disqualifiedSet.add(`${item._id.platform}_${item._id.productId}`);
    }
    
    console.log(`Processed ${i + batch.length} / ${candidates.length} candidates. Disqualified so far: ${disqualifiedSet.size}`);
  }

  const finalResults = candidates.filter(c => !disqualifiedSet.has(`${c._id.platform}_${c._id.productId}`));

  console.log(`\n📊 Final Count: Found ${finalResults.length} products that STRICTLY only existed between Jan 1 and Feb 28 2026.`);
  
  fs.writeFileSync('strict-temp-fruits-results.json', JSON.stringify(finalResults, null, 2));
  console.log('Strict results saved to strict-temp-fruits-results.json');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("❌ Error:", err);
  mongoose.disconnect();
  process.exit(1);
});
