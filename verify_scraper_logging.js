
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dbConnect from './local-scraper-service/config/db.js';
import ScraperLog from './local-scraper-service/models/ScraperLog.js';
import fetch from 'node-fetch';

dotenv.config({ path: './local-scraper-service/.env' });

async function verifyLogging() {
    console.log('🧪 Starting verification of ScraperLog...');

    try {
        // 1. Trigger the scraper
        console.log('👉 Triggering scraper via API...'); // Note: API might be running on 5000
        const triggerUrl = 'http://localhost:5000/trigger-scrape';

        try {
            const response = await fetch(triggerUrl, { method: 'POST' });
            const data = await response.json();
            console.log('   API Response:', data);

            if (response.status === 409) {
                console.log('   ⚠️ Scraper already running, that is fine. We will check for the running log.');
            } else if (response.status !== 200) {
                throw new Error(`Failed to trigger scraper: ${response.status} ${response.statusText}`);
            }
        } catch (e) {
            console.log('   ⚠️ Could not reach API (server might not be running). skipping trigger.');
            console.log('   Please ensure "npm run dev" is running in local-scraper-service.');
        }

        // 2. Connect to DB to check logs
        console.log('📡 Connecting to database...');
        await dbConnect();

        console.log('🔍 Checking for recent logs...');
        // Give it a moment if we just triggered it
        await new Promise(r => setTimeout(r, 2000));

        const recentLog = await ScraperLog.findOne().sort({ createdAt: -1 });

        if (!recentLog) {
            console.error('❌ No logs found in database!');
            process.exit(1);
        }

        console.log('\n✅ Most Recent Log Found:');
        console.log(`   ID: ${recentLog._id}`);
        console.log(`   Status: ${recentLog.status}`);
        console.log(`   Started: ${recentLog.scrapedAt}`);
        console.log(`   Config:`, recentLog.config);
        console.log(`   Stats:`, recentLog.stats);
        console.log(`   Log Entries: ${recentLog.logs.length}`);

        if (recentLog.logs.length > 0) {
            console.log('\n   Latest Log Entry:');
            console.log(recentLog.logs[recentLog.logs.length - 1]);
        }

        // Assertions
        const isRecent = (new Date() - new Date(recentLog.createdAt)) < 5 * 60 * 1000; // within 5 mins
        if (!isRecent) {
            console.warn('\n⚠️  Warning: The latest log is older than 5 minutes. Did the scraper actually start?');
        } else {
            console.log('\n✅ Log is recent.');
        }

        if (recentLog.status === 'running' || recentLog.status === 'completed' || recentLog.status === 'failed') {
            console.log('✅ Status is valid.');
        } else {
            console.error(`❌ Invalid status: ${recentLog.status}`);
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verifyLogging();
