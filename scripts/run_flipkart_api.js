
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Service Modules
// Adjust paths assuming script is in /scripts and service is in /local-scraper-service
const SERVICE_DIR = path.resolve(__dirname, '../local-scraper-service');
const ENV_PATH = path.join(SERVICE_DIR, '.env');

// Check paths
if (!fs.existsSync(ENV_PATH)) {
    console.error(`❌ .env not found at ${ENV_PATH}`);
    process.exit(1);
}

// Load Env
dotenv.config({ path: ENV_PATH });

// Now import the rest which might depend on Env
// We need to use dynamic imports or ensure these files don't fail immediately on load
const { callFlipkartScraper } = await import('../local-scraper-service/utils/localScraperClient.js');
const { processAndSaveProducts } = await import('../local-scraper-service/utils/dataProcessor.js');
const dbConnect = (await import('../local-scraper-service/config/db.js')).default;

// Configuration
const SCRAPED_AT = new Date('2026-01-09T14:30:00.000+00:00');
const PINCODES = ['400706', '201303'];
const CATEGORIES_FILE = path.join(SERVICE_DIR, 'utils', 'categories_with_urls.json');

async function main() {
    console.log('🚀 Starting Manual Flipkart Scraper');
    console.log(`📅 Scraped At: ${SCRAPED_AT.toISOString()}`);
    console.log(`📌 Pincodes: ${PINCODES.join(', ')}`);

    // Connect DB
    await dbConnect();
    console.log('✅ MongoDB Connected');

    // Load Categories
    if (!fs.existsSync(CATEGORIES_FILE)) {
        throw new Error(`Categories file not found: ${CATEGORIES_FILE}`);
    }
    const categoriesData = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));

    // Process
    let foundStartCategory = false;
    const START_CATEGORY = "Personal Care";

    for (const [rootCategoryName, platforms] of Object.entries(categoriesData)) {
        if (!foundStartCategory) {
            if (rootCategoryName === START_CATEGORY) {
                foundStartCategory = true;
                console.log(`⏩ Resuming from: ${rootCategoryName}`);
            } else {
                console.log(`⏩ Skipping completed category: ${rootCategoryName}`);
                continue;
            }
        }
        const flipkartUrls = platforms.flipkart; // Using correct key 'flipkart'

        if (!flipkartUrls || !Array.isArray(flipkartUrls) || flipkartUrls.length === 0) {
            continue;
        }

        console.log(`\n📦 Category: ${rootCategoryName} (Found ${flipkartUrls.length} URLs)`);

        // Map data for scraper function
        // callFlipkartScraper expects array of objects with {name, url}
        // Our JSON usually has {name, url, officialCategory...}
        // localScraperClient expects 'categories' param which it iterates.
        // It uses 'category.name' and 'category.url'.

        // Let's filter/map correctly
        const categoriesForScraper = flipkartUrls.map(u => ({
            name: u.name || u.officialSubCategory || 'Unknown',
            url: u.url,
            // Pass through other props if needed by saving logic?
            // The scraper uses name/url.
            // But we need officialCategory/officialSubCategory for SAVING potentially.
            // But 'processAndSaveProducts' takes 'scraperResponse' and 'officialCategory' as args.
            // Since we are batching, we might lose per-url granularity in the saver call unless
            // the product itself has it. 
            // We will pass the whole object just in case scraper is updated later, 
            // but strict contract is name/url.
            ...u
        }));

        for (const pincode of PINCODES) {
            console.log(`\n📍 Pincode: ${pincode}`);

            try {
                // Call Scraper
                const response = await callFlipkartScraper(pincode, categoriesForScraper, rootCategoryName);

                if (response.success) {
                    console.log(`   ✅ Scraper Success! Found ${response.products.length} products.`);

                    // Save
                    // implementation note: server.js uses "General"/"Bulk" for bulk scrapers.
                    // We'll mimic that.
                    const saveStats = await processAndSaveProducts(
                        response,
                        rootCategoryName,
                        "General", // subCategory
                        "Bulk",    // categoryUrl
                        SCRAPED_AT,
                        null,      // officialCategory
                        null       // officialSubCategory
                    );

                    console.log(`   💾 Saved: ${saveStats.saved}, Errors: ${saveStats.errors}`);
                } else {
                    console.error(`   ❌ Scraper Failed for ${rootCategoryName}: ${response.error}`);
                }

            } catch (err) {
                console.error(`   ❌ Unexpected Error: ${err.message}`);
            }
        }
    }

    console.log('\n✅ Script Completed');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
