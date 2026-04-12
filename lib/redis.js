import { Redis } from '@upstash/redis'

/**
 * Shared Upstash Redis client instance.
 * Automatically handles rediss:// or redis:// URLs by converting them to the 
 * HTTPS REST format required by @upstash/redis.
 */
function createRedisClient() {
  const rawUrl = process.env.REDIS_URL || '';
  let url = rawUrl;
  let token = process.env.REDIS_TOKEN || '';

  // Handle standard Redis connection strings (rediss://default:token@host:port)
  if (rawUrl.startsWith('rediss://') || rawUrl.startsWith('redis://')) {
    try {
      const urlObj = new URL(rawUrl);
      url = `https://${urlObj.hostname}`;
      token = urlObj.password || token;
    } catch (e) {
      console.warn('[Redis] Failed to parse REDIS_URL as URL object, using raw values');
    }
  }

  if (!url || !token) {
    console.warn('[Redis] Configuration missing. REDIS_URL and REDIS_TOKEN (or a full connection string) are required.');
  }

  return new Redis({
    url: url,
    token: token,
  });
}

const redis = createRedisClient();
export default redis;
