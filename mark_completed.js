
import { ScrapeTracker } from './local-scraper-service/utils/scrapeTracker.js';

const PINCODE = '201303';
const PLATFORMS = ['zepto', 'blinkit', 'jiomart'];
const CATEGORIES = [
    'Fruits & Vegetables',
    'Dairy, Bread & Eggs',
    'Atta, Rice, Oil & Dals'
];

// Use the same fixed timestamp as in server.js
const scrapedAt = new Date('2026-01-04T08:00:00+05:30');

console.log('🔄 Marking categories as completed...');

const tracker = new ScrapeTracker(scrapedAt);

for (const category of CATEGORIES) {
    for (const platform of PLATFORMS) {
        tracker.markCompleted(category, PINCODE, platform);
        console.log(`✅ Marked completed: ${category} | ${PINCODE} | ${platform}`);
    }
}

console.log('\n✨ Done! You can now resume scraping.');
