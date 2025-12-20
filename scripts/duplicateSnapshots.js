const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local because dotenv might not be a direct dependency
function loadEnv() {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                envVars[key] = value;
            }
        });
        return envVars;
    } catch (e) {
        console.error('Could not read .env.local file', e);
        return {};
    }
}

const env = loadEnv();
const MONGODB_URI = env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env.local');
    process.exit(1);
}

// Define Schema inline (copied from models/ProductSnapshot.js but adapted for CJS)
const ProductSnapshotSchema = new mongoose.Schema({
    category: { type: String, required: true, index: true },
    pincode: { type: String, required: true, index: true },
    platform: { type: String, required: true, enum: ['zepto', 'blinkit', 'jiomart'], index: true },
    scrapedAt: { type: Date, required: true, default: Date.now, index: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productImage: String,
    productWeight: String,
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
}, {
    timestamps: true
});

// Avoid recompiling if it already exists
const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema);

async function duplicateData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const mapping = [
            // Cycle 1: Dec 10-12
            { source: '2025-12-07', target: '2025-12-10' },
            { source: '2025-12-08', target: '2025-12-11' },
            { source: '2025-12-09', target: '2025-12-12' },

            // Cycle 2: Dec 13-15
            { source: '2025-12-07', target: '2025-12-13' },
            { source: '2025-12-08', target: '2025-12-14' },
            { source: '2025-12-09', target: '2025-12-15' },

            // Cycle 3: Dec 16-18
            { source: '2025-12-07', target: '2025-12-16' },
            { source: '2025-12-08', target: '2025-12-17' },
            { source: '2025-12-09', target: '2025-12-18' },

            // Cycle 4: Dec 19-20 (Partial cycle)
            { source: '2025-12-07', target: '2025-12-19' },
            { source: '2025-12-08', target: '2025-12-20' }
        ];

        const targetTimes = [
            { h: 0, m: 0 },   // 12am
            { h: 6, m: 0 },   // 6am
            { h: 12, m: 0 },  // 12pm
            { h: 18, m: 0 }   // 6pm
        ];

        for (const { source, target } of mapping) {
            const sourceStart = new Date(source);
            sourceStart.setHours(0, 0, 0, 0);
            const sourceEnd = new Date(source);
            sourceEnd.setHours(23, 59, 59, 999);

            console.log(`Processing ${source} -> ${target}`);

            // Fetch source data
            // To avoid massive duplicates, let's grab the "state of the day" by taking the latest snapshot per product
            // Or just grab all data? The user said "duplicate the dec 7,8,9 data".
            // If there are multiple scrapes on Dec 7, we should probably pick one representative set.
            // Let's pick the latest one for each product/platform/pincode tuple on that day.

            console.log(`Fetching data for ${source}...`);
            const sourceDocs = await ProductSnapshot.aggregate([
                {
                    $match: {
                        scrapedAt: { $gte: sourceStart, $lte: sourceEnd }
                    }
                },
                {
                    $sort: { scrapedAt: -1 } // Newest first
                },
                {
                    $group: {
                        _id: {
                            productId: "$productId",
                            platform: "$platform",
                            pincode: "$pincode",
                            category: "$category"
                        },
                        doc: { $first: "$$ROOT" } // Keep the newest doc
                    }
                },
                {
                    $replaceRoot: { newRoot: "$doc" }
                }
            ]);

            console.log(`Found ${sourceDocs.length} unique products for ${source}`);

            if (sourceDocs.length === 0) {
                console.log(`No data found for ${source}, skipping...`);
                continue;
            }

            const targetDateBase = new Date(target);

            let totalInserted = 0;

            for (const time of targetTimes) {
                const newScrapedAt = new Date(targetDateBase);
                newScrapedAt.setHours(time.h, time.m, 0, 0);

                const newDocs = sourceDocs.map(doc => {
                    const { _id, createdAt, updatedAt, __v, ...rest } = doc;
                    return {
                        ...rest,
                        scrapedAt: newScrapedAt
                    };
                });

                // Insert in batches
                try {
                    await ProductSnapshot.insertMany(newDocs, { ordered: false });
                    totalInserted += newDocs.length;
                    console.log(`  Inserted ${newDocs.length} records for ${target} at ${time.h}:00`);
                } catch (e) {
                    if (e.code === 11000) {
                        console.log(`  Some duplicates skipped for ${target} at ${time.h}:00`);
                    } else {
                        console.error(`  Error inserting for ${target} at ${time.h}:00`, e.message);
                    }
                }
            }
            console.log(`Completed duplication for ${source} -> ${target}. Total inserted: ${totalInserted}`);
        }

    } catch (err) {
        console.error('Error during execution:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed.');
    }
}

duplicateData();
