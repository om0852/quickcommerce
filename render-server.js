import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

// Set up MongoDB connection
async function dbConnect() {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB Connected for Render Worker");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
    }
}

// Minimal Schemas needed for the aggregation
const productSnapshotSchema = new mongoose.Schema({
    platform: String,
    productId: String,
    scrapedAt: Date,
    pincode: String
}, { strict: false });

const productGroupingSchema = new mongoose.Schema({
    category: String,
    brandId: String,
    brand: String,
    products: Array
}, { strict: false });

const overviewCacheSchema = new mongoose.Schema({
    pincode: String,
    data: Array,
    lastUpdated: Date
}, { strict: false });

const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', productSnapshotSchema);
const ProductGrouping = mongoose.models.ProductGrouping || mongoose.model('ProductGrouping', productGroupingSchema);
const OverviewCache = mongoose.models.OverviewCache || mongoose.model('OverviewCache', overviewCacheSchema);

const PINCODE_OPTIONS = ['201303', '400706', '201014', '122008', '122010', '122016', '400070', '400703', '401101', '401202'];

async function generateOverviewForPincode(pincode, groupMap) {
    const pipeline = [
        { $match: { pincode: pincode } },
        {
            $group: {
                _id: {
                    platform: { $toLower: "$platform" },
                    productId: "$productId",
                    scrapedAt: "$scrapedAt"
                }
            }
        }
    ];

    const uniqueSnapsFromDb = await ProductSnapshot.aggregate(pipeline);

    const maxTimePerCategory = new Map();
    const snapCategoryInfo = [];

    for (const snap of uniqueSnapsFromDb) {
        const { platform, productId, scrapedAt } = snap._id;
        const key = `${platform}:${productId}`;
        const groupInfo = groupMap.get(key);
        if (!groupInfo) continue;

        const { category } = groupInfo;
        const curMax = maxTimePerCategory.get(category);
        if (!curMax || new Date(scrapedAt) > new Date(curMax)) {
            maxTimePerCategory.set(category, scrapedAt);
        }
        snapCategoryInfo.push({ ...snap._id, category, brandId: groupInfo.brandId });
    }

    const aggregated = {};
    const seenBaseIds = new Set();

    for (const snap of snapCategoryInfo) {
        const { platform, productId, scrapedAt, category, brandId } = snap;

        if (scrapedAt.toString() !== maxTimePerCategory.get(category)?.toString()) {
            continue;
        }

        const baseId = productId.includes('__') ? productId.split('__')[0] : productId;
        const aggKey = `${category}_${platform}`;
        const dedupKey = `${aggKey}_${baseId}`;

        if (!aggregated[aggKey]) {
            aggregated[aggKey] = {
                category,
                platform,
                count: 0,
                brands: new Set(),
                latestScrapedAt: scrapedAt
            };
        }

        if (!seenBaseIds.has(dedupKey)) {
            aggregated[aggKey].count++;
            seenBaseIds.add(dedupKey);
        }

        if (brandId && brandId.toLowerCase() !== 'n/a' && brandId !== '') {
            aggregated[aggKey].brands.add(brandId.toLowerCase());
        }
    }

    return Object.values(aggregated).map(data => ({
        ...data,
        brandCount: data.brands.size
    }));
}

async function runGenerations() {
    console.log(`[${new Date().toISOString()}] Starting Background Overview Generation...`);
    try {
        await dbConnect();

        const groupings = await ProductGrouping.find({}).lean();
        const groupMap = new Map();
        for (const g of groupings) {
            if (!g.products) continue;
            for (const p of g.products) {
                const key = `${p.platform.toLowerCase()}:${p.productId}`;
                groupMap.set(key, { category: g.category, brandId: g.brandId || g.brand || 'N/A' });
            }
        }

        for (const pincode of PINCODE_OPTIONS) {
            try {
                const data = await generateOverviewForPincode(pincode, groupMap);

                await OverviewCache.findOneAndUpdate(
                    { pincode: pincode },
                    { data: data, lastUpdated: new Date() },
                    { upsert: true, new: true }
                );

                console.log(`✅ Cached overview for ${pincode}: ${data.length} rows`);
            } catch (err) {
                console.error(`❌ Error caching ${pincode}:`, err);
            }
        }
        console.log(`[${new Date().toISOString()}] Background Overview Generation Complete.`);
    } catch (err) {
        console.error("Overview Runner Error:", err);
    }
}

// 1. Set up Express endpoint so Render stays alive and can be triggered
app.get('/trigger-overview', (req, res) => {
    console.log("Trigger received. Spawning background task.");
    // Fire and forget (won't be killed on Render since it's an actual Node process)
    runGenerations().catch(console.error);

    // Instantly return
    res.status(200).json({
        success: true,
        message: "Background processing started. Render container will process this without timeouts."
    });
});

app.get('/ping', (req, res) => {
    res.status(200).send("pong");
});

app.get('/', (req, res) => {
    res.send("Render Cron Server is running");
});

// Internal Cron Setup
import cron from 'node-cron';

// Run overview every 6 hours automatically
cron.schedule('0 */6 * * *', () => {
    console.log(`[Cron] Scheduled overview generation started at ${new Date().toISOString()}`);
    runGenerations().catch(console.error);
}, { timezone: 'Asia/Kolkata' });

// Keep-Alive Ping every 20 seconds
cron.schedule('*/20 * * * * *', async () => {
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    try {
        await fetch(url + '/ping');
        // console.log(`[Keep-Alive] Pinged ${url} successfully at ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    } catch (err) {
        console.error(`[Keep-Alive] Ping failed:`, err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Internal Cron is active: Overview runs 0 */6 * * *`);
    console.log(`Internal Keep-Alive active: Pinging every 20 seconds`);
    console.log(`Trigger manually via: GET /trigger-overview`);
});
