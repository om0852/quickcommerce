const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
// Custom env loader since dotenv is not in package.json
function loadEnv(filePath) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...values] = trimmed.split('=');
                if (key && values.length > 0) {
                    const val = values.join('=').trim().replace(/(^"|"$)/g, ''); // Simple quote removal
                    process.env[key.trim()] = val;
                }
            }
        });
    }
}

// Load env vars
loadEnv(path.join(process.cwd(), '.env.local'));
if (!process.env.MONGODB_URI) {
    loadEnv(path.join(process.cwd(), '.env'));
}

const LOG_FILE_PATH = 'd:\\creatosaurus-intership\\quickcommerce\\local-scraper-service\\logs\\blinkit_201303_Bath___Body_2026-01-03T13-49-25-465Z.json';
const TARGET_TIMESTAMP_STR = '2026-01-03T13:41:55.126+00:00';

// Define Schema Inline to avoid ESM import issues in raw Node script
const ProductSnapshotSchema = new mongoose.Schema({
    category: { type: String, required: true, index: true },
    subCategory: { type: String, required: false },
    categoryUrl: { type: String, required: true },
    officialCategory: String,
    officialSubCategory: String,
    pincode: { type: String, required: true, index: true },
    platform: { type: String, required: true, enum: ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart'], index: true },
    scrapedAt: { type: Date, required: true, default: Date.now, index: true },
    productId: { type: String, required: true },
    skuId: String,
    variant: String,
    brand: String,
    availability: String,
    savings: Number,
    productName: { type: String, required: true },
    productImage: String,
    productWeight: String,
    quantity: String,
    combo: String,
    deliveryTime: String,
    isAd: { type: Boolean, default: false },
    rating: Number,
    currentPrice: { type: Number, required: true },
    originalPrice: Number,
    discountPercentage: Number,
    ranking: { type: Number, required: true },
    priceChange: { type: Number, default: 0 },
    discountChange: { type: Number, default: 0 },
    rankingChange: { type: Number, default: 0 },
    isOutOfStock: { type: Boolean, default: false },
    productUrl: String,
    lastComparedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductSnapshot' }
}, { timestamps: true });

// Prevent overwriting model if it exists (unlikely in script but good practice)
const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema);

async function backfillCombo() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        if (!fs.existsSync(LOG_FILE_PATH)) {
            throw new Error(`Log file not found at ${LOG_FILE_PATH}`);
        }
        const rawData = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
        const jsonContent = JSON.parse(rawData);
        const products = jsonContent.products;

        console.log(`📄 Found ${products.length} products in log file.`);

        const targetDate = new Date(TARGET_TIMESTAMP_STR);
        console.log(`🕒 Targeting: ${targetDate.toISOString()}`);

        let updatedCount = 0;
        let notFoundCount = 0;

        for (const logProduct of products) {
            const result = await ProductSnapshot.updateOne(
                {
                    platform: 'blinkit',
                    productId: logProduct.id,
                    pincode: jsonContent.pincode,
                    scrapedAt: targetDate
                },
                {
                    $set: { combo: logProduct.combo }
                }
            );

            if (result.matchedCount > 0) {
                updatedCount++;
            } else {
                notFoundCount++;
            }
        }

        console.log('==========================================');
        console.log(`🎉 Backfill Complete`);
        console.log(`✅ Matched/Updated: ${updatedCount}`);
        console.log(`⚠️ Not Found in DB: ${notFoundCount}`);
        console.log('==========================================');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

backfillCombo();
