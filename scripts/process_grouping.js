
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dbConnect from '../lib/mongodb.js';
import ProductSnapshot from '../models/ProductSnapshot.js';
import { getGroupingId } from '../lib/productGrouper.js';

dotenv.config({ path: '../.env' }); // Adjust path if needed

async function processGrouping() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get latest snapshots (e.g. from last 24h or just all that don't have groupingId)
        // For initial run, maybe distinct products by platform+productId?
        // Or just iterate recent snapshots.

        console.log('🔍 Fetching products without groupingId...');
        const products = await ProductSnapshot.find({ groupingId: { $exists: false } })
            .sort({ scrapedAt: -1 })
            .limit(1000); // Process in batches

        console.log(`📦 Found ${products.length} products to process`);

        let processed = 0;
        let errors = 0;

        for (const product of products) {
            try {
                // Ensure required fields for grouping
                if (!product.productName || !product.productId) {
                    continue;
                }

                // Call grouping logic
                const groupId = await getGroupingId({
                    platform: product.platform,
                    productId: product.productId,
                    productName: product.productName,
                    productWeight: product.productWeight || product.quantity, // Fallback
                    productImage: product.productImage
                });

                // Update snapshot
                product.groupingId = groupId;
                await product.save();

                process.stdout.write(`\r✅ Processed ${++processed}/${products.length}`);
            } catch (err) {
                // console.error(`\n❌ Error processing ${product.productName}:`, err.message);
                errors++;
            }
        }

        console.log(`\n\n🎉 Done! Processed: ${processed}, Errors: ${errors}`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    }
}

processGrouping();
