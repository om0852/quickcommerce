const mongoose = require('mongoose');
const { mergeProductsAcrossPlatforms } = require('../lib/productMatching');

// We need to load env vars for DB connection
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
    require('dotenv').config({ path: '.env' });
}

// Minimal Schema definition to read from DB (since importing the model might be tricky with ESM/CommonJS mixing)
// Actually we can try to use the raw collection access to avoid model compilation issues in a standalone script if needed.
// But let's try standard mongoose first. Since the project uses ESM (import/export), and this script is CommonJS, we can't easily import the model file if it uses 'export default'.
// The model file uses 'export default'. So we have to define schema here or use dynamic import which is async.

async function run() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Define schema temporarily for this script
        const ProductSnapshotSchema = new mongoose.Schema({}, { strict: false });
        const ProductSnapshot = mongoose.model('ProductSnapshot', ProductSnapshotSchema, 'productsnapshots');

        // Find the specific product user mentioned
        // productId: "95422"
        console.log('Searching for productId: 95422');
        const snapshots = await ProductSnapshot.find({ productId: "95422" }).sort({ scrapedAt: -1 }).limit(5);

        if (snapshots.length === 0) {
            console.log('No snapshots found for this productId.');
            // Try searching by name just in case
            const byName = await ProductSnapshot.findOne({ productName: /7UP Zero Sugar/ }).sort({ scrapedAt: -1 });
            if (byName) {
                console.log('Found by name:', byName.productName);
                snapshots.push(byName);
            } else {
                console.log('Could not find product in DB.');
                process.exit(0);
            }
        }

        console.log(`Found ${snapshots.length} snapshots. Analyzing latest one...`);
        const snap = snapshots[0];
        console.log('Snapshot Data ProductUrl:', snap.productUrl);
        console.log('Snapshot Data isAd:', snap.isAd);

        // Simulate API Logic
        const item = {
            productId: snap.productId,
            productName: snap.productName,
            productImage: snap.productImage,
            currentPrice: snap.currentPrice,
            originalPrice: snap.originalPrice,
            discountPercentage: snap.discountPercentage,
            ranking: snap.ranking,
            isOutOfStock: snap.isOutOfStock,
            productUrl: snap.productUrl, // This is how route.js extracts it
            deliveryTime: snap.deliveryTime,
            isAd: snap.isAd,
            combo: snap.combo
        };

        console.log('Item passed to merger:', item);

        // Run merger
        // We put this item in "blinkit" array (since user said platform: blinkit)
        const mockBlinkit = [item];

        console.log('Running mergeProductsAcrossPlatforms...');
        const merged = mergeProductsAcrossPlatforms([], mockBlinkit, [], [], [], []);

        const finalProduct = merged[0];
        if (!finalProduct) {
            console.error('Merger returned no products!');
        } else {
            console.log('Merged Product Blinkit Data:', finalProduct.blinkit);
            if (finalProduct.blinkit.productUrl) {
                console.log('✅ SUCCESS: productUrl is present in merged output:', finalProduct.blinkit.productUrl);
            } else {
                console.log('❌ FAILURE: productUrl is MISSING in merged output');
            }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

run();
