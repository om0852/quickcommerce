import cron from 'node-cron';
import { scrapeCategory, CATEGORY_URLS, ALL_PINCODES } from './scraper.js';

let isSchedulerRunning = false;

export function startCronScheduler() {
  if (isSchedulerRunning) {
    console.log('Scheduler already running');
    return;
  }

  // Run every 6 hours at minute 0 (00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('🕐 Running scheduled category scraping...');
    
    const categories = Object.keys(CATEGORY_URLS);
    const pincodes = ALL_PINCODES;
    
    // Process categories ONE AT A TIME
    for (const category of categories) {
      try {
        console.log(`\n📦 Starting scraping for category: ${category}`);
        console.log(`   Pincodes: ${pincodes.join(', ')}`);
        
        // Call scraper directly instead of HTTP API
        const result = await scrapeCategory(category, pincodes);
        
        console.log(`✅ Successfully scraped ${category}`);
        console.log(`   Platforms: ${Object.keys(result.platforms).join(', ')}`);
        
      } catch (error) {
        console.error(`❌ Error scraping ${category}:`, error.message);
      }
      
      // Wait 10 seconds between categories to give Apify time to recover
      if (categories.indexOf(category) < categories.length - 1) {
        console.log(`⏳ Waiting 10 seconds before next category...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log('\n✅ Scheduled scraping completed');
  });

  isSchedulerRunning = true;
  console.log('✅ Cron scheduler started - will run every 6 hours');
}

export function stopCronScheduler() {
  if (isSchedulerRunning) {
    cron.getTasks().forEach(task => task.stop());
    isSchedulerRunning = false;
    console.log('🛑 Cron scheduler stopped');
  }
}
