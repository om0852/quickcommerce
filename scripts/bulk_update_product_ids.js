
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

const ProductSnapshotSchema = new mongoose.Schema({
    productId: String,
    category: String,
    officialSubCategory: String,
    platform: String,
    pincode: String
}, { strict: false });

const ProductGroupingSchema = new mongoose.Schema({
    groupingId: String,
    category: String,
    products: [{
        platform: String,
        productId: String
    }]
}, { strict: false });

const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema, 'productsnapshots');
const ProductGrouping = mongoose.models.ProductGrouping || mongoose.model('ProductGrouping', ProductGroupingSchema, 'productgroupings');

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

async function updateBulkProductIds(tasks) {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        for (const task of tasks) {
            const { category, pincode } = task;
            console.log(`\n🚀 Processing Category: "${category}", Pincode: ${pincode}`);

            const query = { category, pincode };
            const totalSnapshots = await ProductSnapshot.countDocuments(query);
            console.log(`   Total snapshots to check: ${totalSnapshots}`);

            const cursor = ProductSnapshot.find(query).cursor();
            let processedCount = 0;
            let snapshotUpdates = 0;
            let groupUpdates = 0;

            let snapshotBatch = [];
            let groupingBatch = [];
            const BATCH_SIZE = 500;

            for (let snap = await cursor.next(); snap != null; snap = await cursor.next()) {
                processedCount++;

                if (processedCount % BATCH_SIZE === 0 || processedCount === totalSnapshots) {
                    const percent = ((processedCount / totalSnapshots) * 100).toFixed(1);
                    process.stdout.write(`\r   Progress: ${processedCount}/${totalSnapshots} (${percent}%) | Updated Snapshots: ${snapshotUpdates} | Updated Groups: ${groupUpdates}`);
                }

                if (!snap.officialSubCategory) continue;

                const suffix = slugify(snap.officialSubCategory);
                if (!suffix) continue;

                const oldProductId = snap.productId;
                const baseId = oldProductId.split('__')[0];
                const newProductId = `${baseId}__${suffix}`;

                if (oldProductId === newProductId) continue;

                // Prepare Snapshot update
                snapshotBatch.push({
                    updateOne: {
                        filter: { _id: snap._id },
                        update: { $set: { productId: newProductId } }
                    }
                });
                snapshotUpdates++;

                // Prepare Grouping updates
                groupingBatch.push({
                    updateMany: {
                        filter: {
                            category: category,
                            'products.platform': snap.platform,
                            'products.productId': oldProductId
                        },
                        update: {
                            $set: { 'products.$[elem].productId': newProductId }
                        },
                        arrayFilters: [{ 'elem.platform': snap.platform, 'elem.productId': oldProductId }]
                    }
                });

                // Execute batch if limit reached
                if (snapshotBatch.length >= BATCH_SIZE) {
                    await ProductSnapshot.bulkWrite(snapshotBatch);
                    const groupRes = await ProductGrouping.bulkWrite(groupingBatch);
                    groupUpdates += groupRes.modifiedCount;

                    snapshotBatch = [];
                    groupingBatch = [];
                }
            }

            // Final batch execution
            if (snapshotBatch.length > 0) {
                await ProductSnapshot.bulkWrite(snapshotBatch);
                const groupRes = await ProductGrouping.bulkWrite(groupingBatch);
                groupUpdates += groupRes.modifiedCount;
            }

            console.log(`\n\n   ✅ Task Complete: ${category} / ${pincode}`);
            console.log(`   Snapshots updated: ${snapshotUpdates}`);
            console.log(`   Group links updated: ${groupUpdates}`);
        }

    } catch (err) {
        console.error('\n❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
}

const TASKS = [
    { category: "Snacks & Munchies", pincode: "201303" },
    { category: "Snacks & Munchies", pincode: "201014" },
    { category: "Snacks & Munchies", pincode: "122008" },
    { category: "Snacks & Munchies", pincode: "122010" },
    { category: "Snacks & Munchies", pincode: "122016" },
    { category: "Snacks & Munchies", pincode: "400706" },
    { category: "Snacks & Munchies", pincode: "400703" },
    { category: "Snacks & Munchies", pincode: "400070" },
    { category: "Snacks & Munchies", pincode: "401101" },
    { category: "Snacks & Munchies", pincode: "401202" }
];

updateBulkProductIds(TASKS);
