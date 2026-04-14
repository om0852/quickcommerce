import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://creatosaurus1:EOaVFfQ5YhOD3UhF@creatosaurus.7trc5.mongodb.net/quickcommerce";

async function run() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  const col = mongoose.connection.db.collection('productsnapshots');
  
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-02-28T23:59:59.999Z');

  console.log(`🗑️ Starting sweep deletion for Fruits & Vegetables snapshots between ${start.toISOString()} and ${end.toISOString()}...`);
  
  const delRes = await col.deleteMany({ 
    category: "Fruits & Vegetables",
    scrapedAt: { $gte: start, $lte: end } 
  });

  console.log(`\n✅ Deletion complete.`);
  console.log(`   - Snapshots permanently deleted: ${delRes.deletedCount}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("❌ Error:", err);
  mongoose.disconnect();
  process.exit(1);
});
