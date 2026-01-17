
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import ProductSnapshot from '../models/ProductSnapshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const TARGET_SCRAPED_AT = new Date('2026-01-09T14:30:00.000+00:00');

async function checkData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        const count = await ProductSnapshot.countDocuments({
            scrapedAt: TARGET_SCRAPED_AT
        });

        console.log(`Documents found with scrapedAt ${TARGET_SCRAPED_AT.toISOString()}: ${count}`);

        // Check one document to see if categoryUrl is populated
        const doc = await ProductSnapshot.findOne({ scrapedAt: TARGET_SCRAPED_AT });
        if (doc) {
            console.log('Sample document:', {
                category: doc.category,
                categoryUrl: doc.categoryUrl,
                platform: doc.platform
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
