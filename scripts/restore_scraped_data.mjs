
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Import the model
// Note: We need to use dynamic import or ensure schema is registered if using CommonJS model in ESM
// But since the project uses ESM (import/export), we can try importing directly. 
// However, if the file extension is .js and package.json doesn't say "type": "module", 
// we might face issues if we don't treat this script as .mjs (which we are).
// We'll import the model file directly.
import ProductSnapshot from '../models/ProductSnapshot.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const BACKUP_FILE = path.resolve(__dirname, '../scraped_data_backup.json');
const CATEGORIES_FILE = path.resolve(__dirname, '../app/utils/categories_with_urls.json');
const TARGET_SCRAPED_AT = new Date('2026-01-09T14:30:00.000+00:00');

async function dbConnect() {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    return mongoose.connect(MONGODB_URI);
}

async function restoreData() {
    try {
        console.log('Connecting to MongoDB...');
        await dbConnect();
        console.log('Connected.');

        console.log('Reading files...');
        const backupData = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
        const categoriesMapping = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));

        // Create a lookup map for category URLs
        // Map: Platform -> Category Name -> URL
        // Or closer: Platform -> Category Name -> { url, officialCategory, officialSubCategory }
        const urlMap = {};

        for (const [masterCategory, platforms] of Object.entries(categoriesMapping)) {
            for (const [platform, items] of Object.entries(platforms)) {
                if (!urlMap[platform]) urlMap[platform] = {};

                items.forEach(item => {
                    // Normalize names for better matching (optional, but good for safety)
                    const key = item.name.trim(); // We will try exact match first
                    urlMap[platform][key] = {
                        url: item.url,
                        officialCategory: item.officialCategory || masterCategory,
                        officialSubCategory: item.officialSubCategory
                    };
                });
            }
        }

        console.log('Starting data transformation and insertion...');

        let successCount = 0;
        let failCount = 0;
        let missingUrlCount = 0;

        const productsToInsert = [];

        // Iterate through backup data
        for (const entry of backupData) {
            const { platform, pincode, category, subCategory, products } = entry;

            // Find URL info
            let urlInfo = null;
            if (urlMap[platform] && urlMap[platform][category]) {
                urlInfo = urlMap[platform][category];
            }

            // If exact match fails, try case-insensitive or partial? 
            // For now, let's log if missing.

            if (!urlInfo) {
                // Fallback: try to find by name in the platform list manually if needed, 
                // or maybe the category name in backup is slightly different.
                // Let's just log it for now.
                console.warn(`Missing URL mapping for Platform: ${platform}, Category: ${category}`);
                missingUrlCount++;
                // We can't insert without categoryUrl as per schema required: true
                // But maybe we can fake it or skip? User said "insert this data", implies "do your best".
                // But schema has required: true for categoryUrl.
                // Let's assume we skip or put a placeholder if we really have to, but better to skip and report.
                continue;
            }

            const { url: categoryUrl, officialCategory, officialSubCategory } = urlInfo;

            for (const product of products) {
                // Construct the document based on ProductSnapshot schema
                const doc = {
                    category: category,
                    subCategory: subCategory, // The backup has this, keep it? Schema has subCategory.
                    categoryUrl: categoryUrl,
                    officialCategory: officialCategory,
                    officialSubCategory: officialSubCategory,
                    pincode: pincode,
                    platform: platform,
                    scrapedAt: TARGET_SCRAPED_AT,

                    productId: product.productId,
                    productName: product.productName,
                    productImage: product.productImage,
                    productWeight: product.productWeight,
                    productUrl: product.productUrl,
                    quantity: product.quantity, // backup might not have this?
                    combo: product.combo,
                    deliveryTime: product.deliveryTime,
                    isAd: product.isAd,
                    rating: product.rating,

                    currentPrice: product.currentPrice,
                    originalPrice: product.originalPrice,
                    discountPercentage: product.discountPercentage,

                    ranking: product.ranking,

                    isOutOfStock: product.isOutOfStock,

                    // These might be missing but are not required or have defaults
                    priceChange: 0,
                    discountChange: 0,
                    rankingChange: 0
                };

                productsToInsert.push(doc);
            }
        }

        console.log(`Prepared ${productsToInsert.length} documents for insertion.`);

        if (productsToInsert.length > 0) {
            // Use insertMany for efficiency, but maybe in chunks if too big
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < productsToInsert.length; i += CHUNK_SIZE) {
                const chunk = productsToInsert.slice(i, i + CHUNK_SIZE);
                try {
                    // ordered: false to continue inserting even if some fail (e.g. duplicates)
                    await ProductSnapshot.insertMany(chunk, { ordered: false });
                    successCount += chunk.length;
                    process.stdout.write(`\rInserted ${successCount} / ${productsToInsert.length}`);
                } catch (error) {
                    if (error.code === 11000) {
                        // Duplicate key error - likely some succeeded and some failed in the chunk
                        // With ordered: false, MongoDB inserts what it can.
                        // The error.result.nInserted tells us how many worked.
                        successCount += error.result.nInserted;
                        failCount += error.writeErrors.length;
                    } else {
                        console.error('\nError inserting chunk:', error);
                        failCount += chunk.length; // Assume all failed if not duplicate error (simplified)
                    }
                }
            }
        }

        console.log('\nRestoration complete.');
        console.log(`Successfully inserted: ${successCount}`);
        console.log(`Failed (duplicates/errors): ${failCount}`);
        console.log(`Skipped categories due to missing URL: ${missingUrlCount}`);

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

restoreData();
