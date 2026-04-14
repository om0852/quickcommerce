import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';

const MONGODB_URI = "mongodb+srv://creatosaurus1:EOaVFfQ5YhOD3UhF@creatosaurus.7trc5.mongodb.net/quickcommerce";

// We import the ProductGrouping model so we can easily query and .save() to trigger standard validation/logic
import ProductGroupingModel from '../models/ProductGrouping.js'; 

async function run() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  const db = mongoose.connection.db;
  const collection = db.collection('productsnapshots');
  const ProductGrouping = ProductGroupingModel;

  console.log('📖 Loading candidates from strict-temp-fruits-results.json...');
  let candidates;
  try {
    candidates = JSON.parse(fs.readFileSync('strict-temp-fruits-results.json', 'utf8'));
  } catch (err) {
    console.error("❌ Could not read strict-temp-fruits-results.json", err);
    process.exit(1);
  }

  const BATCH_SIZE = 500;
  let totalSnapshotsDeleted = 0;
  let totalGroupingsModified = 0;

  console.log(`🗑️ Starting deletion for ${candidates.length} products...`);

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    
    // 1. Delete Snapshots
    const elementsToMatch = batch.map(c => ({
      productId: c._id.productId,
      platform: c._id.platform
    }));
    
    const delRes = await collection.deleteMany({ $or: elementsToMatch });
    totalSnapshotsDeleted += delRes.deletedCount;
    
    // 2. Remove from groupings & update totalProducts
    const productIdsArray = batch.map(c => c._id.productId);
    const candidateMap = new Set(batch.map(c => `${c._id.platform}_${c._id.productId}`));
    
    const groupingsToUpdate = await ProductGrouping.find({ 'products.productId': { $in: productIdsArray } });
    
    let docsSaved = 0;
    for (const g of groupingsToUpdate) {
      let modified = false;
      
      const newProductsArray = g.products.filter(p => {
        if (candidateMap.has(`${p.platform}_${p.productId}`)) {
          modified = true;
          return false;
        }
        return true;
      });
      
      if (modified) {
        await ProductGrouping.updateOne(
          { _id: g._id },
          { $set: { products: newProductsArray, totalProducts: newProductsArray.length } }
        );
        docsSaved++;
      }
    }
    totalGroupingsModified += docsSaved;
    
    console.log(`Batch ${i} to ${i + batch.length}: Deleted ${delRes.deletedCount} snapshots. Updated ${docsSaved} ProductGroupings.`);
  }

  console.log(`\n✅ Deletion complete.`);
  console.log(`   - Snapshots permanently deleted: ${totalSnapshotsDeleted}`);
  console.log(`   - ProductGroupings modified: ${totalGroupingsModified}`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("❌ Error:", err);
  mongoose.disconnect();
  process.exit(1);
});
