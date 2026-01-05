import mongoose from 'mongoose';
import { mergeProductsAcrossPlatforms } from './temp_productMatching.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Handling __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

async function run() {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI not found in env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Define schema
        const ProductSnapshotSchema = new mongoose.Schema({}, { strict: false });
        // Use existing model if already compiled, or compile it
        const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema, 'productsnapshots');

        // Find the specific product user mentioned
        console.log('Searching for productId: 95422');
        const snapshots = await ProductSnapshot.find({ productId: "95422" }).sort({ scrapedAt: -1 }).limit(5);

        let snap;
        if (snapshots.length === 0) {
            console.log('No snapshots found for this productId.');
            const byName = await ProductSnapshot.findOne({ productName: /7UP/ }).sort({ scrapedAt: -1 });
            if (byName) {
                console.log('Found by name:', byName.productName);
                snap = byName;
            } else {
                console.log('Could not find product in DB.');
                process.exit(0);
            }
        } else {
            snap = snapshots[0];
        }

        console.log(`Analyzing snapshot for ${snap.productName}...`);
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

        // Run merger
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
