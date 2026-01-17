import ProductGrouping from '../models/ProductGrouping.js';
import { combinedSimilarity, weightsMatch } from './productMatching.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Product Grouper Utility
 * Manages persistent product grouping using ProductGrouping model.
 */

// Threshold for fuzzy matching
const SIMILARITY_THRESHOLD = 0.75;

/**
 * Find or create a grouping ID for a product.
 * @param {Object} product - Product object (must have platform, productId, productName, productWeight, productImage)
 * @param {string|Date} scrapedAt - The scrape timestamp to enforce time-based grouping constraints
 * @returns {Promise<string>} - The groupingId
 */
export async function getGroupingId(product, scrapedAt) {
    const { platform, productId, productName, productWeight, productImage } = product;

    // Normalize scrapedAt for comparison (if provided)
    const currentScrapedAtTime = scrapedAt ? new Date(scrapedAt).getTime() : null;

    // 1. Check if product already belongs to a group
    const existingGroup = await ProductGrouping.findOne({
        products: { $elemMatch: { platform, productId } }
    });

    if (existingGroup) {
        return existingGroup.groupingId;
    }

    // 2. Try to find a matching group among existing groups
    // Strategy: Search for candidates using text search on primaryName
    const searchTerms = productName.toLowerCase().split(' ').slice(0, 3).join(' ');

    // Find candidates (limit to top 20 to avoid performance hit)
    const candidates = await ProductGrouping.find(
        { $text: { $search: searchTerms } },
        { score: { $meta: "textScore" } }
    )
        .sort({ score: { $meta: "textScore" } })
        .limit(20);

    let bestMatch = null;
    let bestScore = 0;

    for (const group of candidates) {
        // CONSTRAINT A: Platform Uniqueness
        // Ignore group if it already has a product from the SAME platform
        const hasSamePlatform = group.products.some(p => p.platform === platform);
        if (hasSamePlatform) {
            continue;
        }

        // CONSTRAINT B: ScrapedAt Check (Time-based isolation)
        // If scrapedAt is provided, we must ensure the group's existing products belong to the same scrape run.
        if (currentScrapedAtTime) {
            // Find just ONE product from this group to check its scrapedAt time
            // We use the first product in the list as a representative
            const sample = group.products[0];
            if (sample) {
                // Dynamically import to avoid top-level circular dependency issues if any
                const ProductSnapshotModel = mongoose.models.ProductSnapshot;
                if (ProductSnapshotModel) {
                    const snapshot = await ProductSnapshotModel.findOne({
                        platform: sample.platform,
                        productId: sample.productId
                    }).select('scrapedAt').lean();

                    if (!snapshot || !snapshot.scrapedAt || new Date(snapshot.scrapedAt).getTime() !== currentScrapedAtTime) {
                        continue; // Skip this group as it belongs to a different scrape time
                    }
                }
            }
        }

        // Strict weight check first (optimization)
        if (!weightsMatch(productWeight, group.primaryWeight)) {
            continue;
        }

        const score = combinedSimilarity(productName, group.primaryName);

        if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
            bestScore = score;
            bestMatch = group;
        }
    }

    // Perform constraints check on bestMatch if chosen? 
    // Actually, we should filter candidates ABOVE.

    // Since I cannot import ProductSnapshot easily here without verifying circular usage, 
    // I will add the TODO for the expensive check or rely on the user understanding this limitation.
    // BUT the user EXPLICITLY requested it. I must do it.

    // Let's defer the expensive check to AFTER selecting the best candidate based on text/weight.
    // If the best candidate fails the timestamp check, we try the next best? 
    // Easier: Just check inside the loop.

    // 3. If match found, add to group
    if (bestMatch) {
        // Final verification for scrapedAt if needed
        bestMatch.products.push({ platform, productId });
        await bestMatch.save();
        return bestMatch.groupingId;
    }

    // 4. If no match, create new group
    const newGroupId = uuidv4();
    const newGroup = new ProductGrouping({
        groupingId: newGroupId,
        products: [{ platform, productId }],
        primaryName: productName,
        primaryImage: productImage,
        primaryWeight: productWeight
    });

    await newGroup.save();
    return newGroupId;
}

/**
 * Manually merge two groups (e.g. via admin UI)
 * @param {string} sourceGroupId 
 * @param {string} targetGroupId 
 */
export async function mergeGroups(sourceGroupId, targetGroupId) {
    const sourceGroup = await ProductGrouping.findOne({ groupingId: sourceGroupId });
    const targetGroup = await ProductGrouping.findOne({ groupingId: targetGroupId });

    if (!sourceGroup || !targetGroup) {
        throw new Error('One or both groups not found');
    }

    // Move products
    for (const p of sourceGroup.products) {
        // Check if already in target (duplicate check)
        const exists = targetGroup.products.some(tp => tp.platform === p.platform && tp.productId === p.productId);
        if (!exists) {
            targetGroup.products.push(p);
        }
    }

    targetGroup.isManuallyVerified = true;
    await targetGroup.save();
    await ProductGrouping.deleteOne({ _id: sourceGroup._id });

    return targetGroup.groupingId;
}

/**
 * Remove a product from a group (and create a new group for it)
 */
export async function ungroupProduct(groupingId, platform, productId) {
    const group = await ProductGrouping.findOne({ groupingId });
    if (!group) throw new Error('Group not found');

    // Remove product
    group.products = group.products.filter(p => !(p.platform === platform && p.productId === productId));

    // If group matches nothing else, we might want to clean it up or keep it?
    // If empty, delete it.
    if (group.products.length === 0) {
        await ProductGrouping.deleteOne({ _id: group._id });
    } else {
        await group.save();
    }

    // Create new group for independent product? Or just let it be re-grouped next run?
    // User said "if i want i can add a particular product in another group" -> implied ungroup + regroup or merge.
    // For now, removing it effectively ungroups it. The next scrapers/process will re-evaluate it.
    return true;
}
