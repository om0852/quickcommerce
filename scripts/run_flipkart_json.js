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
}

// Load Env
dotenv.config({ path: ENV_PATH });

// Dynamic import for service modules
const { callFlipkartScraper } = await import('../local-scraper-service/utils/localScraperClient.js');

// Configuration
const SCRAPED_AT = new Date().toISOString();
const PINCODES = ['201014', '122008', '122010', '122016'];
const CATEGORIES_FILE = path.join(SERVICE_DIR, 'utils', 'categories_with_urls.json');
const OUTPUT_FILE = path.join(__dirname, 'flipkart_minutes_results.json');

async function main() {
    console.log('🚀 Starting Manual Flipkart Scraper (JSON Output)');
    console.log(`📅 Scraped At: ${SCRAPED_AT}`);
    console.log(`📌 Pincodes: ${PINCODES.join(', ')}`);
    console.log(`📂 Output File: ${OUTPUT_FILE}`);

    // Load Categories
    if (!fs.existsSync(CATEGORIES_FILE)) {
        throw new Error(`Categories file not found: ${CATEGORIES_FILE}`);
    }
    const categoriesData = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));

    // Initialize output file if not exists
    if (!fs.existsSync(OUTPUT_FILE)) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2));
    }

    let allResults = [];
    // Load existing results to append? unique constraint? 
    // For now we will append to array in memory and rewrite file periodically or at end.
    // Better: Read existing, append new.
    try {
        const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        if (Array.isArray(existing)) {
            allResults = existing;
        }
    } catch (e) {
        console.warn('⚠️ Could not read existing output file, starting fresh.');
    }

    for (const [rootCategoryName, platforms] of Object.entries(categoriesData)) {
        const flipkartUrls = platforms.flipkart;

        if (!flipkartUrls || !Array.isArray(flipkartUrls) || flipkartUrls.length === 0) {
            continue;
        }

        console.log(`\n📦 Category: ${rootCategoryName} (Found ${flipkartUrls.length} URLs)`);

        const categoriesForScraper = flipkartUrls.map(u => ({
            name: u.name || u.officialSubCategory || 'Unknown',
            url: u.url,
            ...u
        }));

        for (const pincode of PINCODES) {
            console.log(`\n📍 Pincode: ${pincode}`);

            try {
                // Call Scraper
                const response = await callFlipkartScraper(pincode, categoriesForScraper, rootCategoryName);

                if (response.success) {
                    console.log(`   ✅ Scraper Success! Found ${response.products.length} products.`);

                    // Add metadata and push to results
                    const resultEntry = {
                        timestamp: SCRAPED_AT,
                        pincode: pincode,
                        rootCategory: rootCategoryName,
                        products: response.products
                    };

                    allResults.push(resultEntry);

                    // Specific requirement: Store result in json file
                    // We rewrite the file after every successful scrape to save progress
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
                    console.log(`   💾 Saved to JSON file.`);

                } else {
                    console.error(`   ❌ Scraper Failed for ${rootCategoryName}: ${response.error}`);
                    // Log failure to file?
                    allResults.push({
                        timestamp: SCRAPED_AT,
                        pincode: pincode,
                        rootCategory: rootCategoryName,
                        error: response.error,
                        products: []
                    });
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
                }

            } catch (err) {
                console.error(`   ❌ Unexpected Error: ${err.message}`);
                allResults.push({
                    timestamp: SCRAPED_AT,
                    pincode: pincode,
                    rootCategory: rootCategoryName,
                    error: err.message,
                    products: []
                });
                fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
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
