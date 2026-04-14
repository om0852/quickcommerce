import 'dotenv/config'
import dbConnect from './lib/mongodb.js'
import ProductGrouping from './models/ProductGrouping.js'

async function run() {
    await dbConnect();
    console.log('Connected to DB');

    const category = "Sweet Cravings";

    // 1. Fetch all groups for this category
    const groups = await ProductGrouping.find({ category }).lean();
    console.log(`Total Sweet Cravings groups: ${groups.length}`);

    // Sort by totalProducts desc to prioritize largest groups
    groups.sort((a, b) => (b.totalProducts || 0) - (a.totalProducts || 0));

    const processedGroups = new Set();
    let mergedCount = 0;
    let deletedCount = 0;

    for (const sinkGroup of groups) {
        if (processedGroups.has(sinkGroup.groupingId)) continue;

        // Collect all baseIds in this sinkGroup
        const baseIdsInSink = new Set();
        (sinkGroup.products || []).forEach(p => {
          const bid = p.productId.split('__')[0];
          baseIdsInSink.add(bid);
        });

        if (baseIdsInSink.size === 0) continue;

        // Find ALL other groups containing any of these baseIds
        const otherGroups = await ProductGrouping.find({
            category,
            groupingId: { $ne: sinkGroup.groupingId },
            'products.productId': { 
                $in: Array.from(baseIdsInSink).map(bid => new RegExp('^' + bid + '(__|$)')) 
            }
        });

        if (otherGroups.length > 0) {
            console.log(`\nGroup ${sinkGroup.groupingId} (${sinkGroup.primaryName}) absorbing ${otherGroups.length} groups...`);
            
            let newProducts = [...(sinkGroup.products || [])];
            for (const source of otherGroups) {
                if (processedGroups.has(source.groupingId)) continue;
                
                console.log(`  -> Merging ${source.groupingId} (${source.primaryName})`);
                
                source.products.forEach(p => {
                    const exists = newProducts.find(np => np.platform === p.platform && np.productId === p.productId);
                    if (!exists) newProducts.push(p);
                });

                processedGroups.add(source.groupingId);
                await ProductGrouping.deleteOne({ _id: source._id });
                deletedCount++;
            }

            await ProductGrouping.updateOne(
                { _id: sinkGroup._id },
                { $set: { products: newProducts, totalProducts: newProducts.length } }
            );
            mergedCount++;
        }
        processedGroups.add(sinkGroup.groupingId);
    }

    console.log(`\n========================================`);
    console.log(`Final Result:`);
    console.log(`Groups that absorbed others: ${mergedCount}`);
    console.log(`Groups deleted: ${deletedCount}`);
    
    // Final check for duplicates
    const finalGroups = await ProductGrouping.find({ category }).lean();
    const bidToGroups = {};
    finalGroups.forEach(g => {
        (g.products || []).forEach(p => {
            const bid = p.productId.split('__')[0];
            if (!bidToGroups[bid]) bidToGroups[bid] = new Set();
            bidToGroups[bid].add(g.groupingId);
        });
    });
    const duplicates = Object.keys(bidToGroups).filter(bid => bidToGroups[bid].size > 1);
    console.log(`Remaining duplicate baseIds: ${duplicates.length}`);
    if (duplicates.length > 0) console.log('Duplicates:', duplicates);

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
