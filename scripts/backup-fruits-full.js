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

  console.log('📖 Loading candidates from strict-temp-fruits-results.json...');
  let candidates;
  try {
    candidates = JSON.parse(fs.readFileSync('strict-temp-fruits-results.json', 'utf8'));
  } catch (err) {
    console.error("❌ Could not read strict-temp-fruits-results.json", err);
    process.exit(1);
  }

  const backupFile = 'backup_fruits_1jan_28feb_2026.json';
  const fd = fs.openSync(backupFile, 'w');
  
  // Start the JSON array
  fs.writeSync(fd, '[\n');
  
  let firstItem = true;
  let totalSnapshots = 0;
  const BATCH_SIZE = 500;

  console.log(`💾 Starting backup to ${backupFile}...`);

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    
    const elementsToMatch = batch.map(c => ({
      productId: c._id.productId,
      platform: c._id.platform
    }));

    const query = { $or: elementsToMatch };

    const cursor = collection.find(query);

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      
      if (!firstItem) {
        fs.writeSync(fd, ',\n');
      }
      fs.writeSync(fd, JSON.stringify(doc));
      firstItem = false;
      totalSnapshots++;
    }
    
    console.log(`Processed batch ${i} to ${i + batch.length} / ${candidates.length}. Backed up ${totalSnapshots} snapshots...`);
  }

  // End the JSON array
  fs.writeSync(fd, '\n]\n');
  fs.closeSync(fd);

  console.log(`\n✅ Backup complete! Safely stored ${totalSnapshots} full product snapshots in ${backupFile}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("❌ Error:", err);
  mongoose.disconnect();
  process.exit(1);
});
