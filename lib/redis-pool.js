import { Redis } from '@upstash/redis';

/**
 * Category → Redis shard mapping.
 * 20 total categories divided across 4 Redis instances.
 *
 * Redis 1: Fruits & Vegetables, Dairy Bread & Eggs, Snacks & Munchies, Packaged Food, Bakery & Biscuits
 * Redis 2: Cold Drinks & Juices, Tea Coffee & More, Breakfast & Sauces, Atta Rice Oil & Dals, Masala Dry Fruits & More
 * Redis 3: Baby Care, Personal Care, Bath & Body, Skincare, Beauty
 * Redis 4: Home Needs, Health & Wellness, Ice Creams & More, Sweet Cravings, School Office & Stationery (+ any unlisted)
 */
const CATEGORY_SHARD_MAP = {
  // Shard 1
  'Fruits & Vegetables':          1,
  'Dairy, Bread & Eggs':          1,
  'Snacks & Munchies':            1,
  'Packaged Food':                1,
  'Bakery & Biscuits':            1,

  // Shard 2
  'Cold Drinks & Juices':         2,
  'Tea, Coffee & More':           2,
  'Breakfast & Sauces':           2,
  'Atta, Rice, Oil & Dals':       2,
  'Masala, Dry Fruits & More':    2,

  // Shard 3
  'Baby Care':                    3,
  'Personal Care':                3,
  'Bath & Body':                  3,
  'Skincare':                     3,
  'Beauty':                       3,

  // Shard 4 — also catches any future/unlisted categories
  'Home Needs':                   4,
  'Health & Wellness':            4,
  'Ice Creams & More':            4,
  'Sweet Cravings':               4,
  'School, Office & Stationery':  4,
};

/**
 * Create a single Redis client from URL + TOKEN env vars.
 */
function createClient(urlEnv, tokenEnv) {
  const url = process.env[urlEnv] || '';
  const token = process.env[tokenEnv] || '';
  if (!url || !token) {
    console.warn(`[RedisPool] Missing env vars: ${urlEnv} / ${tokenEnv}`);
  }
  return new Redis({ url, token });
}

// Lazy-init: clients are created once on first use
let _clients = null;

function getClients() {
  if (!_clients) {
    _clients = [
      null,                                               // index 0 unused (shards are 1-based)
      createClient('REDIS_1_URL', 'REDIS_1_TOKEN'),       // shard 1
      createClient('REDIS_2_URL', 'REDIS_2_TOKEN'),       // shard 2
      createClient('REDIS_3_URL', 'REDIS_3_TOKEN'),       // shard 3
      createClient('REDIS_4_URL', 'REDIS_4_TOKEN'),       // shard 4
    ];
  }
  return _clients;
}

/**
 * Get the Redis client for a given category.
 * Unknown categories fall back to shard 4.
 */
export function getRedisForCategory(category) {
  const shard = CATEGORY_SHARD_MAP[category] ?? 4;
  const clients = getClients();
  console.log(`[RedisPool] Category "${category}" → Shard ${shard}`);
  return clients[shard];
}

/**
 * Get a Redis client by shard number (1–4).
 */
export function getRedisForShard(shard) {
  return getClients()[shard];
}

/**
 * Get all 4 Redis clients (useful for operations like cache invalidation).
 */
export function getAllRedisClients() {
  const clients = getClients();
  return [clients[1], clients[2], clients[3], clients[4]];
}

/**
 * Delete all cat_data:* keys for a given category from its shard.
 * Call this after any grouping mutation.
 */
export async function invalidateCategoryCache(category) {
  const client = getRedisForCategory(category);
  try {
    const pattern = `cat_data:${category}:*`;
    const keys = await client.keys(pattern);
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(k => client.del(k)));
      console.log(`[RedisPool] Invalidated ${keys.length} cache keys for "${category}"`);
    }
  } catch (err) {
    console.warn(`[RedisPool] Cache invalidation failed for "${category}":`, err.message);
  }
}

/**
 * Invalidate ALL cat_data:* keys across all 4 Redis shards.
 * Use for bulk operations where the affected category is unknown
 * (e.g. populate-stock-status, sync-time-range, update-timestamp).
 */
export async function invalidateAllCaches() {
  const clients = getAllRedisClients();
  try {
    await Promise.all(clients.map(async (client, i) => {
      const keys = await client.keys('cat_data:*');
      if (keys && keys.length > 0) {
        await Promise.all(keys.map(k => client.del(k)));
        console.log(`[RedisPool] Shard ${i + 1}: invalidated ${keys.length} cache keys`);
      }
    }));
    console.log('[RedisPool] All shards invalidated');
  } catch (err) {
    console.warn('[RedisPool] Full cache invalidation failed:', err.message);
  }
}

/**
 * Shard 1 is used as the general-purpose cache for non-category data
 * (brands list, product history, etc.)
 */
export function getGeneralRedis() {
  return getClients()[1];
}

/**
 * Invalidate brands cache (both the enabled-only and all-brands variants).
 * Call this after any brand create/update/delete operation.
 */
export async function invalidateBrandsCache() {
  const client = getGeneralRedis();
  try {
    await Promise.all([
      client.del('brands:enabled'),
      client.del('brands:all'),
    ]);
    console.log('[RedisPool] Brands cache invalidated');
  } catch (err) {
    console.warn('[RedisPool] Brands cache invalidation failed:', err.message);
  }
}

