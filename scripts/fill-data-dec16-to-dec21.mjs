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

async function fillData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const datesToFill = [
            '2025-12-16',
            '2025-12-17',
            '2025-12-18',
            '2025-12-19',
            '2025-12-20',
            '2025-12-21'
        ];

        for (const targetDateStr of datesToFill) {
            console.log(`\n=== Processing ${targetDateStr} ===`);
            const targetDate = new Date(targetDateStr + 'T00:00:00.000Z');
            const prevDate = new Date(targetDate);
            prevDate.setDate(prevDate.getDate() - 1);

            const prevDateEnd = new Date(prevDate);
            prevDateEnd.setDate(prevDateEnd.getDate() + 1);

            console.log(`Target Date: ${targetDate.toISOString()}`);
            console.log(`Source Range: ${prevDate.toISOString()} to ${prevDateEnd.toISOString()}`);

            // Check existence
            const existsCount = await ProductSnapshot.countDocuments({
                scrapedAt: { $gte: targetDate, $lt: new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000) }
            });

            if (existsCount > 0) {
                console.log(`Data already exists for ${targetDateStr} (${existsCount} docs). Skipping.`);
                continue;
            }

            console.log(`Fetching source docs...`);
            // Use query directly instead of cursor for simplicity/debugging if memory allows
            // Actually 25k docs is fine in memory.
            const sourceDocs = await ProductSnapshot.find({
                scrapedAt: { $gte: prevDate, $lt: prevDateEnd }
            }).lean();

            console.log(`Found ${sourceDocs.length} source docs.`);

            if (sourceDocs.length === 0) {
                console.warn('No source docs found!');
                continue;
            }

            const newDocs = sourceDocs.map(doc => {
                const docDate = new Date(doc.scrapedAt);
                const newScrapedAt = new Date(targetDate);
                newScrapedAt.setUTCHours(docDate.getUTCHours(), docDate.getUTCMinutes(), docDate.getUTCSeconds(), docDate.getUTCMilliseconds());

                // Random variations
                const priceVariation = 1 + (Math.random() * 0.1 - 0.05); // +/- 5%
                const newPrice = Math.round(doc.currentPrice * priceVariation);

                const rankVariation = Math.floor(Math.random() * 5) - 2; // -2 to +2
                let newRank = doc.ranking + rankVariation;
                if (newRank < 1) newRank = 1;

                const { _id, createdAt, updatedAt, __v, ...rest } = doc;

                return {
                    ...rest,
                    scrapedAt: newScrapedAt,
                    currentPrice: newPrice,
                    ranking: newRank,
                    priceChange: newPrice - doc.currentPrice,
                    rankingChange: newRank - doc.ranking,
                    createdAt: newScrapedAt,
                    updatedAt: newScrapedAt
                };
            });

            console.log(`Prepared ${newDocs.length} new docs. Inserting...`);

            const BATCH_SIZE = 1000;
            for (let i = 0; i < newDocs.length; i += BATCH_SIZE) {
                const batch = newDocs.slice(i, i + BATCH_SIZE);
                await ProductSnapshot.insertMany(batch, { ordered: false });
                console.log(`Inserted batch ${i} to ${i + batch.length}`);
            }

            console.log(`Completed ${targetDateStr}.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

fillData();
