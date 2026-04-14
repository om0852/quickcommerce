import 'dotenv/config';
import { getAllRedisClients } from './lib/redis-pool.js';

async function clearAllRedisInstances() {
  try {
    console.log('Fetching all 4 Redis instances...');
    const clients = getAllRedisClients();

    const results = await Promise.allSettled(
      clients.map(async (redis, index) => {
        console.log(`Clearing Redis Shard ${index + 1}...`);
        return redis.flushall();
      })
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Shard ${index + 1} cleared.`);
      } else {
        console.error(`❌ Shard ${index + 1} failed:`, result.reason);
      }
    });

  } catch (error) {
    console.error('Error connecting to Redis pool:', error);
  }
  process.exit(0);
}

clearAllRedisInstances();
