import ProductGrouping from '../models/ProductGrouping.js';
import mongoose from 'mongoose'; // Added mongoose import
import { combinedSimilarity, weightsMatch } from './productMatching.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Product Grouper Utility
 * Manages persistent product grouping using ProductGrouping model.
 */

// Threshold for fuzzy matching
const SIMILARITY_THRESHOLD = 0.75;

import fs from 'fs';
import path from 'path';

/**
 * Find or create a grouping ID for a product.
 * @param {Object} product - Product object (must have platform, productId, productName, productWeight, productImage)
 * @param {string|Date} scrapedAt - The scrape timestamp to enforce time-based grouping constraints
 * @param {string} category - The category of the product (for constraint)
 * @param {Map} [memoryStore] - Optional in-memory store for groups (replaces DB lookups/writes if provided)
 * @returns {Promise<string>} - The groupingId
 */
export async function getGroupingId(product, scrapedAt, category, memoryStore = null, searchIndex = null) {
    const { platform, productId, productName, productWeight, productImage } = product;

    // Normalize scrapedAt for comparison (if provided)
    const currentScrapedAtTime = scrapedAt ? new Date(scrapedAt).getTime() : null;

    let existingGroup = null;

    // 1. Check if product already belongs to a group
    if (memoryStore) {
        // Optimizing this lookup is harder without a secondary index (productId -> groupId).
        // For now, we assume calling code might handle this OR we accept this iteration if unavoidable. 
        // BUT, we can skip this if we assume inputs are unique or handled by the caller.
        // Or we can add a productId index too.
        // Let's assume we can skip this expensive check if we trust the caller (process_grouping) 
        // OR add a quick lookup: memoryStore.productIndex matches productId+platform -> groupId

        if (memoryStore.productIndex) {
            const key = `${platform}:${productId}`;
            if (memoryStore.productIndex.has(key)) {
                const gid = memoryStore.productIndex.get(key);
                existingGroup = memoryStore.get(gid);
            }
        } else {
            // Fallback to slow iteration if index not present (safety)
            for (const group of memoryStore.values()) {
                if (group.products.some(p => p.platform === platform && p.productId === productId)) {
                    existingGroup = group;
                    break;
                }
            }
        }
    } else {
        existingGroup = await ProductGrouping.findOne({
            products: { $elemMatch: { platform, productId } }
        });
    }

    if (existingGroup) {
        // Validation: Does existing group match category?
        // If not, we have a conflict. But usually category shouldn't change for the same productId.
        // If it does, maybe we should respect the new category? 
        // For now, return existing.
        return existingGroup.groupingId;
    }

    // 2. Try to find a matching group among existing groups
    // Strategy: Search for candidates using text search on primaryName
    const searchTerms = productName.toLowerCase().split(' ').filter(t => t.length > 2); // only significant words

    let candidates = [];

    if (memoryStore && searchIndex) {
        // Optimized In-Memory Search using Index
        const candidateIds = new Set();

        searchTerms.forEach(term => {
            if (searchIndex.has(term)) {
                searchIndex.get(term).forEach(id => candidateIds.add(id));
            }
        });

        // Limit candidates to check
        const candidateGroups = [];
        for (const id of candidateIds) {
            const g = memoryStore.get(id);
            if (g) candidateGroups.push(g);
            if (candidateGroups.length > 50) break; // Optimistic limit
        }

        candidates = candidateGroups;

    } else if (memoryStore) {
        // Fallback: Iteration (Slow)
        const allGroups = Array.from(memoryStore.values());
        candidates = allGroups; // Too slow but fallback
    } else {
        candidates = await ProductGrouping.find(
            {
                $text: { $search: productName }
                // REMOVED STRICT CATEGORY CONSTRAINT
            },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .limit(20);
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const group of candidates) {
        // CONSTRAINT A: Platform Uniqueness
        const hasSamePlatform = group.products.some(p => p.platform === platform);
        if (hasSamePlatform) {
            continue;
        }

        // CONSTRAINT B: ScrapedAt Check
        if (currentScrapedAtTime) {
            const sample = group.products[0];
            if (sample) {
                let sampleScrapedAt = sample.scrapedAt;

                // If not in memory object, try to fetch (fallback)
                if (!sampleScrapedAt && !memoryStore) {
                    const ProductSnapshotModel = mongoose.models.ProductSnapshot;
                    if (ProductSnapshotModel) {
                        const snapshot = await ProductSnapshotModel.findOne({
                            platform: sample.platform,
                            productId: sample.productId
                        }).select('scrapedAt').lean();
                        if (snapshot) sampleScrapedAt = snapshot.scrapedAt;
                    }
                }

                if (sampleScrapedAt) {
                    if (Math.abs(new Date(sampleScrapedAt).getTime() - currentScrapedAtTime) > 24 * 60 * 60 * 1000) {
                        continue;
                    }
                }
            }
        }

        // Strict weight check first
        if (!weightsMatch(productWeight, group.primaryWeight)) {
            continue;
        }

        const score = combinedSimilarity(productName, group.primaryName);

        if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
            bestScore = score;
            bestMatch = group;
        }
    }

    // 3. If match found, add to group
    if (bestMatch) {
        if (memoryStore) {
            // In-memory update
            // We need to mutate the object in the store
            const group = memoryStore.get(bestMatch.groupingId);
            group.products.push({ platform, productId, scrapedAt });
            group.totalProducts = group.products.length;
            // Map holds reference, so simple mutation works or set again
            memoryStore.set(bestMatch.groupingId, group);

            // UPDATE INDEXES
            if (memoryStore.productIndex) {
                memoryStore.productIndex.set(`${platform}:${productId}`, bestMatch.groupingId);
            }

            return bestMatch.groupingId;
        } else {
            bestMatch.products.push({ platform, productId, scrapedAt });
            bestMatch.totalProducts = bestMatch.products.length;
            await bestMatch.save();
            return bestMatch.groupingId;
        }
    }

    // 4. If no match, create new group
    const newGroupId = uuidv4();
    const newGroup = {
        groupingId: newGroupId,
        category: category, // Save Category
        products: [{ platform, productId, scrapedAt }],
        primaryName: productName,
        primaryImage: productImage,
        primaryWeight: productWeight,
        totalProducts: 1
    };

    if (memoryStore) {
        memoryStore.set(newGroupId, newGroup);

        // UPDATE INDEXES
        if (memoryStore.productIndex) {
            memoryStore.productIndex.set(`${platform}:${productId}`, newGroupId);
        }
        if (searchIndex) {
            const terms = productName.toLowerCase().split(' ').filter(t => t.length > 2);
            terms.forEach(term => {
                if (!searchIndex.has(term)) searchIndex.set(term, new Set());
                searchIndex.get(term).add(newGroupId);
            });
        }
    } else {
        const dbGroup = new ProductGrouping(newGroup);
        await dbGroup.save();
    }

    return newGroupId;
}


