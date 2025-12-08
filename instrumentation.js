// This file is automatically called by Next.js when the server starts
// It's the proper place to initialize server-side services like cron jobs

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronScheduler } = await import('./lib/scheduler');
    
    console.log('🚀 Initializing cron scheduler from instrumentation...');
    startCronScheduler();
  }
}
