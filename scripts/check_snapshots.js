
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Try .env.local first, or .env

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('No MONGODB_URI found. Please make sure .env.local or .env exists with the URI.');
    process.exit(1);
}

const productSnapshotSchema = new mongoose.Schema({
    scrapedAt: Date,
    category: String,
    pincode: String,
    platform: String
}, { strict: false });

const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', productSnapshotSchema);

async function checkSnapshots() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const filter = { category: 'Fruits & Vegetables', pincode: '201303' };
        console.log('Checking for snapshots with filter:', filter);

        const count = await ProductSnapshot.countDocuments(filter);
        console.log(`Total documents matching filter: ${count}`);

        const distinctDates = await ProductSnapshot.distinct('scrapedAt', filter);
        console.log('Distinct scrapedAt dates:', distinctDates);

        // Also check global stats
        const total = await ProductSnapshot.countDocuments({});
        console.log(`Total documents in collection: ${total}`);

        if (total > 0 && count === 0) {
            // Find what categories/pincodes exist
            const cats = await ProductSnapshot.distinct('category');
            console.log('Available Categories:', cats);
            const pins = await ProductSnapshot.distinct('pincode');
            console.log('Available Pincodes:', pins);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkSnapshots();
