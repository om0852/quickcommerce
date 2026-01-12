
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust paths to service dir
const SERVICE_DIR = path.resolve(__dirname, '../local-scraper-service');
const ENV_PATH = path.join(SERVICE_DIR, '.env');

// Load Env
dotenv.config({ path: ENV_PATH });

// Dynamic imports
const dbConnect = (await import('../local-scraper-service/config/db.js')).default;
const { getUrlsGroupedByCategory, getStats } = await import('../local-scraper-service/utils/categoryLoader.js');
const {
    callZeptoScraper,
    callBlinkitScraper,
    callJiomartScraper,
    callInstamartScraper,
    callFlipkartScraper
} = await import('../local-scraper-service/utils/localScraperClient.js');
const { ScrapeTracker } = await import('../local-scraper-service/utils/scrapeTracker.js');
const ScraperLog = (await import('../local-scraper-service/models/ScraperLog.js')).default;
const { saveToLocalFile } = await import('../local-scraper-service/utils/fileSaver.js');

async function main() {
    console.log('🚀 Starting Specific Pincode Scraper (122016)');

    // Connect DB
    try {
        await dbConnect();
        console.log('✅ MongoDB Connected');
    } catch (e) {
        console.log('⚠️ MongoDB connection failed, proceeding offline.');
    }

    const scrapedAt = new Date(); // Current time
    const targetPincodes = ['122016'];
    const tracker = new ScrapeTracker(scrapedAt);

    console.log(`📅 Started at: ${scrapedAt.toLocaleString()}`);
    console.log(`📌 Pincodes: ${targetPincodes.join(', ')}`);

    const categoriesGrouped = getUrlsGroupedByCategory();

    // We don't have pendingSaves implementation here like server.js, 
    // we'll simpler wait or just fire and forget if saveToLocalFile is sufficient?
    // server.js had logic for background saving.
    // For this standalone script, let's await the results to be safe.

    const results = {
        totalProductsSaved: 0,
        totalErrors: 0,
        categoriesProcessed: 0
    };

    for (const [categoryName, urls] of Object.entries(categoriesGrouped)) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📦 Category: ${categoryName}`);
        console.log(`   URLs: ${urls.length}`);
        console.log(`${'='.repeat(80)}`);

        // Group URLs by platform
        const platformGroups = { zepto: [], blinkit: [], jiomart: [], instamart: [], flipkart: [] };
        urls.forEach(urlData => {
            if (platformGroups[urlData.platform]) {
                platformGroups[urlData.platform].push(urlData);
            } else if (urlData.platform === 'flipkart') {
                platformGroups.flipkart.push(urlData);
            }
        });

        for (const pincode of targetPincodes) {
            console.log(`\n📍 Processing pincode: ${pincode}`);

            // PHASE 1: Zepto, Jio, Instamart
            const parallelTasks = [];

            if (platformGroups.zepto.length > 0) {
                const zeptoUrls = platformGroups.zepto.map(u => ({ name: u.subCategory, url: u.categoryUrl }));
                console.log(`\n🔹 ZEPTO: ${zeptoUrls.length} subcategories`);
                parallelTasks.push(callZeptoScraper(pincode, zeptoUrls, categoryName).then(r => ({ ...r, p: 'zepto' })));
            }

            if (platformGroups.jiomart.length > 0) {
                const jioUrls = platformGroups.jiomart.map(u => ({ name: u.subCategory, url: u.categoryUrl }));
                console.log(`\n🔹 JIOMART: ${jioUrls.length} subcategories`);
                parallelTasks.push(callJiomartScraper(pincode, jioUrls, categoryName).then(r => ({ ...r, p: 'jiomart' })));
            }

            if (platformGroups.instamart.length > 0) {
                const instaUrls = platformGroups.instamart.map(u => ({ name: u.subCategory, url: u.categoryUrl }));
                console.log(`\n🔹 INSTAMART: ${instaUrls.length} subcategories`);
                parallelTasks.push(callInstamartScraper(pincode, instaUrls, categoryName).then(r => ({ ...r, p: 'instamart' })));
            }

            if (parallelTasks.length > 0) {
                console.log(`\n⚡ Executing ${parallelTasks.length} platforms IN PARALLEL...`);
                const outcomes = await Promise.allSettled(parallelTasks);

                for (const res of outcomes) {
                    if (res.status === 'fulfilled') {
                        const response = res.value;
                        if (response.success) {
                            console.log(`   ✅ ${response.p}: Success (${response.products?.length} items)`);

                            // Save to file (Offline mode style)
                            await saveToLocalFile({
                                platform: response.platform,
                                pincode: pincode,
                                category: categoryName,
                                scrapedAt: scrapedAt,
                                products: response.products
                            });
                            results.totalProductsSaved += (response.products?.length || 0);

                        } else {
                            console.error(`   ❌ ${response.p}: Failed - ${response.error}`);
                            results.totalErrors++;
                        }
                    } else {
                        console.error(`   ❌ Task Crashed: ${res.reason}`);
                        results.totalErrors++;
                    }
                }
            }

            // PHASE 2: Blinkit, Flipkart
            const phase2Tasks = [];

            if (platformGroups.blinkit.length > 0) {
                const blinkitUrls = platformGroups.blinkit.map(u => ({ name: u.subCategory, url: u.categoryUrl }));
                console.log(`\n🔹 BLINKIT: ${blinkitUrls.length} subcategories`);
                phase2Tasks.push(callBlinkitScraper(pincode, blinkitUrls, categoryName).then(r => ({ ...r, p: 'blinkit' })));
            }

            if (platformGroups.flipkart.length > 0) {
                const flipUrls = platformGroups.flipkart.map(u => ({ name: u.subCategory, url: u.categoryUrl }));
                console.log(`\n🔹 FLIPKART: ${flipUrls.length} subcategories`);
                phase2Tasks.push(callFlipkartScraper(pincode, flipUrls, categoryName).then(r => ({ ...r, p: 'flipkart' })));
            }

            if (phase2Tasks.length > 0) {
                console.log(`\n⚡ Executing ${phase2Tasks.length} platforms IN PARALLEL (Phase 2)...`);
                const outcomes = await Promise.allSettled(phase2Tasks);
                for (const res of outcomes) {
                    if (res.status === 'fulfilled') {
                        const response = res.value;
                        if (response.success) {
                            console.log(`   ✅ ${response.p}: Success (${response.products?.length} items)`);
                            await saveToLocalFile({
                                platform: response.platform,
                                pincode: pincode,
                                category: categoryName,
                                scrapedAt: scrapedAt,
                                products: response.products
                            });
                            results.totalProductsSaved += (response.products?.length || 0);
                        } else {
                            console.error(`   ❌ ${response.p}: Failed - ${response.error}`);
                            results.totalErrors++;
                        }
                    } else {
                        console.error(`   ❌ Task Crashed: ${res.reason}`);
                        results.totalErrors++;
                    }
                }
            }
        }
    }

    console.log(`\n✅ Completed. Total Saved: ${results.totalProductsSaved}, Errors: ${results.totalErrors}`);
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
