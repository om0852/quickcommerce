import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function exportSnapshots() {
    try {
        const { default: dbConnect } = await import('./lib/mongodb.js');
        const { default: ProductSnapshot } = await import('./models/ProductSnapshot.js');

        await dbConnect();
        console.log('✅ Connected to MongoDB');

        const QUERY = {
            pincode: '201303',
            scrapedAt: new Date('2026-01-09T14:30:00.000Z')
        };
        const OUTPUT_FILE = 'exported_snapshots_201303.json';

        console.log(`🔍 Querying:`, QUERY);

        const results = await ProductSnapshot.find(QUERY).lean();

        console.log(`✅ Found ${results.length} documents.`);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        console.log(`💾 Saved to ${OUTPUT_FILE}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

exportSnapshots();
