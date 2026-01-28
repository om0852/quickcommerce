
import ProductGrouping from '../models/ProductGrouping.js';

export class GroupingCache {
    constructor() {
        this.groups = new Map(); // groupingId -> Group Object
        this.productIndex = new Map(); // "platform:productId" -> groupingId
        this.searchIndex = new Map(); // term -> Set<groupingId>
        this.dirtyGroupIds = new Set(); // IDs of groups that need saving
        this.isLoaded = false;
    }

    async load() {
        if (this.isLoaded) return;
        console.log('Loading ProductGrouping data into memory (Streamed)...');
        const start = Date.now();

        // Use cursor for memory efficiency
        const cursor = ProductGrouping.find({})
            .select('groupingId products primaryName primaryWeight category totalProducts')
            .lean()
            .cursor();

        let count = 0;
        for (let g = await cursor.next(); g != null; g = await cursor.next()) {
            this.groups.set(g.groupingId, { ...g, products: g.products || [] });

            // Build Product Index
            if (g.products) {
                for (const p of g.products) {
                    this.productIndex.set(`${p.platform}:${p.productId}`, g.groupingId);
                }
            }

            // Build Search Index
            if (g.primaryName) {
                const terms = g.primaryName.toLowerCase().split(' ').filter(t => t.length > 2);
                for (const term of terms) {
                    if (!this.searchIndex.has(term)) {
                        this.searchIndex.set(term, new Set());
                    }
                    this.searchIndex.get(term).add(g.groupingId);
                }
            }

            count++;
            if (count % 10000 === 0) {
                process.stdout.write(`\r   Loaded ${count} groups...`);
            }
        }

        this.isLoaded = true;
        console.log(`\nLoaded ${count} groups in ${(Date.now() - start) / 1000}s`);
    }

    /**
     * Get the simplified memory store object expected by productGrouper.js
     * It mimics the Map interface but proxies to our internal structure + tracking
     */
    getStore() {
        return {
            get: (id) => this.groups.get(id),
            set: (id, group) => {
                this.groups.set(id, group);
                this.dirtyGroupIds.add(id);

                // Update indexes for new/modified group
                this._reindexGroup(group);
            },
            values: () => this.groups.values(),
            productIndex: this.productIndex
        };
    }

    getSearchIndex() {
        return this.searchIndex;
    }

    _reindexGroup(group) {
        if (!group) return;

        // Update Product Index
        if (group.products) {
            for (const p of group.products) {
                this.productIndex.set(`${p.platform}:${p.productId}`, group.groupingId);
            }
        }

        // Update Search Index
        if (group.primaryName) {
            const terms = group.primaryName.toLowerCase().split(' ').filter(t => t.length > 2);
            for (const term of terms) {
                if (!this.searchIndex.has(term)) {
                    this.searchIndex.set(term, new Set());
                }
                this.searchIndex.get(term).add(group.groupingId);
            }
        }
    }

    async saveDirtyGroups() {
        if (this.dirtyGroupIds.size === 0) {
            console.log('No grouping changes to save.');
            return;
        }
        console.log(`Saving ${this.dirtyGroupIds.size} modified/new groups...`);

        const bulkOps = [];
        for (const id of this.dirtyGroupIds) {
            const group = this.groups.get(id);
            if (!group) continue;

            // Prepare update/upsert
            bulkOps.push({
                updateOne: {
                    filter: { groupingId: id },
                    update: {
                        $set: {
                            products: group.products,
                            totalProducts: group.products.length,
                            primaryName: group.primaryName,
                            primaryImage: group.primaryImage,
                            primaryWeight: group.primaryWeight,
                            category: group.category
                        }
                    },
                    upsert: true
                }
            });

            if (bulkOps.length >= 500) {
                await ProductGrouping.bulkWrite(bulkOps);
                bulkOps.length = 0;
            }
        }

        if (bulkOps.length > 0) {
            await ProductGrouping.bulkWrite(bulkOps);
        }

        console.log('Save complete.');
        this.dirtyGroupIds.clear();
    }
}
