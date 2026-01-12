import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust paths
const SERVICE_DIR = path.resolve(__dirname, '../local-scraper-service');
const ENV_PATH = path.join(SERVICE_DIR, '.env');

// Check paths
if (!fs.existsSync(ENV_PATH)) {
    console.error(`❌ .env not found at ${ENV_PATH}`);
    process.exit(1);
} else {
    console.log(`✅ Found .env at ${ENV_PATH}`);
}

// Load Env
dotenv.config({ path: ENV_PATH });

// Configuration
const TARGET_SCRAPED_AT = new Date('2026-01-09T14:30:00.000+00:00');
const INPUT_FILE = path.join(__dirname, 'flipkart_minutes_results.json');

async function main() {
    console.log('🚀 Starting Data Insertion Script');
    console.log(`📅 Target Scraped At: ${TARGET_SCRAPED_AT.toISOString()}`);
    console.log(`📂 Input File: ${INPUT_FILE}`);

    try {
        console.log('🔌 Importing dbConnect...');
        const dbConnect = (await import('../local-scraper-service/config/db.js')).default;
        console.log('🔌 Importing dataProcessor...');
        const { processAndSaveProducts } = await import('../local-scraper-service/utils/dataProcessor.js');

        // Connect DB
        console.log('⏳ Connecting to MongoDB...');
        await dbConnect();
        console.log('✅ MongoDB Connected');

        if (!fs.existsSync(INPUT_FILE)) {
            throw new Error(`Input file not found: ${INPUT_FILE}`);
        }

        const stats = fs.statSync(INPUT_FILE);
        console.log(`📄 Input file size: ${stats.size} bytes`);

        const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');
        const results = JSON.parse(fileContent);
        console.log(`🔍 Found ${results.length} entries in json file`);

        let totalSaved = 0;
        let totalErrors = 0;

        for (const entry of results) {
            if (!entry.products || entry.products.length === 0) {
                console.log(`Skipping empty entry for ${entry.pincode} - ${entry.rootCategory}`);
                continue;
            }

            const scraperResponse = {
                platform: 'flipkartMinutes',
                pincode: entry.pincode,
                products: entry.products
            };

            const rootCategoryName = entry.rootCategory;

            try {
                const stats = await processAndSaveProducts(
                    scraperResponse,
                    rootCategoryName,
                    "General", // Default subCategory
                    "Bulk",    // Default categoryUrl
                    TARGET_SCRAPED_AT,
                    null,      // officialCategory
                    null       // officialSubCategory
                );

                totalSaved += stats.saved;
                totalErrors += stats.errors;

            } catch (err) {
                console.error(`❌ Failed processing batch: ${err.message}`);
            }
        }

        console.log(`\n✅ Insertion Completed.`);
        console.log(`   Total Saved/Upserted: ${totalSaved}`);
        console.log(`   Total Errors: ${totalErrors}`);

        process.exit(0);

    } catch (err) {
        console.error('❌ Critical Error in main execution flow:', err);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
