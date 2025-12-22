import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let value = parts.slice(1).join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env');
    process.exit(1);
}

const ProductSnapshotSchema = new mongoose.Schema({
    category: { type: String, required: true },
    pincode: { type: String, required: true },
    platform: { type: String, required: true, enum: ['zepto', 'blinkit', 'jiomart'] },
    scrapedAt: { type: Date, required: true, default: Date.now },
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
    productUrl: String,
    lastComparedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductSnapshot' }
}, { timestamps: true });

const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema);

async function duplicateData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const start = new Date('2025-12-20T00:00:00.000Z');
        const end = new Date('2025-12-21T00:00:00.000Z');

        console.log(`Fetching data from ${start.toISOString()} to ${end.toISOString()}...`);

        const sourceDocs = await ProductSnapshot.find({
            scrapedAt: { $gte: start, $lt: end }
        }).lean();

        console.log(`Found ${sourceDocs.length} documents.`);

        if (sourceDocs.length === 0) {
            console.log('No documents found to duplicate.');
            return;
        }

        const newDocs = sourceDocs.map(doc => {
            const newScrapedAt = new Date(doc.scrapedAt);
            newScrapedAt.setDate(newScrapedAt.getDate() + 1); // Add 1 day

            const { _id, createdAt, updatedAt, __v, ...rest } = doc;

            return {
                ...rest,
                scrapedAt: newScrapedAt,
                createdAt: newScrapedAt, // Optional: sync created/updated at too
                updatedAt: newScrapedAt
            };
        });

        console.log(`Prepared ${newDocs.length} new documents. Inserting...`);

        // Insert in batches
        const batchSize = 1000;
        for (let i = 0; i < newDocs.length; i += batchSize) {
            const batch = newDocs.slice(i, i + batchSize);
            await ProductSnapshot.insertMany(batch);
            console.log(`Inserted batch ${i} to ${i + batch.length}`);
        }

        console.log('Duplication complete!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

duplicateData();
