
import ProductSnapshot from '../models/ProductSnapshot.js';
import { getGroupingId } from './productGrouper.js';
import { GroupingCache } from './groupingCache.js';

/**
 * Common Insertion Function with Grouping Optimization
 * @param {Array} products - Array of formatted product objects
 * @param {string} pincode - Pincode
 * @param {Date} targetDate - Scraped timestamp
 * @param {Object} [cacheInstance] - Optional existing GroupingCache instance (if reuse needed)
 */
export async function insertWithGrouping(products, pincode, targetDate, cacheInstance = null) {
    if (!products || products.length === 0) {
        console.log('No products to insert.');
        return;
    }

    console.log(`Starting insertion with grouping for ${products.length} products...`);

    // Load Cache if not provided
    let cache = cacheInstance;
    if (!cache) {
        cache = new GroupingCache();
        await cache.load();
    }
    const memoryStore = cache.getStore();
    const searchIndex = cache.getSearchIndex();

    // Prepare snapshots with grouping
    const snapshotsToInsert = [];
    let processed = 0;

    for (const p of products) {
        const scrapedAt = targetDate || new Date(p.scrapedAt);

        // Calculate Grouping ID
        const groupId = await getGroupingId(
            p,
            scrapedAt,
            p.category, // Assuming category is present in formatted object
            memoryStore,
            searchIndex
        );

        // Create snapshot object
        const snapshot = {
            ...p,
            pincode: String(pincode),
            scrapedAt: scrapedAt,
            groupingId: groupId
        };

        snapshotsToInsert.push(snapshot);
        processed++;

        if (processed % 1000 === 0) {
            process.stdout.write(`\r   Processed grouping for ${processed}/${products.length}...`);
        }
    }
    console.log(`\nAll ${processed} products grouped. Starting bulk insertion...`);

    // Bulk Insert into ProductSnapshot
    // We use insertMany with ordered: false to skip duplicates (unique index on ProductSnapshot)
    const BATCH_SIZE = 1000;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < snapshotsToInsert.length; i += BATCH_SIZE) {
        const batch = snapshotsToInsert.slice(i, i + BATCH_SIZE);
        try {
            await ProductSnapshot.insertMany(batch, { ordered: false });
            insertedCount += batch.length;
            process.stdout.write(`\r   Inserted ${insertedCount}/${snapshotsToInsert.length}...`);
        } catch (err) {
            if (err.writeErrors) {
                // Determine how many were actually inserted
                errorCount += err.writeErrors.length;
                insertedCount += (batch.length - err.writeErrors.length);
            } else {
                console.error(`\n   ❌ Batch insert error: ${err.message}`);
            }
        }
    }

    console.log(`\nInsertion Complete. Inserted: ${insertedCount}, Duplicates/Errors: ${errorCount}`);

    // Persist Grouping Changes (New/Updated Groups)
    await cache.saveDirtyGroups();

    return { insertedCount, errorCount };
}
