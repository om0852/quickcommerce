
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load env vars BEFORE importing files that depend on them
dotenv.config({ path: '../local-scraper-service/.env' });

async function processGrouping() {
    try {
        const { default: dbConnect } = await import('../lib/mongodb.js');
        const { default: ProductSnapshot } = await import('../models/ProductSnapshot.js');
        const { getGroupingId } = await import('../lib/productGrouper.js');

        await dbConnect(); // Use the dbConnect function from lib/mongodb
        // Or if dbConnect directly connects, just importing might be enough but calling it ensures connection
        // Actually lib/mongodb.js exports dbConnect as default.
        // It uses mongoose.connect.

        console.log('✅ Connected to MongoDB');

        // CLEAR OLD DATA (User Request)
        console.log('🗑️  Clearing previous groupings...');
        await mongoose.model('ProductGrouping').deleteMany({});
        await mongoose.models.ProductSnapshot.updateMany({}, { $unset: { groupingId: "" } });
        console.log('✅ Previous groupings cleared.');

        // Get latest snapshots (e.g. from last 24h or just all that don't have groupingId)
        console.log('🔍 Fetching products for grouping...');
        const products = await ProductSnapshot.find({}) // Fetch ALL since we cleared ids
            .sort({ scrapedAt: -1 });

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
                }, product.scrapedAt);

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
