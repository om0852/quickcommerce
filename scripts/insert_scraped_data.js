import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load env vars BEFORE importing files that depend on them
dotenv.config({ path: '../local-scraper-service/.env' });

const DATA_FILE_PATH = '../local-scraper-service/data/scraped_data_output.json';
const TARGET_TIMESTAMP = '2026-01-15T14:30:00.000+00:00';
const BATCH_SIZE = 1000;

async function insertData() {
    try {
        console.log('🚀 Starting OPTIMIZED data insertion process...');
        console.log(`📂 Reading data from: ${DATA_FILE_PATH}`);

        if (!fs.existsSync(DATA_FILE_PATH)) {
            throw new Error(`File not found: ${DATA_FILE_PATH}`);
        }

        const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const products = JSON.parse(rawData);

        console.log(`📦 Found ${products.length} products to insert.`);

        // Dynamic imports for DB models
        const { default: dbConnect } = await import('../lib/mongodb.js');
        const { default: ProductSnapshot } = await import('../models/ProductSnapshot.js');

        await dbConnect();
        console.log('✅ Connected to MongoDB');

        let processed = 0;
        let errors = 0;

        console.log(`⏳ Inserting data with scrapedAt: ${TARGET_TIMESTAMP} ...`);

        // Process in batches
        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);
            const operations = batch.map(product => {
                // Override scrapedAt
                product.scrapedAt = TARGET_TIMESTAMP;

                return {
                    updateOne: {
                        filter: { platform: product.platform, productId: product.productId },
                        update: { $set: product },
                        upsert: true
                    }
                };
            });

            try {
                await ProductSnapshot.bulkWrite(operations);
                processed += batch.length;
                process.stdout.write(`\r🚀 Bulk Processed: ${processed}/${products.length}`);
            } catch (err) {
                console.error(`\n❌ Error processing batch ${i}:`, err.message);
                errors += batch.length; // Count full batch as potential error/skip
            }
        }

        console.log(`\n\n🎉 Done!`);
        console.log(`✅ Total Processed: ${processed}`);
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Fatal Error:', error);
        process.exit(1);
    }
}

insertData();
