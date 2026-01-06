const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
const ProductSnapshot = require('../models/ProductSnapshot');

async function debugStockData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Fetch a few recent snapshots to check structure
        const snapshots = await ProductSnapshot.find({}).sort({ scrapedAt: -1 }).limit(5);
        console.log('--- raw snapshots sample ---');
        snapshots.forEach(s => {
            console.log(`Platform: ${s.platform}, Name: ${s.productName}, isOutOfStock: ${s.isOutOfStock}, Type: ${typeof s.isOutOfStock}`);
        });

        if (snapshots.length === 0) {
            console.log('No snapshots found.');
            return;
        }

        const sampleSnap = snapshots[0];
        const pincode = sampleSnap.pincode;
        // Use a product name from the sample
        const testName = sampleSnap.productName;
        console.log(`\nTesting History Logic for Product: "${testName}" in Pincode: ${pincode}`);

        // 2. Simulate API Logic
        const criteria = [
            { platform: 'zepto', productName: testName, pincode },
            { platform: 'blinkit', productName: testName, pincode },
            { platform: 'jiomart', productName: testName, pincode },
            { platform: 'flipkartMinutes', productName: testName, pincode }
        ];

        // Fetch history snapshots
        // Note: In the real API we match loosely, here we simulate the exact fetch for simplicity first
        // We'll just fetch based on the raw snapshots we found to ensure we get hits
        const foundSnapshots = await ProductSnapshot.find({
            pincode: pincode,
            productName: testName
        }).sort({ scrapedAt: 1 });

        console.log(`Found ${foundSnapshots.length} history snapshots for this product.`);

        const historyMap = new Map();

        foundSnapshots.forEach(snap => {
            const date = new Date(snap.scrapedAt);
            date.setSeconds(0, 0);
            const key = date.toISOString();

            if (!historyMap.has(key)) {
                historyMap.set(key, { date: key });
            }

            const entry = historyMap.get(key);

            // The Logic from route.js
            entry[`${snap.platform}Stock`] = snap.isOutOfStock;
        });

        const history = Array.from(historyMap.values());
        console.log('\n--- Processed History Entry Sample ---');
        if (history.length > 0) {
            console.log(JSON.stringify(history[history.length - 1], null, 2));
        } else {
            console.log('History empty.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debugStockData();
