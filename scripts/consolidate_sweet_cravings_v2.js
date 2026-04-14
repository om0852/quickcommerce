import 'dotenv/config'
import dbConnect from '../lib/mongodb.js'
import ProductGrouping from '../models/ProductGrouping.js'
import ProductSnapshot from '../models/ProductSnapshot.js'

async function run() {
    await dbConnect();
    console.log('Connected to DB');

    const category = "Fruits & Vegetables";
    const dryRun = process.argv.includes('--dry-run');

    if (dryRun) console.log('DRY RUN MODE - No changes will be saved\n');

    // Helper to extract baseId
    const getBaseId = (productId) => {
        if (!productId) return null;
        if (productId.includes('__')) return productId.split('__')[0];
        if (productId.includes('_')) return productId.slice(0, productId.lastIndexOf('_'));
        return productId;
    };

    // 1. Fetch all groups for this category
    const groups = await ProductGrouping.find({ category }).lean();
    console.log(`Total groups in "${category}": ${groups.length}`);

    if (groups.length === 0) {
        console.log('No groups found. Exiting.');
        process.exit(0);
    }

    // 2. Map baseIds to group IDs
    const baseIdToGroupIds = {};
    groups.forEach(group => {
        const uniqueBaseIdsInGroup = new Set();
        (group.products || []).forEach(p => {
            const bid = getBaseId(p.productId);
            if (bid) {
                uniqueBaseIdsInGroup.add(bid);
                if (!baseIdToGroupIds[bid]) baseIdToGroupIds[bid] = new Set();
                baseIdToGroupIds[bid].add(group.groupingId);
            }
        });
    });

    // 3. Identify baseIds that appear in multiple groups
    const baseIdsToConsolidate = Object.keys(baseIdToGroupIds).filter(bid => baseIdToGroupIds[bid].size > 1);
    console.log(`Found ${baseIdsToConsolidate.length} baseIds spanning multiple groups`);

    const processedGroups = new Set();
    let totalMergedGroups = 0;
    let totalDeletedGroups = 0;

    for (const bid of baseIdsToConsolidate) {
        const gids = Array.from(baseIdToGroupIds[bid]);
        const relatedGroups = groups.filter(g => gids.includes(g.groupingId) && !processedGroups.has(g.groupingId));

        if (relatedGroups.length <= 1) continue;

        // Selection of Master Group
        // Priority: Highest totalProducts, then isManuallyVerified
        relatedGroups.sort((a, b) => {
            if ((b.totalProducts || 0) !== (a.totalProducts || 0)) {
                return (b.totalProducts || 0) - (a.totalProducts || 0);
            }
            if (b.isManuallyVerified && !a.isManuallyVerified) return 1;
            if (a.isManuallyVerified && !b.isManuallyVerified) return -1;
            return 0;
        });

        const masterGroup = relatedGroups[0];
        const sourceGroups = relatedGroups.slice(1);

        console.log(`\nConsolidating for baseId: ${bid}`);
        console.log(`  Master: ${masterGroup.groupingId} (${masterGroup.primaryName}) [Products: ${masterGroup.totalProducts}, Manual: ${masterGroup.isManuallyVerified}]`);

        const mergedProducts = [...(masterGroup.products || [])];

        for (const source of sourceGroups) {
            console.log(`  -> Merging: ${source.groupingId} (${source.primaryName}) [Products: ${source.totalProducts}]`);

            (source.products || []).forEach(p => {
                const exists = mergedProducts.find(mp => mp.platform === p.platform && mp.productId === p.productId);
                if (!exists) mergedProducts.push(p);
            });

            processedGroups.add(source.groupingId);
            if (!dryRun) {
                await ProductGrouping.deleteOne({ _id: source._id });
            }
            totalDeletedGroups++;
        }

        if (!dryRun) {
            await ProductGrouping.updateOne(
                { _id: masterGroup._id },
                { $set: { products: mergedProducts, totalProducts: mergedProducts.length } }
            );
        }
        processedGroups.add(masterGroup.groupingId);
        totalMergedGroups++;
    }

    // 4. Scan for Stray Products in ProductSnapshot
    console.log('\nScanning for stray products in ProductSnapshot...');

    // Optimization: Fetch all products in the category once
    console.log('Fetching all products for the category to optimize matching...');
    const allCategoryProducts = await ProductSnapshot.find({ category }).select('platform productId').lean();
    console.log(`Fetched ${allCategoryProducts.length} products from snapshots.`);

    // Pre-calculate baseIds for all category products
    const productToBaseId = new Map();
    allCategoryProducts.forEach(p => {
        productToBaseId.set(p.productId, getBaseId(p.productId));
    });

    const remainingGroups = await ProductGrouping.find({ category }).lean();
    let totalStrayAdded = 0;

    for (const group of remainingGroups) {
        const baseIdsInGroup = new Set();
        const productIdsInGroup = new Set();
        (group.products || []).forEach(p => {
            productIdsInGroup.add(p.productId);
            const bid = getBaseId(p.productId);
            if (bid) baseIdsInGroup.add(bid);
        });

        if (baseIdsInGroup.size === 0) continue;

        // Find products in our pre-fetched list that match baseId but aren't in the group
        const strayProducts = allCategoryProducts.filter(sp => {
            const alreadyInGroup = productIdsInGroup.has(sp.productId);
            if (alreadyInGroup) return false;

            const sbid = productToBaseId.get(sp.productId);
            return sbid && baseIdsInGroup.has(sbid);
        });

        let addedToGroup = 0;
        const newGroupProducts = [...(group.products || [])];

        for (const sp of strayProducts) {
            // Extra safety check for platform+productId
            const exists = newGroupProducts.find(p => p.platform === sp.platform && p.productId === sp.productId);
            if (!exists) {
                newGroupProducts.push({ platform: sp.platform, productId: sp.productId });
                addedToGroup++;
            }
        }

        if (addedToGroup > 0) {
            console.log(`Group ${group.groupingId}: Added ${addedToGroup} stray products`);
            if (!dryRun) {
                await ProductGrouping.updateOne(
                    { _id: group._id },
                    { $set: { products: newGroupProducts, totalProducts: newGroupProducts.length } }
                );
            }
            totalStrayAdded += addedToGroup;
        }
    }

    console.log(`\n========================================`);
    console.log(`Summary:`);
    console.log(`Groups merged: ${totalMergedGroups}`);
    console.log(`Groups deleted: ${totalDeletedGroups}`);
    console.log(`Stray products added: ${totalStrayAdded}`);
    console.log(`========================================`);

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
