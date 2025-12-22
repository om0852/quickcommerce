import cron from 'node-cron';
import { scrapeCategory, CATEGORY_URLS, ALL_PINCODES } from './scraper.js';

let isSchedulerRunning = false;
let cronTask = null;
let lastRunTime = null;
let nextRunTime = null;
let isScraping = false;

// Function to calculate next run time
function calculateNextRun() {
  const now = new Date();
  const hours = [10, 16, 20];
  const currentHour = now.getHours();

  // Find next scheduled hour
  let nextHour = hours.find(h => h > currentHour);
  if (!nextHour) {
    nextHour = hours[0]; // Next day's first run
  }

  const next = new Date(now);
  if (nextHour <= currentHour) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(nextHour, 0, 0, 0);

  return next;
}

// The actual scraping function
async function runScrapingJob() {
  if (isScraping) {
    console.log('⚠️ Scraping job already running, skipping...');
    return;
  }

  isScraping = true;

  try {
    console.log('🕐 Running scheduled category scraping...');
    console.log(`   Started at: ${new Date().toLocaleString()}`);
    lastRunTime = new Date();

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
    console.log(`   Finished at: ${new Date().toLocaleString()}`);
    nextRunTime = calculateNextRun();
  } catch (error) {
    console.error('❌ Error in scraping job:', error);
  } finally {
    isScraping = false;
  }
}

export function startCronScheduler(runImmediately = false) {
  if (isSchedulerRunning) {
    console.log('⚠️  Scheduler already running');
    return;
  }

  // Run at 10:00 AM, 4:00 PM (16:00), and 8:00 PM (20:00)
  cronTask = cron.schedule('0 10,16,20 * * *', runScrapingJob);

  isSchedulerRunning = true;
  nextRunTime = calculateNextRun();

  console.log('✅ Cron scheduler started');
  console.log(`   Schedule: Daily at 10:00, 16:00, and 20:00`);
  console.log(`   Next run: ${nextRunTime.toLocaleString()}`);

  // Optionally run immediately for testing
  if (runImmediately) {
    console.log('🚀 Running scraping job immediately...');
    runScrapingJob().catch(err => {
      console.error('❌ Error in immediate run:', err);
    });
  }
}

export function stopCronScheduler() {
  if (isSchedulerRunning && cronTask) {
    cronTask.stop();
    isSchedulerRunning = false;
    cronTask = null;
    console.log('🛑 Cron scheduler stopped');
  }
}

export function getSchedulerStatus() {
  return {
    isRunning: isSchedulerRunning,
    schedule: '0 10,16,20 * * * (Daily at 10:00, 16:00, 20:00)',
    lastRun: lastRunTime ? lastRunTime.toLocaleString() : 'Never',
    nextRun: nextRunTime ? nextRunTime.toLocaleString() : 'Not scheduled',
    currentTime: new Date().toLocaleString()
  };
}
