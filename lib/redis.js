import { Redis } from '@upstash/redis'

/**
 * Creates an Upstash Redis client from a URL and Token.
 * Automatically handles rediss:// or redis:// URLs.
 */
function createInstance(rawUrl, rawToken) {
  if (!rawUrl) return null;
  let url = rawUrl;
  let token = rawToken || '';

  if (rawUrl.startsWith('rediss://') || rawUrl.startsWith('redis://')) {
    try {
      const urlObj = new URL(rawUrl);
      url = `https://${urlObj.hostname}`;
      token = urlObj.password || token;
    } catch (e) {
      console.warn('[Redis] Failed to parse URL, using raw value');
    }
  }

  if (!url || !token) return null;

  return new Redis({ url, token });
}

// Primary client
export const redis = createInstance(process.env.REDIS_URL, process.env.REDIS_TOKEN);

// Shard nodes (1 to 4)
export const redisNodes = [
  createInstance(process.env.REDIS_URL_1, process.env.REDIS_TOKEN_1),
  createInstance(process.env.REDIS_URL_2, process.env.REDIS_TOKEN_2),
  createInstance(process.env.REDIS_URL_3, process.env.REDIS_TOKEN_3),
  createInstance(process.env.REDIS_URL_4, process.env.REDIS_TOKEN_4),
].filter(Boolean);

// Fallback if no shard nodes defined
export const clients = redisNodes.length > 0 ? redisNodes : (redis ? [redis] : []);

export default redis;
