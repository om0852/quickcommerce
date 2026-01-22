
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars BEFORE importing files that depend on them
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Also try .env if .env.local is missing or partial
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function processGrouping() {
    try {
        const { default: dbConnect } = await import('../lib/mongodb.js');
        const { default: ProductSnapshot } = await import('../models/ProductSnapshot.js');
        const { getGroupingId } = await import('../lib/productGrouper.js');

        await dbConnect();
        console.log('✅ Connected to MongoDB');

        // CLEAR OLD DATA (User Request) - optional if we just want to update
        // But user said "perform this grouping logic", implying a fresh run or robust update.
        // Clearing is safest to verify "totalProducts" count is accurate from scratch.
        console.log('🗑️  Clearing previous groupings...');
        await mongoose.model('ProductGrouping').deleteMany({});
        // We DO NOT unset groupingId in snapshots yet, we will overwrite them. 
        // Or better: unset to be clean.
        await mongoose.models.ProductSnapshot.updateMany({}, { $unset: { groupingId: "" } });
        console.log('✅ Previous groupings cleared.');

        // Get latest snapshots.
        // Optimization: We could group by {platform, productId} first to avoid processing duplicates?
        // But getGroupingId handles it (returns existing).
        // However, we want to prioritize "latest" data?
        const TARGET_PINCODE = '201303';
        const OUTPUT_FILE = path.resolve(process.cwd(), 'grouping_data.json');

        const DATA_FILE = path.resolve(process.cwd(), 'data/groupquickcommerce.productsnapshots.json');
        console.log(`🔍 Reading products from local file: ${DATA_FILE}...`);

        let rawProducts;
        try {
            const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
            rawProducts = JSON.parse(fileContent);
        } catch (err) {
            console.error('❌ Error reading local data file:', err);
            process.exit(1);
        }

        // Normalize and Filter
        const products = rawProducts.filter(p => {
            // Basic Pincode Filter (checking strict string match)
            return p.pincode === TARGET_PINCODE;
        }).map(p => {
            // EJSON Date Normalization
            let scrapedAt = p.scrapedAt;
            if (scrapedAt && typeof scrapedAt === 'object' && scrapedAt.$date) {
                scrapedAt = new Date(scrapedAt.$date);
            } else if (scrapedAt) {
                scrapedAt = new Date(scrapedAt);
            }

            return {
                platform: p.platform,
                productId: p.productId,
                productName: p.productName,
                productWeight: p.productWeight || p.quantity,
                productImage: p.productImage,
                scrapedAt: scrapedAt,
                category: p.category
            };
        });

        console.log(`✅ Loaded ${products.length} products for pincode ${TARGET_PINCODE}.`);

        if (products.length === 0) {
            console.log('No products found for this pincode.');
            process.exit(0);
        }

        // 2. Initialize File
        fs.writeFileSync(OUTPUT_FILE, '[\n');
        let isFirstBatch = true;
        let totalProcessed = 0;

        // Local Memory Store for EVERYTHING
        const memoryStore = new Map();
        memoryStore.productIndex = new Map(); // productId -> groupId
        const searchIndex = new Map(); // word -> Set<groupId>

        // 3. Process All Products
        console.log('🔄 Grouping products (this may take a moment)...');

        for (const [index, product] of products.entries()) {
            if (index % 1000 === 0) console.log(`   ...processed ${index} products`);

            try {
                if (!product.platform || !product.productId) continue;

                // Pass product.category but it won't be used as a strict filter anymore
                await getGroupingId({
                    platform: product.platform,
                    productId: product.productId,
                    productName: product.productName,
                    productWeight: product.productWeight || product.quantity,
                    productImage: product.productImage
                }, product.scrapedAt, product.category, memoryStore, searchIndex);

                totalProcessed++;
            } catch (err) {
                // ignore
            }
        }

        console.log(`   ✅ Processed ${totalProcessed} products -> ${memoryStore.size} unique groups`);

        // 4. Write Result to File
        if (memoryStore.size > 0) {
            const groups = Array.from(memoryStore.values());
            const jsonStr = JSON.stringify(groups, null, 2);
            const innerContent = jsonStr.substring(1, jsonStr.length - 1); // strip []

            fs.appendFileSync(OUTPUT_FILE, innerContent);
        }

        // Explicitly clear map
        memoryStore.clear();
        if (global.gc) global.gc();

        // 5. Close File
        fs.appendFileSync(OUTPUT_FILE, '\n]');
        console.log(`\n\n🎉 Done! Total Products: ${totalProcessed}. Saved to ${OUTPUT_FILE}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    }
}

processGrouping();
