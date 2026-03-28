/**
 * Local Cron Script — Overview Generator
 *
 * Runs daily at 3:00 AM IST and calls the generate-overview API.
 * Keep this running alongside `npm run dev`.
 *
 * Usage:
 *   node cron/run-overview.js
 */

import cron from 'node-cron';

const API_URL = 'http://localhost:3000/api/cron/generate-overview';
const CRON_SCHEDULE = '0 3 * * *'; // Every day at 3:00 AM

async function callOverviewAPI() {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`\n[${timestamp}] Running overview generation...`);

    try {
        const res = await fetch(API_URL);
        const json = await res.json();

        if (json.success) {
            console.log(`✅ ${json.message}`);
            json.results?.forEach(r => {
                if (r.error) {
                    console.warn(`  ⚠️  Pincode ${r.pincode}: ${r.error}`);
                } else {
                    console.log(`  ✅ Pincode ${r.pincode}: ${r.cachedRows} rows cached`);
                }
            });
        } else {
            console.error(`❌ Failed:`, json.error || JSON.stringify(json));
        }
    } catch (err) {
        console.error(`❌ Request failed: ${err.message}`);
        console.error('   Make sure your Next.js dev server is running (npm run dev)');
    }
}

// Schedule the cron job
cron.schedule(CRON_SCHEDULE, callOverviewAPI, {
    timezone: 'Asia/Kolkata'
});

console.log(`🕐 Overview cron scheduled: runs daily at 3:00 AM IST`);
console.log(`   API: ${API_URL}`);
console.log(`   Press Ctrl+C to stop.\n`);

// Run once immediately on startup
console.log('Running once now on startup...');
callOverviewAPI();