/**
 * Export all groupings to a JSON file (Backup)
 */
export async function exportGroupingsToJson() {
    try {
        const groupings = await ProductGrouping.find({}).lean();
        const filePath = path.resolve(process.cwd(), 'grouping_data.json');
        fs.writeFileSync(filePath, JSON.stringify(groupings, null, 2));
        console.log(`✅ Grouping data exported to ${filePath}`);
    } catch (error) {
        console.error('Failed to export grouping data:', error);
    }
}

/**
 * Manually add a specific product to a group (e.g. via admin UI)
 */
export async function addProductToGroup(targetGroupId, product) {
    const group = await ProductGrouping.findOne({ groupingId: targetGroupId });
    if (!group) throw new Error('Group not found');

    const { platform, productId } = product;

    // Check if duplicate in this group
    const exists = group.products.some(p => p.platform === platform && p.productId === productId);
    if (exists) return group.groupingId;

    // Remove from old group if exists
    // (This is tricky, we'd need to find the OLD group first. 
    // Ideally the UI should handle "ungroup" then "add to new group", or we handle it here.)
    await ungroupProduct(null, platform, productId); // Pass null groupingId to find matches automatically

    group.products.push({ platform, productId });
    group.totalProducts = group.products.length;
    group.isManuallyVerified = true;

    await group.save();
    return group.groupingId;
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

    targetGroup.totalProducts = targetGroup.products.length; // Update count
    targetGroup.isManuallyVerified = true;
    await targetGroup.save();
    await ProductGrouping.deleteOne({ _id: sourceGroup._id });

    return targetGroup.groupingId;
}

/**
 * Remove a product from a group (and create a new group for it)
 */
/**
 * Remove a product from a group (and create a new group for it)
 * If groupingId is null, it searches for the group containing the product.
 */
export async function ungroupProduct(groupingId, platform, productId) {
    let groups = [];
    console.log(`[ungroupProduct] Request: platform=${platform}, productId=${productId}, groupingId=${groupingId}`);

    if (groupingId) {
        const g = await ProductGrouping.findOne({ groupingId });
        if (g) groups.push(g);
    } else {
        // Find ALL groups containing this product to ensure no duplicates remain
        groups = await ProductGrouping.find({
            products: { $elemMatch: { platform, productId } }
        });
    }

    console.log(`[ungroupProduct] Found ${groups.length} groups containing this product.`);

    if (groups.length === 0) return false; // Nothing to ungroup

    let anyRemoved = false;

    for (const group of groups) {
        // Remove product
        const originalLength = group.products.length;

        // Strict String conversion for safe comparison
        group.products = group.products.filter(p => !(p.platform === platform && String(p.productId) === String(productId)));

        if (group.products.length !== originalLength) {
            console.log(`[ungroupProduct] Removed product from group ${group.groupingId}. New count: ${group.products.length}`);

            // Check if group is empty
            if (group.products.length === 0) {
                console.log(`[ungroupProduct] Group ${group.groupingId} is empty. DELETE logic triggered.`);
                await ProductGrouping.deleteOne({ _id: group._id });
                console.log(`[ungroupProduct] Group ${group.groupingId} DELETED.`);
            } else {
                // Update count and save
                group.totalProducts = group.products.length;
                await group.save();
                console.log(`[ungroupProduct] Group ${group.groupingId} updated.`);
            }
            anyRemoved = true;
        } else {
            console.log(`[ungroupProduct] WARNING: Product found in query but not filtered? Platform: ${platform}, ProductId: ${productId}`);
        }
    }

    return anyRemoved;
}
