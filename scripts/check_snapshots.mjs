
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) process.exit(1);

const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', new mongoose.Schema({}, { strict: false }));

async function run() {
    await mongoose.connect(MONGODB_URI);

    const total = await ProductSnapshot.countDocuments({ category: 'Fruits & Vegetables', pincode: '201303' });
    console.log(`MATCHING_DOCS: ${total}`);

    const dates = await ProductSnapshot.distinct('scrapedAt', { category: 'Fruits & Vegetables', pincode: '201303' });
    console.log(`DATES: ${JSON.stringify(dates)}`);

    await mongoose.disconnect();
}

run();
