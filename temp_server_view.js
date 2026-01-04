/**
 * Local Scraper Service - Delhi NCR Edition
 * Uses local scraper services instead of Apify for Delhi NCR region
 * Platforms: Zepto, Blinkit, Jiomart (DMart & Instamart not available)
 */

import express from 'express';
import cron from 'node-cron';
import dotenv from 'dotenv';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dbConnect from './config/db.js';
import ScraperLog from './models/ScraperLog.js';
import {
    DELHI_NCR_PINCODES,
    getUrlsGroupedByCategory,
    getCategoriesForPlatform,
    getStats
} from './utils/categoryLoader.js';
import {
    callZeptoScraper,
    callBlinkitScraper,
    callJiomartScraper
} from './utils/localScraperClient.js';
import { processAndSaveProducts } from './utils/dataProcessor.js';

dotenv.config();

// Validate environment
if (!process.env.MONGODB_URI) {
    console.error('❌ Missing MONGODB_URI in .env file');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Scraping state
let isScraping = false;
let lastRunTime = null;
let nextRunTime = null;
let scrapingStats = {
    totalProductsSaved: 0,
    totalCategories: 0,
    lastDuration: 0
};

/**
 * Main scraping orchestrator
 * Groups URLs by category, calls local scrapers, and saves results
 */
async function runLocalScraperJob() {
    if (isScraping) {
        console.log('⚠️  Scraping already in progress, skipping...');
        return;
    }

    isScraping = true;
    // FIXED TIMESTAMP: 4 Jan 8 AM
    const scrapedAt = new Date('2026-01-04T08:00:00+05:30');
    lastRunTime = scrapedAt;

    console.log('\n' + '='.repeat(80));
    console.log('🚀 LOCAL SCRAPER SERVICE - STARTED');
    console.log('='.repeat(80));
    console.log(`📅 Started at: ${scrapedAt.toLocaleString()}`);
    console.log(`📍 Region: Delhi NCR`);
    console.log(`📌 Pincodes: ${DELHI_NCR_PINCODES.join(', ')}`);

    const stats = getStats();
    console.log(`\n📊 Configuration:`);
    console.log(`   Categories: ${stats.totalCategories}`);
    console.log(`   URLs: ${stats.totalUrls}`);
    console.log(`   Pincodes: ${stats.totalPincodes}`);
    console.log(`   Platforms: Zepto, Blinkit, Jiomart`);
    console.log(`   Total operations: ${stats.totalOperations}\n`);

    const results = {
        startTime: scrapedAt,
        totalProductsSaved: 0,
        totalErrors: 0,
        categoriesProcessed: 0
    };

    const scraperLog = new ScraperLog({
        status: 'running',
        config: {
            region: 'Delhi NCR',
            pincodes: DELHI_NCR_PINCODES,
            platforms: ['zepto', 'blinkit', 'jiomart'],
            categories: stats.totalCategories
        },
        stats: {
            totalUrls: stats.totalUrls
        },
        logs: []
    });

    try {
        await scraperLog.save();

        const categoriesGrouped = getUrlsGroupedByCategory();

        // [TESTING] Filter removed to scrape ALL categories
        /*
        for (const key of Object.keys(categoriesGrouped)) {
            if (!key.toLowerCase().includes('skincare')) {
                delete categoriesGrouped[key];
            }
        }
        */

        // Process each master category
        for (const [categoryName, urls] of Object.entries(categoriesGrouped)) {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`📦 Category: ${categoryName}`);
            console.log(`   URLs: ${urls.length}`);
            console.log(`${'='.repeat(80)}`);

            // Group URLs by platform
            const platformGroups = { zepto: [], blinkit: [], jiomart: [] };
            urls.forEach(urlData => {
                if (platformGroups[urlData.platform]) {
                    platformGroups[urlData.platform].push(urlData);
                }
            });

            // Process ONLY the first pincode
            const targetPincodes = [DELHI_NCR_PINCODES[0]];

            for (const pincode of targetPincodes) {
                console.log(`\n📍 Processing pincode: ${pincode}`);

                // Prepare all platform scraper calls
                // Prepare (but don't start) all platform scraper tasks
                const scraperTasks = [];

                // Zepto
                if (platformGroups.zepto && platformGroups.zepto.length > 0) {
                    const zeptoCategories = platformGroups.zepto.map(u => ({
                        name: u.subCategory,
                        url: u.categoryUrl
                    }));
                    console.log(`\n🔹 ZEPTO: ${zeptoCategories.length} subcategories`);
                    scraperTasks.push({
                        platform: 'zepto',
                        urls: platformGroups.zepto,
                        execute: () => callZeptoScraper(pincode, zeptoCategories, categoryName)
                    });
                }

                // Blinkit
                if (platformGroups.blinkit && platformGroups.blinkit.length > 0) {
                    const blinkitCategories = platformGroups.blinkit.map(u => ({
                        name: u.subCategory,
                        url: u.categoryUrl
                    }));
                    console.log(`\n🔹 BLINKIT: ${blinkitCategories.length} subcategories`);
                    scraperTasks.push({
                        platform: 'blinkit',
                        urls: platformGroups.blinkit,
                        execute: () => callBlinkitScraper(pincode, blinkitCategories, categoryName)
                    });
                }

                // Jiomart
                if (platformGroups.jiomart && platformGroups.jiomart.length > 0) {
                    const jiomartCategories = platformGroups.jiomart.map(u => ({
                        name: u.subCategory,
                        url: u.categoryUrl
                    }));
                    console.log(`\n🔹 JIOMART: ${jiomartCategories.length} subcategories`);
                    scraperTasks.push({
                        platform: 'jiomart',
                        urls: platformGroups.jiomart,
                        execute: () => callJiomartScraper(pincode, jiomartCategories, categoryName)
                    });
                }

                console.log(`\n⚡ Processing ${scraperTasks.length} platforms SEQUENTIALLY...`);

                // Execute platform scrapers sequentially
                for (const task of scraperTasks) {
                    let attempts = 0;
                    const maxRetries = 2;
                    let success = false;

                    while (attempts <= maxRetries && !success) {
                        attempts++;

                        if (attempts === 1) {
                            console.log(`\n▶️  Starting ${task.platform.toUpperCase()}...`);
                        } else {
                            console.log(`\n🔄 Retry attempt ${attempts - 1}/${maxRetries} for ${task.platform.toUpperCase()}...`);
                            scraperLog.logs.push({
                                level: 'warn',
                                message: `Retry attempt ${attempts - 1}/${maxRetries} for ${task.platform}`,
                                details: { pincode, platform: task.platform }
                            });
                        }

                        try {
                            const scraperResponse = await task.execute();

                            if (scraperResponse && scraperResponse.success) {
                                success = true;
                                for (const urlData of task.urls) {
                                    const saveStats = await processAndSaveProducts(
                                        scraperResponse,
                                        categoryName,
                                        urlData.subCategory,
                                        urlData.categoryUrl,
                                        scrapedAt,
                                        urlData.officialCategory,
                                        urlData.officialSubCategory
                                    );
                                    results.totalProductsSaved += saveStats.saved;
                                    results.totalErrors += saveStats.errors;
                                }

                                scraperLog.logs.push({
                                    level: 'info',
                                    message: `Processed ${task.platform} for ${categoryName}`,
                                    details: { pincode, platform: task.platform, productsFound: scraperResponse.products?.length || 0 }
                                });

                            } else {
                                const errorMsg = scraperResponse?.error || 'Unknown error';
                                throw new Error(errorMsg); // Throw to handle in catch block for retry logic
                            }
                        } catch (err) {
                            const isLastAttempt = attempts > maxRetries;

                            if (isLastAttempt) {
                                console.error(`   ❌ ${task.platform} failed after ${attempts} attempts: ${err.message}`);
                                results.totalErrors++;

                                scraperLog.logs.push({
                                    level: 'error',
                                    message: `${task.platform} failed for ${categoryName} (Final Attempt)`,
                                    details: { pincode, error: err.message }
                                });
                                scraperLog.stats.totalErrors++;
                            } else {
                                console.warn(`   ⚠️ ${task.platform} failed, retrying... (${err.message})`);
                                // Wait 2 seconds before retry
                                await new Promise(r => setTimeout(r, 2000));
                            }
                        }
                    }

                    // Small delay between platforms to breathe
                    if (scraperTasks.indexOf(task) < scraperTasks.length - 1) {
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                // Update stats in DB periodically
                scraperLog.stats.totalProductsSaved = results.totalProductsSaved;
                scraperLog.stats.categoriesProcessed = results.categoriesProcessed;
                await scraperLog.save();

                // Wait 5 seconds between pincodes
                console.log(`\n⏸️  Waiting 5s before next pincode...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }

            results.categoriesProcessed++;

            // Wait 10 seconds between categories
            console.log(`\n⏸️  Waiting 10s before next category...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        results.endTime = new Date();
        results.duration = Math.round((results.endTime - results.startTime) / 1000);

        // Update global stats
        scrapingStats.totalProductsSaved = results.totalProductsSaved;
        scrapingStats.totalCategories = results.categoriesProcessed;
        scrapingStats.lastDuration = results.duration;

        console.log(`\n${'='.repeat(80)}`);
        console.log('✅ SCRAPING COMPLETED');
        console.log(`${'='.repeat(80)}`);
        console.log(`⏱️  Total duration: ${results.duration}s`);
        console.log(`📦 Products saved: ${results.totalProductsSaved}`);
        console.log(`📁 Categories processed: ${results.categoriesProcessed}`);
        console.log(`❌ Errors: ${results.totalErrors}`);
        console.log(`${'='.repeat(80)}\n`);

        // Finalize log
        scraperLog.status = 'completed';
        scraperLog.duration = results.duration;
        scraperLog.stats.totalProductsSaved = results.totalProductsSaved;
        scraperLog.stats.categoriesProcessed = results.categoriesProcessed;
        scraperLog.stats.totalErrors = results.totalErrors;
        scraperLog.logs.push({
            level: 'info',
            message: 'Scraping completed successfully',
            details: results
        });
        await scraperLog.save();

    } catch (error) {
        console.error('\n❌ Fatal error in scraping job:', error);
        results.totalErrors++;

        // Finalize log with error
        scraperLog.status = 'failed';
        scraperLog.error = error.message;
        scraperLog.logs.push({
            level: 'error',
            message: 'Fatal error in scraping job',
            details: { error: error.message, stack: error.stack }
        });
        await scraperLog.save();

    } finally {
        isScraping = false;
    }

    return results;
}

// Express middleware
app.use(express.json());

// API Endpoints
app.get('/', (req, res) => {
    res.json({
        service: 'Local Scraper Service - Delhi NCR',
        status: 'running',
        platforms: ['zepto', 'blinkit', 'jiomart'],
        pincodes: DELHI_NCR_PINCODES
    });
});

app.get('/status', (req, res) => {
    res.json({
        isScraping,
        lastRun: lastRunTime ? lastRunTime.toLocaleString() : 'Never',
        nextRun: nextRunTime ? nextRunTime.toLocaleString() : 'Not scheduled',
        stats: scrapingStats
    });
});

app.post('/trigger-scrape', async (req, res) => {
    if (isScraping) {
        return res.status(409).json({
            error: 'Scraping already in progress',
            isScraping: true
        });
    }

    // Run asynchronously
    runLocalScraperJob();

    res.json({
        message: 'Scraping job started',
        isScraping: true
    });
});

app.get('/stats', async (req, res) => {
    const categoryStats = getStats();
    res.json({
        ...categoryStats,
        scrapingStats
    });
});

// Start server
async function startServer() {
    try {
        // Connect to MongoDB
        await dbConnect();

        // Start Express server
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(80));
            console.log('🚀 LOCAL SCRAPER SERVICE');
            console.log('='.repeat(80));
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`📍 Region: Delhi NCR`);
            console.log(`📌 Pincodes: ${DELHI_NCR_PINCODES.join(', ')}`);
            console.log(`🔧 Platforms: Zepto, Blinkit, Jiomart`);
            console.log('\n📡 Endpoints:');
            console.log(`   GET  http://localhost:${PORT}/`);
            console.log(`   GET  http://localhost:${PORT}/status`);
            console.log(`   POST http://localhost:${PORT}/trigger-scrape`);
            console.log(`   GET  http://localhost:${PORT}/stats`);
            console.log('='.repeat(80) + '\n');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start application
startServer();
